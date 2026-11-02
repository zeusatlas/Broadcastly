import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';

// One record per party member. Executives (logins), appointments and memberships all point here,
// so appointing a member never duplicates them (FR-ORG-05, BR-04).
@Entity({ name: 'members' })
export class Member extends BaseEntity {
  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'middle_name', nullable: true })
  middleName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  // Party membership number, where the party issues one. The key to look a member up by.
  @Column({ type: 'varchar', length: 50, name: 'party_id', nullable: true, unique: true })
  partyId: string | null;

  // E.164, e.g. +233241234567 (FR-MEM-05).
  @Column({ type: 'varchar', length: 16, nullable: true })
  phone: string | null;

  // Calendar date only ('YYYY-MM-DD'), so no timezone can shift it a day.
  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: string | null;
}
