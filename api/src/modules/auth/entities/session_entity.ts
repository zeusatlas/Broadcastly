import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../database/base_entity';
import { SESSION_REVOKE_REASONS, type SessionRevokeReason } from '../auth_types';

import { OrganisationExecutive } from './organisation_executive_entity';
import { PlatformAdmin } from './platform_admin_entity';

// One signed-in device. Holds the hash of the current refresh token only; each refresh rotates it,
// and presenting an older token revokes the whole session (token theft detection).
@Entity({ name: 'sessions' })
// Belongs to exactly one account: an executive (mobile) or a platform admin (web).
@Check('chk_sessions_one_account', 'num_nonnulls("executive_id", "platform_admin_id") = 1')
export class Session extends BaseEntity {
  @Index('idx_sessions_executive_id')
  @Column({ type: 'uuid', name: 'executive_id', nullable: true })
  executiveId: string | null;

  @ManyToOne(() => OrganisationExecutive, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'executive_id' })
  executive?: OrganisationExecutive;

  @Index('idx_sessions_platform_admin_id')
  @Column({ type: 'uuid', name: 'platform_admin_id', nullable: true })
  platformAdminId: string | null;

  @ManyToOne(() => PlatformAdmin, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'platform_admin_id' })
  platformAdmin?: PlatformAdmin;

  @Column({ type: 'char', length: 64, name: 'refresh_token_hash', select: false })
  refreshTokenHash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'last_used_at', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt: Date | null;

  @Column({
    type: 'enum',
    enum: SESSION_REVOKE_REASONS,
    enumName: 'session_revoke_reason',
    name: 'revoked_reason',
    nullable: true,
  })
  revokedReason: SessionRevokeReason | null;

  @Column({ type: 'varchar', length: 255, name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress: string | null;
}
