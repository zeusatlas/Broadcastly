import { randomUUID } from 'node:crypto';

import type { EntityManager } from 'typeorm';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from '../../common/errors/app_error';
import { toAuditContext, type RequestContext } from '../../common/http/request_context';
import { dataSource } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { smsSender } from '../../integrations/sms/transactional_sms';
import { AUDIT_ACTIONS, auditService } from '../audit';
import { maskPhone, Member } from '../members';

import { loadProfileAccess } from './access_resolver';
import { toUserResponse } from './auth_mapper';
import { authRepository } from './auth_repository';
import type {
  AccessContext,
  ActionActor,
  AuthTokensResponse,
  CreateExecutiveRequest,
  ManageableExecutiveStatus,
  OtpChallengeResponse,
  RefreshTokenRequest,
  ResendOtpRequest,
  SignInRequest,
  SignInResponse,
  SignOutRequest,
  UserResponse,
  UserRole,
  VerifyOtpRequest,
} from './auth_types';
import { Executive } from './entities/executive_entity';
import type { OtpChallenge } from './entities/otp_challenge_entity';
import {
  generateOtp,
  hashOtp,
  OTP_CHALLENGE_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_SEND_WINDOW_MINUTES,
  OTP_TTL_SECONDS,
  otpMatches,
  otpMessage,
} from './otp_service';
import {
  createRefreshToken,
  parseRefreshToken,
  refreshSecretMatches,
  signAccessToken,
} from './token_service';

const MAX_FAILED_SIGN_INS = 5;
const LOCK_MINUTES = 15;
const HOUR_MS = 60 * 60 * 1000;

const SESSION_ENDED = 'Your session has ended. Please sign in again.';
const INVALID_CREDENTIALS = 'Invalid email or phone number.';
const ACCOUNT_LOCKED = `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.`;
const ACCOUNT_INACTIVE = 'This account is not active. Contact your administrator.';
const SIGN_IN_EXPIRED = 'Your sign-in has expired. Please sign in again.';
const CODE_INCORRECT = 'Incorrect code.';
const CODE_EXPIRED = 'This code has expired. Request a new one.';
const CODE_ATTEMPTS_USED = 'Too many incorrect attempts. Request a new code.';
const EMAIL_TAKEN = 'An account with this email already exists.';
const TOO_MANY_CODES = `Too many codes requested. Try again in ${OTP_SEND_WINDOW_MINUTES} minutes.`;

function buildTokens(
  executiveId: string,
  sessionId: string,
  refreshToken: string,
  sessionExpiresAt: Date,
): AuthTokensResponse {
  const access = signAccessToken({ sub: executiveId, sid: sessionId });
  return {
    accessToken: access.token,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: access.expiresIn,
    sessionExpiresAt,
  };
}

async function openSession(
  executiveId: string,
  context: RequestContext,
  manager: EntityManager,
): Promise<AuthTokensResponse> {
  const sessionId = randomUUID();
  const refresh = createRefreshToken(sessionId);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * HOUR_MS);

  await authRepository.insertSession(
    {
      id: sessionId,
      executiveId,
      refreshTokenHash: refresh.hash,
      expiresAt,
      userAgent: context.userAgent ?? null,
      ipAddress: context.ipAddress ?? null,
    },
    manager,
  );

  return buildTokens(executiveId, sessionId, refresh.token, expiresAt);
}

const challengeResponse = (challengeId: string, maskedPhone: string): OtpChallengeResponse => ({
  challengeId,
  maskedPhone,
  expiresIn: OTP_TTL_SECONDS,
  resendIn: OTP_RESEND_COOLDOWN_SECONDS,
});

const isLocked = (executive: Executive) =>
  !!executive.lockedUntil && executive.lockedUntil > new Date();

// Checked only once email and phone both match, so status is never shown to someone guessing.
function assertCanSignIn(executive: Executive) {
  if (isLocked(executive)) throw new TooManyRequestsError(ACCOUNT_LOCKED);
  if (executive.status !== 'active') throw new ForbiddenError(ACCOUNT_INACTIVE);
}

const challengeExpired = (challenge: OtpChallenge) =>
  !!challenge.consumedAt ||
  Date.now() - challenge.createdAt.getTime() > OTP_CHALLENGE_TTL_MINUTES * 60_000;

