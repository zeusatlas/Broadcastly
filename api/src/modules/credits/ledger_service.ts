import type { EntityManager } from 'typeorm';

import { ConflictError } from '../../common/errors/app_error';

import type { LedgerEntryInput } from './credits_types';
import { CreditReservation } from './entities/credit_reservation_entity';
import { CreditTransaction } from './entities/credit_transaction_entity';
import { Wallet } from './entities/wallet_entity';

export interface WalletOwner {
  organisationId: string;
  // Omit for the organisation's own wallet.
  executiveId?: string | null;
}

const NOT_ENOUGH = 'There are not enough credits for this.';

// The only code that moves credits (AGENTS.md rule 5, BR-11). Every method runs in the caller's
// transaction and locks the wallet row, so concurrent movements on one wallet queue up.
export const ledgerService = {
  // Finds or creates the wallet; the partial unique indexes make the create race-free.
  async walletFor(owner: WalletOwner, manager: EntityManager): Promise<Wallet> {
    const isExecutive = Boolean(owner.executiveId);
    await manager.query(
      isExecutive
        ? `INSERT INTO wallets (owner_type, organisation_id, executive_id) VALUES ('executive', $1, $2)
             ON CONFLICT (executive_id) WHERE executive_id IS NOT NULL DO NOTHING`
        : `INSERT INTO wallets (owner_type, organisation_id) VALUES ('organisation', $1)
             ON CONFLICT (organisation_id) WHERE owner_type = 'organisation' DO NOTHING`,
      isExecutive ? [owner.organisationId, owner.executiveId] : [owner.organisationId],
    );

    return manager.getRepository(Wallet).findOneOrFail({
      where: isExecutive
        ? { executiveId: owner.executiveId! }
        : { organisationId: owner.organisationId, ownerType: 'organisation' },
      lock: { mode: 'pessimistic_write' },
    });
  },

  // A repeated idempotency key returns the first entry and changes nothing (NFR-REL-03).
  async post(entry: LedgerEntryInput, manager: EntityManager): Promise<CreditTransaction> {
    const transactions = manager.getRepository(CreditTransaction);
    const wallet = await manager.getRepository(Wallet).findOneOrFail({
      where: { id: entry.walletId },
      lock: { mode: 'pessimistic_write' },
    });

    const existing = await transactions.findOneBy({ idempotencyKey: entry.idempotencyKey });
    if (existing) return existing;

    const balanceAfter = wallet.balance + entry.amount;
    if (balanceAfter < wallet.reserved) throw new ConflictError(NOT_ENOUGH);

    const transaction = await transactions.save(
      transactions.create({
        walletId: wallet.id,
        type: entry.type,
        amount: entry.amount,
        balanceAfter,
        reason: entry.reason ?? null,
        idempotencyKey: entry.idempotencyKey,
        initiatedByExecutiveId: entry.initiatedByExecutiveId ?? null,
        initiatedByPlatformAdminId: entry.initiatedByPlatformAdminId ?? null,
        purchaseId: entry.purchaseId ?? null,
        broadcastId: entry.broadcastId ?? null,
      }),
    );
    await manager.getRepository(Wallet).update({ id: wallet.id }, { balance: balanceAfter });
    return transaction;
  },

  async reserve(
    walletId: string,
    broadcastId: string,
    amount: number,
    manager: EntityManager,
  ): Promise<CreditReservation> {
    const wallets = manager.getRepository(Wallet);
    const reservations = manager.getRepository(CreditReservation);
    const wallet = await wallets.findOneOrFail({
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });

    const existing = await reservations.findOneBy({ broadcastId });
    if (existing) return existing;
    if (wallet.balance - wallet.reserved < amount) throw new ConflictError(NOT_ENOUGH);

    await wallets.update({ id: wallet.id }, { reserved: wallet.reserved + amount });
    return reservations.save(reservations.create({ walletId, broadcastId, amount }));
  },

  // Charges what dispatch actually used and frees the rest of the hold (FR-CR-08, FR-CR-09).
  // consumed 0 releases the whole hold, e.g. when a scheduled broadcast is cancelled.
  async settle(
    broadcastId: string,
    consumed: number,
    initiatedByExecutiveId: string | null,
    manager: EntityManager,
  ): Promise<CreditReservation | null> {
    const reservations = manager.getRepository(CreditReservation);
    const reservation = await reservations.findOne({
      where: { broadcastId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!reservation || reservation.status !== 'held') return reservation;

    const wallets = manager.getRepository(Wallet);
    const wallet = await wallets.findOneOrFail({
      where: { id: reservation.walletId },
      lock: { mode: 'pessimistic_write' },
    });
    const used = Math.min(Math.max(consumed, 0), reservation.amount);
    await wallets.update({ id: wallet.id }, { reserved: wallet.reserved - reservation.amount });
    if (used > 0) {
      await ledgerService.post(
        {
          walletId: wallet.id,
          type: 'consumption',
          amount: -used,
          idempotencyKey: `broadcast:${broadcastId}:consumption`,
          reason: 'Broadcast dispatch',
          initiatedByExecutiveId,
          broadcastId,
        },
        manager,
      );
    }
    reservation.consumed = used;
    reservation.status = used > 0 ? 'settled' : 'released';
    reservation.settledAt = new Date();
    return reservations.save(reservation);
  },
};
