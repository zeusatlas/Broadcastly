import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { RESERVATION_STATUSES, type ReservationStatus } from '../credits_types';

// Credits held on a wallet for one broadcast until dispatch settles them (FR-CR-08, FR-CR-09, BR-10).
// Only ledger_service writes it, together with wallets.reserved.
@Entity({ name: 'credit_reservations' })
export class CreditReservation extends BaseEntity {
  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId: string;

  @Column({ type: 'uuid', name: 'broadcast_id', unique: true })
  broadcastId: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'integer', default: 0 })
  consumed: number;

  @Column({
    type: 'enum',
    enum: RESERVATION_STATUSES,
    enumName: 'credit_reservation_status',
    default: 'held',
  })
  status: ReservationStatus;

  @Column({ type: 'timestamptz', name: 'settled_at', nullable: true })
  settledAt: Date | null;
}