async function issueCode(executive: Executive, challengeId: string, manager: EntityManager) {
  const sent = await authRepository.countRecentCodes(
    executive.id,
    OTP_SEND_WINDOW_MINUTES,
    manager,
  );
  if (sent >= OTP_MAX_SENDS_PER_WINDOW) throw new TooManyRequestsError(TOO_MANY_CODES);

  const codeId = randomUUID();
  const code = generateOtp();
  await authRepository.supersedeCodes(challengeId, manager);
  await authRepository.insertCode(
    {
      id: codeId,
      challengeId,
      codeHash: hashOtp(codeId, code),
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
    },
    manager,
  );

  return code;
}

// After the transaction commits, so the code is saved before it can arrive. Not awaited: a slow
// gateway never delays the response; a failed send is logged and the user can resend.
function deliverCode(phone: string, code: string) {
  smsSender.send(phone, otpMessage(code)).catch((error: unknown) => {
    logger.error({ err: error }, 'Sign-in code SMS failed');
  });
}

async function recordFailure(executiveId: string, reason: string, context: RequestContext) {
  const lockedUntil = await authRepository.recordFailedSignIn(
    executiveId,
    MAX_FAILED_SIGN_INS,
    LOCK_MINUTES,
  );
  const justLocked = lockedUntil !== null && lockedUntil > new Date();

  await auditService.record({
    action: justLocked ? AUDIT_ACTIONS.accountLocked : AUDIT_ACTIONS.signInFailed,
    outcome: 'failure',
    actorExecutiveId: executiveId,
    metadata: { reason },
    ...toAuditContext(context),
  });

  return justLocked;
}

