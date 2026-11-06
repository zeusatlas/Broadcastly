import type { MigrationInterface, QueryRunner } from 'typeorm';

const HEAD_POSITION_ID = '5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21';

// Owner's decision, 2026-11-06: there is no organisation pool. Purchases go to the buyer and allocations
// come from the giver, so each pool's free balance moves to its head's wallet as two ledger rows (the
// ledger stays complete and append-only). Credits still held for scheduled broadcasts stay until settled.
export class RemoveOrganisationPool1793870000000 implements MigrationInterface {
  name = 'RemoveOrganisationPool1793870000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO wallets (owner_type, organisation_id, executive_id)
       SELECT 'executive', e.organisation_id, e.id
         FROM organisation_executives e
         JOIN appointments a ON a.member_id = e.member_id AND a.status = 'active' AND a.position_id = $1
        WHERE EXISTS (SELECT 1 FROM wallets p WHERE p.organisation_id = e.organisation_id
                        AND p.owner_type = 'organisation' AND p.balance - p.reserved > 0)
       ON CONFLICT (executive_id) WHERE executive_id IS NOT NULL DO NOTHING`,
      [HEAD_POSITION_ID],
    );

    const moves = (await queryRunner.query(
      `SELECT p.id AS "poolId", p.organisation_id AS "organisationId", p.balance - p.reserved AS amount,
              hw.id AS "headWalletId"
         FROM wallets p
         JOIN organisation_executives e ON e.organisation_id = p.organisation_id
         JOIN appointments a ON a.member_id = e.member_id AND a.status = 'active' AND a.position_id = $1
         JOIN wallets hw ON hw.executive_id = e.id
        WHERE p.owner_type = 'organisation' AND p.balance - p.reserved > 0
        FOR UPDATE OF p, hw`,
      [HEAD_POSITION_ID],
    )) as { poolId: string; organisationId: string; amount: number; headWalletId: string }[];

    for (const move of moves) {
      const reason = 'Moved from the organisation account to the head’s credits';
      await queryRunner.query(
        `WITH pool AS (UPDATE wallets SET balance = balance - $2 WHERE id = $1 RETURNING balance)
         INSERT INTO credit_transactions (wallet_id, type, amount, balance_after, reason, idempotency_key)
         SELECT $1, 'adjustment', -$2, pool.balance, $3, $4 FROM pool`,
        [move.poolId, move.amount, reason, `migration:pool:${move.organisationId}:from`],
      );
      await queryRunner.query(
        `WITH head AS (UPDATE wallets SET balance = balance + $2 WHERE id = $1 RETURNING balance)
         INSERT INTO credit_transactions (wallet_id, type, amount, balance_after, reason, idempotency_key)
         SELECT $1, 'adjustment', $2, head.balance, $3, $4 FROM head`,
        [move.headWalletId, move.amount, reason, `migration:pool:${move.organisationId}:to`],
      );
    }
  }

  // The ledger is append-only, so this move is not reversed: a later correction is a new adjustment.
  async down(): Promise<void> {}
}
