import { IsNull, type EntityManager } from 'typeorm';

import { dataSource } from '../../config/database';

import type {
  AccountKind,
  ExecutiveStatus,
  PlatformAdminStatus,
  SessionRevokeReason,
} from './auth_types';
import { OrganisationExecutive } from './entities/organisation_executive_entity';
import { OtpChallenge } from './entities/otp_challenge_entity';
import { OtpCode } from './entities/otp_code_entity';
import { PlatformAdmin } from './entities/platform_admin_entity';
import { Session } from './entities/session_entity';

export interface SignInAccount {
  id: string;
  phone: string | null;
  status: ExecutiveStatus | PlatformAdminStatus;
  lockedUntil: Date | null;
}

interface SessionAccessRow {
  executiveId: string | null;
  platformAdminId: string | null;
  memberId: string | null;
  organisationId: string | null;
  status: string;
}

// Code constants only, so interpolating them into SQL is safe (AGENTS.md §8).
const ACCOUNT_TABLE = {
  executive: 'organisation_executives',
  platform_admin: 'platform_admins',
} as const;
const OWNER_COLUMN = { executive: 'executive_id', platform_admin: 'platform_admin_id' } as const;
const OWNER_FIELD = { executive: 'executiveId', platform_admin: 'platformAdminId' } as const;

const SIGN_IN_ACCOUNT_SQL = {
  executive: `SELECT e.id, m.phone, e.status, e.locked_until AS "lockedUntil"
                FROM organisation_executives e JOIN members m ON m.id = e.member_id`,
  platform_admin: `SELECT a.id, a.phone, a.status, a.locked_until AS "lockedUntil"
                     FROM platform_admins a`,
} as const;
const ALIAS = { executive: 'e', platform_admin: 'a' } as const;

export const ownerOf = (row: { executiveId: string | null; platformAdminId: string | null }) =>
  row.executiveId
    ? { kind: 'executive' as const, id: row.executiveId }
    : { kind: 'platform_admin' as const, id: row.platformAdminId! };

export const ownerFields = (kind: AccountKind, id: string) => ({
  executiveId: kind === 'executive' ? id : null,
  platformAdminId: kind === 'platform_admin' ? id : null,
});

