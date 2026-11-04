import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { OrganisationExecutive } from '../../auth';
import { Organisation } from '../../organisation';
import { CREDIT_PURCHASE_STATUSES, type CreditPurchaseStatus } from '../credits_types';

import { Wallet } from './wallet_entity';

// A purchase through the payment provider (FR-CR-02). Credits reach the wallet only after the
// provider confirms it server-side; the ledger row then points back here.
@Entity({ name: 'credit_purchases' })
@Check('chk_credit_purchases_positive', `"credits" > 0 AND "amount_pesewas" > 0`)
@Index('idx_credit_purchases_organisation_created', ['organisationId', 'createdAt'])
@Index('idx_credit_purchases_status_created', ['status', 'createdAt'])
// A repeated request with the same Idempotency-Key returns the first purchase, not a new one.
@Index('uq_credit_purchases_idempotency', ['organisationId', 'idempotencyKey'], {
  unique: true,
  where: `"idempotency_key" IS NOT NULL`,
})
export class CreditPurchase extends BaseEntity {
  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet;

  @Column({ type: 'integer' })
  credits: number;

  @Column({ type: 'integer', name: 'amount_pesewas' })
  amountPesewas: number;

  @Column({ type: 'varchar', length: 3, default: 'GHS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: CREDIT_PURCHASE_STATUSES,
    enumName: 'credit_purchase_status',
    default: 'pending',
  })
  status: CreditPurchaseStatus;

  @Column({ type: 'varchar', length: 30 })
  provider: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  reference: string;

  @Column({ type: 'varchar', length: 500, name: 'checkout_url', nullable: true })
  checkoutUrl: string | null;

  @Column({ type: 'varchar', length: 100, name: 'idempotency_key', nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 255, name: 'failure_reason', nullable: true })
  failureReason: string | null;

  @Column({ type: 'uuid', name: 'initiated_by_executive_id', nullable: true })
  initiatedByExecutiveId: string | null;

  @ManyToOne(() => OrganisationExecutive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'initiated_by_executive_id' })
  initiatedByExecutive?: OrganisationExecutive;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'failed_at', nullable: true })
  failedAt: Date | null;
}
