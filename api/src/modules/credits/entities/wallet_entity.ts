import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { OrganisationExecutive } from '../../auth';
import { Organisation } from '../../organisation';
import { WALLET_OWNER_TYPES, type WalletOwnerType } from '../credits_types';

// One per organisation and one per executive (FR-CR-01). `balance` caches the ledger and changes in
// the same transaction as each ledger row (BR-11); only ledger_service writes it.
@Entity({ name: 'wallets' })
@Check('chk_wallets_owner', `("owner_type" = 'executive') = ("executive_id" IS NOT NULL)`)
@Check('chk_wallets_not_negative', `"balance" >= 0 AND "reserved" >= 0 AND "reserved" <= "balance"`)
@Index('uq_wallets_organisation', ['organisationId'], {
  unique: true,
  where: `"owner_type" = 'organisation'`,
})
@Index('uq_wallets_executive', ['executiveId'], {
  unique: true,
  where: `"executive_id" IS NOT NULL`,
})
export class Wallet extends BaseEntity {
  @Column({
    type: 'enum',
    enum: WALLET_OWNER_TYPES,
    enumName: 'wallet_owner_type',
    name: 'owner_type',
  })
  ownerType: WalletOwnerType;

  @Column({ type: 'uuid', name: 'organisation_id' })
  organisationId: string;

  @ManyToOne(() => Organisation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organisation_id' })
  organisation?: Organisation;

  @Column({ type: 'uuid', name: 'executive_id', nullable: true })
  executiveId: string | null;

  @ManyToOne(() => OrganisationExecutive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'executive_id' })
  executive?: OrganisationExecutive;

  @Column({ type: 'integer', default: 0 })
  balance: number;

  // Held for scheduled or approved broadcasts until dispatch reconciles them (FR-CR-08).
  @Column({ type: 'integer', default: 0 })
  reserved: number;
}