export const authRepository = {
  // One login for both kinds: an email belongs to at most one account (see lockEmail).
  async findAccountByEmail(email: string) {
    const [row] = (await dataSource.query(`${SIGN_IN_ACCOUNT_SQL.executive} WHERE e.email = $1`, [
      email,
    ])) as SignInAccount[];
    if (row) return { kind: 'executive' as const, account: row };

    const [admin] = (await dataSource.query(
      `${SIGN_IN_ACCOUNT_SQL.platform_admin} WHERE a.email = $1`,
      [email],
    )) as SignInAccount[];
    return admin ? { kind: 'platform_admin' as const, account: admin } : null;
  },

  // Serialises account creation per email, so the cross-table check below cannot race.
  async lockEmail(email: string, manager: EntityManager) {
    await manager.query(`SELECT pg_advisory_xact_lock(hashtext('account_email:' || $1))`, [email]);
    const rows = (await manager.query(
      `SELECT 1 FROM organisation_executives WHERE email = $1 UNION ALL SELECT 1 FROM platform_admins WHERE email = $1`,
      [email],
    )) as unknown[];
    return rows.length > 0;
  },

  async findSignInAccount(
    kind: AccountKind,
    by: { email: string } | { id: string },
    manager: EntityManager = dataSource.manager,
  ): Promise<SignInAccount | null> {
    const [field, value] = 'email' in by ? ['email', by.email] : ['id', by.id];
    const [row] = (await manager.query(
      `${SIGN_IN_ACCOUNT_SQL[kind]} WHERE ${ALIAS[kind]}.${field} = $1`,
      [value],
    )) as SignInAccount[];
    return row ?? null;
  },

  findExecutiveById(executiveId: string, manager: EntityManager = dataSource.manager) {
    return manager.getRepository(OrganisationExecutive).findOne({
      where: { id: executiveId },
      relations: { member: { organisation: true } },
    });
  },

  findPlatformAdminById(id: string, manager: EntityManager = dataSource.manager) {
    return manager.getRepository(PlatformAdmin).findOneBy({ id });
  },

  // Single atomic UPDATE, so parallel wrong guesses cannot race past the lockout threshold.
  async recordFailedSignIn(
    kind: AccountKind,
    id: string,
    maxAttempts: number,
    lockMinutes: number,
  ): Promise<Date | null> {
    const [rows] = (await dataSource.query(
      `UPDATE ${ACCOUNT_TABLE[kind]} SET
         failed_sign_in_attempts = CASE WHEN failed_sign_in_attempts + 1 >= $2 THEN 0
                                        ELSE failed_sign_in_attempts + 1 END,
         locked_until = CASE WHEN failed_sign_in_attempts + 1 >= $2
                             THEN now() + make_interval(mins => $3) ELSE locked_until END
       WHERE id = $1
       RETURNING locked_until AS "lockedUntil"`,
      [id, maxAttempts, lockMinutes],
    )) as [Array<{ lockedUntil: Date | null }>, number];

    return rows[0]?.lockedUntil ?? null;
  },

  recordSuccessfulSignIn(kind: AccountKind, id: string, manager: EntityManager) {
    return manager.query(
      `UPDATE ${ACCOUNT_TABLE[kind]}
          SET failed_sign_in_attempts = 0, locked_until = NULL, last_sign_in_at = now()
        WHERE id = $1`,
      [id],
    );
  },

  async findAccountStatus(kind: AccountKind, id: string, manager: EntityManager) {
    const [row] = (await manager.query(`SELECT status FROM ${ACCOUNT_TABLE[kind]} WHERE id = $1`, [
      id,
    ])) as Array<{ status: string }>;
    return row?.status ?? null;
  },

  insertSession(session: Partial<Session>, manager: EntityManager) {
    return manager.getRepository(Session).insert(session);
  },

  // Hot path (every request): only the columns access needs, and only a live session.
  async findSessionForAccess(sessionId: string): Promise<SessionAccessRow | null> {
    const [row] = (await dataSource.query(
      `SELECT s.executive_id AS "executiveId", s.platform_admin_id AS "platformAdminId",
              e.member_id AS "memberId", e.organisation_id AS "organisationId",
              COALESCE(e.status::text, a.status::text) AS status
         FROM sessions s
         LEFT JOIN organisation_executives e ON e.id = s.executive_id
         LEFT JOIN members m ON m.id = e.member_id
         LEFT JOIN platform_admins a ON a.id = s.platform_admin_id
        WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
      [sessionId],
    )) as SessionAccessRow[];

    return row ?? null;
  },

  lockExecutive(executiveId: string, manager: EntityManager) {
    return manager.getRepository(OrganisationExecutive).findOne({
      select: { id: true, status: true },
      where: { id: executiveId },
      lock: { mode: 'pessimistic_write' },
    });
  },

  lockPlatformAdmin(id: string, manager: EntityManager) {
    return manager.getRepository(PlatformAdmin).findOne({
      select: { id: true, status: true },
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  },

  lockSession(sessionId: string, manager: EntityManager) {
    return manager
      .getRepository(Session)
      .createQueryBuilder('session')
      .addSelect('session.refreshTokenHash')
      .where('session.id = :sessionId', { sessionId })
      .setLock('pessimistic_write')
      .getOne();
  },

  rotateSessionToken(sessionId: string, refreshTokenHash: string, manager: EntityManager) {
    return manager
      .getRepository(Session)
      .update({ id: sessionId }, { refreshTokenHash, lastUsedAt: new Date() });
  },

  revokeSession(sessionId: string, reason: SessionRevokeReason, manager: EntityManager) {
    return manager
      .getRepository(Session)
      .update(
        { id: sessionId, revokedAt: IsNull() },
        { revokedAt: new Date(), revokedReason: reason },
      );
  },

  revokeAccountSessions(
    kind: AccountKind,
    id: string,
    reason: SessionRevokeReason,
    manager: EntityManager,
  ) {
    return manager
      .getRepository(Session)
      .update(
        { [OWNER_FIELD[kind]]: id, revokedAt: IsNull() },
        { revokedAt: new Date(), revokedReason: reason },
      );
  },

  insertChallenge(challenge: Partial<OtpChallenge>, manager: EntityManager) {
    return manager.getRepository(OtpChallenge).insert(challenge);
  },

  lockChallenge(challengeId: string, manager: EntityManager) {
    return manager
      .getRepository(OtpChallenge)
      .createQueryBuilder('challenge')
      .where('challenge.id = :challengeId', { challengeId })
      .setLock('pessimistic_write')
      .getOne();
  },

  consumeChallenge(challengeId: string, manager: EntityManager) {
    return manager
      .getRepository(OtpChallenge)
      .update({ id: challengeId }, { consumedAt: new Date() });
  },

  insertCode(code: Partial<OtpCode>, manager: EntityManager) {
    return manager.getRepository(OtpCode).insert(code);
  },

  findLatestCode(challengeId: string, manager: EntityManager) {
    return manager
      .getRepository(OtpCode)
      .createQueryBuilder('code')
      .addSelect('code.codeHash')
      .where('code.challengeId = :challengeId', { challengeId })
      .orderBy('code.createdAt', 'DESC')
      .limit(1)
      .getOne();
  },

  updateCode(codeId: string, changes: Partial<OtpCode>, manager: EntityManager) {
    return manager.getRepository(OtpCode).update({ id: codeId }, changes);
  },

  supersedeCodes(challengeId: string, manager: EntityManager) {
    return manager
      .getRepository(OtpCode)
      .update(
        { challengeId, consumedAt: IsNull(), supersededAt: IsNull() },
        { supersededAt: new Date() },
      );
  },

  async countRecentCodes(
    kind: AccountKind,
    id: string,
    windowMinutes: number,
    manager: EntityManager,
  ) {
    const [row] = (await manager.query(
      `SELECT count(*)::int AS "sent" FROM otp_codes c
       JOIN otp_challenges ch ON ch.id = c.challenge_id
       WHERE ch.${OWNER_COLUMN[kind]} = $1 AND c.created_at > now() - make_interval(mins => $2)`,
      [id, windowMinutes],
    )) as Array<{ sent: number }>;

    return row?.sent ?? 0;
  },
};
