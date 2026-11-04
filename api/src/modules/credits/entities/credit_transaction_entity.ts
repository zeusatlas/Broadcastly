import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { OrganisationExecutive, PlatformAdmin } from '../../auth';
import { CREDIT_TRANSACTION_TYPES, type CreditTransactionType } from '../credits_types';

import { CreditPurchase } from './credit_purchase_entity';
import { Wallet } from './wallet_entity';

// Append-only ledger row (FR-CR-06, FR-CR-07, BR-11): a trigger rejects UPDATE and DELETE, so a
// correction is a new 'reversal' or 'adjustment' row. Written only by ledger_service.
@Entity({ name: 'credit_transactions' })
@Check('chk_credit_transactions_amount', `"amount" <> 0 AND "balance_after" >= 0`)
@Index('idx_credit_transactions_wallet_created', ['walletId', 'createdAt'])
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet;

  @Column({ type: 'enum', enum: CREDIT_TRANSACTION_TYPES, enumName: 'credit_transaction_type' })
  type: CreditTransactionType;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'integer', name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 120, name: 'idempotency_key', unique: true })
  idempotencyKey: string;

  @Column({ type: 'uuid', name: 'initiated_by_executive_id', nullable: true })
  initiatedByExecutiveId: string | null;

  @ManyToOne(() => OrganisationExecutive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'initiated_by_executive_id' })
  initiatedByExecutive?: OrganisationExecutive;

  @Column({ type: 'uuid', name: 'initiated_by_platform_admin_id', nullable: true })
  initiatedByPlatformAdminId: string | null;

  @ManyToOne(() => PlatformAdmin, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'initiated_by_platform_admin_id' })
  initiatedByPlatformAdmin?: PlatformAdmin;

  @Column({ type: 'uuid', name: 'purchase_id', nullable: true })
  purchaseId: string | null;

  @ManyToOne(() => CreditPurchase, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_id' })
  purchase?: CreditPurchase;

  // Set once broadcasts dispatch (reservation, consumption, release).
  @Column({ type: 'uuid', name: 'broadcast_id', nullable: true })
  broadcastId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
