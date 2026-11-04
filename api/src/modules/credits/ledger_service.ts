import type { EntityManager } from 'typeorm';

import { ConflictError } from '../../common/errors/app_error';

import type { LedgerEntryInput } from './credits_types';
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
};
