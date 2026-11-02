import { IsNull, type EntityManager } from 'typeorm';

import { dataSource } from '../../config/database';

import type { ExecutiveStatus, SessionRevokeReason, UserRole } from './auth_types';
import { Executive } from './entities/executive_entity';
import { OtpChallenge } from './entities/otp_challenge_entity';
import { OtpCode } from './entities/otp_code_entity';
import { Session } from './entities/session_entity';

interface SessionAccessRow {
  executiveId: string;
  memberId: string;
  role: UserRole;
  status: ExecutiveStatus;
}

// Every function takes an optional EntityManager so services can compose them in one transaction.
export const authRepository = {
  findExecutiveByEmail(email: string, manager: EntityManager = dataSource.manager) {
    return manager
      .getRepository(Executive)
      .createQueryBuilder('executive')
      .innerJoinAndSelect('executive.member', 'member')
      .where('executive.email = :email', { email })
      .getOne();
  },

  findExecutiveById(executiveId: string, manager: EntityManager = dataSource.manager) {
    return manager.getRepository(Executive).findOne({
      where: { id: executiveId },
      relations: { member: true },
    });
  },

  // Single atomic UPDATE, so parallel wrong guesses cannot race past the lockout threshold.
  async recordFailedSignIn(
    executiveId: string,
    maxAttempts: number,
    lockMinutes: number,
  ): Promise<Date | null> {
    const [rows] = (await dataSource.query(
      `UPDATE executives SET
         failed_sign_in_attempts = CASE WHEN failed_sign_in_attempts + 1 >= $2 THEN 0
                                        ELSE failed_sign_in_attempts + 1 END,
         locked_until = CASE WHEN failed_sign_in_attempts + 1 >= $2
                             THEN now() + make_interval(mins => $3) ELSE locked_until END
       WHERE id = $1
       RETURNING locked_until AS "lockedUntil"`,
      [executiveId, maxAttempts, lockMinutes],
    )) as [Array<{ lockedUntil: Date | null }>, number];

    return rows[0]?.lockedUntil ?? null;
  },

  recordSuccessfulSignIn(executiveId: string, manager: EntityManager) {
    return manager
      .getRepository(Executive)
      .update(
        { id: executiveId },
        { failedSignInAttempts: 0, lockedUntil: null, lastSignInAt: new Date() },
      );
  },

  insertSession(session: Partial<Session>, manager: EntityManager) {
    return manager.getRepository(Session).insert(session);
  },

  // Hot path (every request): only the columns access needs, and only a live session.
  async findSessionForAccess(sessionId: string): Promise<SessionAccessRow | null> {
    const [row] = (await dataSource.query(
      `SELECT s.executive_id AS "executiveId", e.member_id AS "memberId", e.role, e.status
         FROM sessions s JOIN executives e ON e.id = s.executive_id
        WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
      [sessionId],
    )) as SessionAccessRow[];

    return row ?? null;
  },

  // Status only, for checks that never return the executive (e.g. refresh).
  findExecutiveStatus(executiveId: string, manager: EntityManager) {
    return manager
      .getRepository(Executive)
      .findOne({ select: { id: true, status: true }, where: { id: executiveId } })
      .then((executive) => executive?.status ?? null);
  },

  // Row lock: two refreshes with the same token cannot both rotate it.
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

  // Optionally keeps one session alive, e.g. the device making the request.
  revokeExecutiveSessions(
    executiveId: string,
    reason: SessionRevokeReason,
    manager: EntityManager,
    exceptSessionId?: string,
  ) {
    const query = manager
      .getRepository(Session)
      .createQueryBuilder()
      .update()
      .set({ revokedAt: () => 'now()', revokedReason: reason })
      .where('executive_id = :executiveId AND revoked_at IS NULL', { executiveId });

    if (exceptSessionId) query.andWhere('id <> :exceptSessionId', { exceptSessionId });

    return query.execute();
  },

  insertChallenge(challenge: Partial<OtpChallenge>, manager: EntityManager) {
    return manager.getRepository(OtpChallenge).insert(challenge);
  },

  // Row lock: concurrent verify/resend calls on one challenge run one at a time.
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

  // The newest code is the only one that can still be used; older ones are superseded on resend.
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

  // Codes sent to an executive recently, across all its challenges (SMS cost and abuse cap).
  async countRecentCodes(executiveId: string, windowMinutes: number, manager: EntityManager) {
    const [row] = (await manager.query(
      `SELECT count(*)::int AS "sent" FROM otp_codes c
       JOIN otp_challenges ch ON ch.id = c.challenge_id
       WHERE ch.executive_id = $1 AND c.created_at > now() - make_interval(mins => $2)`,
      [executiveId, windowMinutes],
    )) as Array<{ sent: number }>;

    return row?.sent ?? 0;
  },
};