export const authService = {
  // Step 1. Email and phone must match one executive; any mismatch gets the same message, so it never
  // says which part was wrong or whether the email has an executive.
  async signIn({ email, phone }: SignInRequest, context: RequestContext) {
    const executive = await authRepository.findExecutiveByEmail(email);

    if (!executive || executive.member?.phone !== phone) {
      if (executive) {
        if (await recordFailure(executive.id, 'phone_mismatch', context)) {
          throw new TooManyRequestsError(ACCOUNT_LOCKED);
        }
      } else {
        await auditService.record({
          action: AUDIT_ACTIONS.signInFailed,
          outcome: 'failure',
          metadata: { reason: 'unknown_email' },
          ...toAuditContext(context),
        });
      }
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    assertCanSignIn(executive);

    const challengeId = randomUUID();
    const maskedPhone = maskPhone(phone);

    const code = await dataSource.transaction(async (manager) => {
      await authRepository.insertChallenge(
        {
          id: challengeId,
          executiveId: executive.id,
          maskedPhone,
          userAgent: context.userAgent ?? null,
          ipAddress: context.ipAddress ?? null,
        },
        manager,
      );
      const issued = await issueCode(executive, challengeId, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.otpSent,
          actorExecutiveId: executive.id,
          targetType: 'otp_challenge',
          targetId: challengeId,
          ...toAuditContext(context),
        },
        manager,
      );
      return issued;
    });

    deliverCode(phone, code);
    return challengeResponse(challengeId, maskedPhone);
  },

  async resendCode({ challengeId }: ResendOtpRequest, context: RequestContext) {
    const result = await dataSource.transaction(async (manager) => {
      const challenge = await authRepository.lockChallenge(challengeId, manager);
      if (!challenge || challengeExpired(challenge)) throw new NotFoundError(SIGN_IN_EXPIRED);

      const executive = await authRepository.findExecutiveById(challenge.executiveId, manager);
      if (!executive?.member?.phone) throw new NotFoundError(SIGN_IN_EXPIRED);
      assertCanSignIn(executive);

      const latest = await authRepository.findLatestCode(challenge.id, manager);
      const waited = latest ? (Date.now() - latest.createdAt.getTime()) / 1000 : Infinity;
      if (waited < OTP_RESEND_COOLDOWN_SECONDS) {
        const seconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - waited);
        throw new TooManyRequestsError(
          `Please wait ${seconds} seconds before requesting a new code.`,
        );
      }

      const code = await issueCode(executive, challenge.id, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.otpSent,
          actorExecutiveId: executive.id,
          targetType: 'otp_challenge',
          targetId: challenge.id,
          metadata: { resend: true },
          ...toAuditContext(context),
        },
        manager,
      );

      return { phone: executive.member.phone, maskedPhone: challenge.maskedPhone, code };
    });

    deliverCode(result.phone, result.code);
    return challengeResponse(challengeId, result.maskedPhone);
  },

  async verifyCode(
    { challengeId, code }: VerifyOtpRequest,
    context: RequestContext,
  ): Promise<SignInResponse> {
    const outcome = await dataSource.transaction(async (manager) => {
      const challenge = await authRepository.lockChallenge(challengeId, manager);
      if (!challenge || challengeExpired(challenge)) {
        return { error: new NotFoundError(SIGN_IN_EXPIRED) };
      }

      const executive = await authRepository.findExecutiveById(challenge.executiveId, manager);
      if (!executive) return { error: new NotFoundError(SIGN_IN_EXPIRED) };
      if (isLocked(executive)) return { error: new TooManyRequestsError(ACCOUNT_LOCKED) };
      if (executive.status !== 'active') return { error: new ForbiddenError(ACCOUNT_INACTIVE) };

      const latest = await authRepository.findLatestCode(challenge.id, manager);
      if (!latest || latest.supersededAt || latest.expiresAt <= new Date()) {
        return { error: new UnauthorizedError(CODE_EXPIRED) };
      }
      if (latest.failedAttempts >= OTP_MAX_ATTEMPTS) {
        return { error: new UnauthorizedError(CODE_ATTEMPTS_USED) };
      }

      if (!otpMatches(latest.id, code, latest.codeHash)) {
        const failedAttempts = latest.failedAttempts + 1;
        await authRepository.updateCode(latest.id, { failedAttempts }, manager);
        return {
          error: new UnauthorizedError(
            failedAttempts >= OTP_MAX_ATTEMPTS ? CODE_ATTEMPTS_USED : CODE_INCORRECT,
          ),
          failedExecutiveId: executive.id,
        };
      }

      await authRepository.updateCode(latest.id, { consumedAt: new Date() }, manager);
      await authRepository.consumeChallenge(challenge.id, manager);
      await authRepository.recordSuccessfulSignIn(executive.id, manager);
      const tokens = await openSession(executive.id, context, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.signIn,
          actorExecutiveId: executive.id,
          ...toAuditContext(context),
        },
        manager,
      );

      executive.lastSignInAt = new Date();
      return { executive, tokens };
    });

    if ('error' in outcome) {
      // After the transaction commits the code's attempt count, so a failure is never rolled back.
      if (
        outcome.failedExecutiveId &&
        (await recordFailure(outcome.failedExecutiveId, 'wrong_code', context))
      ) {
        throw new TooManyRequestsError(ACCOUNT_LOCKED);
      }
      throw outcome.error;
    }

    const { executive, tokens } = outcome;
    const access = await loadProfileAccess(executive.memberId, executive.role);

    return { user: toUserResponse(executive, access), tokens };
  },
  // Rotates the refresh token. A token that was already rotated means it was copied:
  // the whole session is revoked and the legitimate device must sign in again.
  async refresh({ refreshToken }: RefreshTokenRequest, context: RequestContext) {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) throw new UnauthorizedError(SESSION_ENDED);

    const tokens = await dataSource.transaction(async (manager) => {
      const session = await authRepository.lockSession(parsed.sessionId, manager);
      if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;

      if (!refreshSecretMatches(parsed.secret, session.refreshTokenHash)) {
        await authRepository.revokeSession(session.id, 'refresh_token_reused', manager);
        await auditService.record(
          {
            action: AUDIT_ACTIONS.refreshTokenReused,
            outcome: 'failure',
            actorExecutiveId: session.executiveId,
            targetType: 'session',
            targetId: session.id,
            ...toAuditContext(context),
          },
          manager,
        );
        return null;
      }

      const status = await authRepository.findExecutiveStatus(session.executiveId, manager);
      if (status !== 'active') {
        await authRepository.revokeSession(session.id, 'account_inactive', manager);
        return null;
      }

      const next = createRefreshToken(session.id);
      await authRepository.rotateSessionToken(session.id, next.hash, manager);
      return buildTokens(session.executiveId, session.id, next.token, session.expiresAt);
    });

    if (!tokens) throw new UnauthorizedError(SESSION_ENDED);
    return tokens;
  },

  async signOut(
    auth: AccessContext,
    { allDevices = false }: SignOutRequest,
    context: RequestContext,
  ) {
    await dataSource.transaction(async (manager) => {
      if (allDevices) {
        await authRepository.revokeExecutiveSessions(auth.executiveId, 'sign_out_all', manager);
      } else {
        await authRepository.revokeSession(auth.sessionId, 'sign_out', manager);
      }
      await auditService.record(
        {
          action: allDevices ? AUDIT_ACTIONS.signOutAll : AUDIT_ACTIONS.signOut,
          actorExecutiveId: auth.executiveId,
          ...toAuditContext(context),
        },
        manager,
      );
    });
  },

  async getCurrentUser(auth: AccessContext): Promise<UserResponse> {
    const executive = await authRepository.findExecutiveById(auth.executiveId);
    if (!executive) throw new UnauthorizedError(SESSION_ENDED);

    return toUserResponse(executive, await loadProfileAccess(executive.memberId, executive.role));
  },

  async createExecutive(
    input: CreateExecutiveRequest,
    actor: ActionActor = { executiveId: null },
    manager?: EntityManager,
  ): Promise<{ executiveId: string; memberId: string }> {
    if (!manager) {
      return dataSource.transaction((m) => authService.createExecutive(input, actor, m));
    }

    if (await manager.getRepository(Executive).existsBy({ email: input.email })) {
      throw new ConflictError(EMAIL_TAKEN, { errors: { email: [EMAIL_TAKEN] } });
    }

    const members = manager.getRepository(Member);
    let member = input.partyId ? await members.findOneBy({ partyId: input.partyId }) : null;

    if (member && (await manager.getRepository(Executive).existsBy({ memberId: member.id }))) {
      throw new ConflictError('This member already has an account.');
    }

    if (member?.phone && member.phone !== input.phone) {
      throw new ValidationError({
        phone: ['This member is on file with a different phone number.'],
      });
    }

    if (member) {
      member = await members.save({
        ...member,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
      });
    } else {
      member = await members.save(
        members.create({
          firstName: input.firstName,
          middleName: input.middleName ?? null,
          lastName: input.lastName,
          partyId: input.partyId ?? null,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth,
        }),
      );
    }

    const executive = await manager.getRepository(Executive).save(
      manager.getRepository(Executive).create({
        memberId: member.id,
        email: input.email,
        role: input.role,
        status: 'active',
      }),
    );

    await auditService.record(
      {
        action: AUDIT_ACTIONS.executiveCreated,
        actorExecutiveId: actor.executiveId,
        targetType: 'executive',
        targetId: executive.id,
        metadata: { role: input.role },
        ...(actor.context && toAuditContext(actor.context)),
      },
      manager,
    );

    return { executiveId: executive.id, memberId: member.id };
  },

  async setExecutiveStatus(
    executiveId: string,
    status: ManageableExecutiveStatus,
    actor: ActionActor,
    manageableRoles: readonly UserRole[],
  ): Promise<void> {
    if (executiveId === actor.executiveId) {
      throw new ForbiddenError('You cannot change the status of your own account.');
    }

    await dataSource.transaction(async (manager) => {
      const executive = await authRepository.lockExecutive(executiveId, manager);
      if (!executive || !manageableRoles.includes(executive.role)) {
        throw new NotFoundError('Account not found.');
      }
      if (executive.status === status) return;
      if (executive.status === 'deactivated') {
        throw new ConflictError('This account has been deactivated and cannot be changed.');
      }

      await manager.getRepository(Executive).update({ id: executiveId }, { status });
      if (status === 'suspended') {
        await authRepository.revokeExecutiveSessions(executiveId, 'account_inactive', manager);
      }

      await auditService.record(
        {
          action:
            status === 'suspended'
              ? AUDIT_ACTIONS.executiveSuspended
              : AUDIT_ACTIONS.executiveReactivated,
          actorExecutiveId: actor.executiveId,
          targetType: 'executive',
          targetId: executiveId,
          metadata: { role: executive.role, previousStatus: executive.status },
          ...(actor.context && toAuditContext(actor.context)),
        },
        manager,
      );
    });
  },
};
