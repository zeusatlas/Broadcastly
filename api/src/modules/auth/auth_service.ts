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
import { toAdminUserResponse, toPlatformAdminResponse, toUserResponse } from './auth_mapper';
import { authRepository, ownerFields, ownerOf, type SignInAccount } from './auth_repository';
import type {
  AccessContext,
  AccountKind,
  ActionActor,
  AuthTokensResponse,
  CreateExecutiveRequest,
  CreatePlatformAdminRequest,
  ManageableStatus,
  OtpChallengeResponse,
  PlatformAdminResponse,
  RefreshTokenRequest,
  ResendOtpRequest,
  SignInRequest,
  SignInResponse,
  UserResponse,
  VerifyOtpRequest,
} from './auth_types';
import { OrganisationExecutive } from './entities/organisation_executive_entity';
import type { OtpChallenge } from './entities/otp_challenge_entity';
import { PlatformAdmin } from './entities/platform_admin_entity';
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
const WEB_ADMINS_ONLY =
  'The web app is for platform administrators. Use the Broadcastly mobile app.';
const SIGN_IN_EXPIRED = 'Your sign-in has expired. Please sign in again.';
const CODE_INCORRECT = 'Incorrect code.';
const CODE_EXPIRED = 'This code has expired. Request a new one.';
const CODE_ATTEMPTS_USED = 'Too many incorrect attempts. Request a new code.';
const EMAIL_TAKEN = 'An account with this email already exists.';
const NOT_FOUND = 'Account not found.';
const NOT_YOURSELF = 'You cannot change the status of your own account.';
const TOO_MANY_CODES = `Too many codes requested. Try again in ${OTP_SEND_WINDOW_MINUTES} minutes.`;

const asActor = (kind: AccountKind, id: string) =>
  kind === 'executive' ? { actorExecutiveId: id } : { actorPlatformAdminId: id };

export const auditActor = (actor: ActionActor) => ({
  actorExecutiveId: actor.executiveId ?? null,
  actorPlatformAdminId: actor.platformAdminId ?? null,
  ...(actor.context && toAuditContext(actor.context)),
});

export const actorFrom = (auth: AccessContext, context?: RequestContext): ActionActor => ({
  ...(auth.kind === 'executive'
    ? { executiveId: auth.accountId }
    : { platformAdminId: auth.accountId }),
  context,
});

function buildTokens(
  accountId: string,
  sessionId: string,
  refreshToken: string,
  sessionExpiresAt: Date,
): AuthTokensResponse {
  const access = signAccessToken({ sub: accountId, sid: sessionId });
  return {
    accessToken: access.token,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: access.expiresIn,
    sessionExpiresAt,
  };
}

async function openSession(
  kind: AccountKind,
  accountId: string,
  context: RequestContext,
  manager: EntityManager,
): Promise<AuthTokensResponse> {
  const sessionId = randomUUID();
  const refresh = createRefreshToken(sessionId);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * HOUR_MS);

  await authRepository.insertSession(
    {
      id: sessionId,
      ...ownerFields(kind, accountId),
      refreshTokenHash: refresh.hash,
      expiresAt,
      userAgent: context.userAgent ?? null,
      ipAddress: context.ipAddress ?? null,
    },
    manager,
  );

  return buildTokens(accountId, sessionId, refresh.token, expiresAt);
}

const challengeResponse = (challengeId: string, maskedPhone: string): OtpChallengeResponse => ({
  challengeId,
  maskedPhone,
  expiresIn: OTP_TTL_SECONDS,
  resendIn: OTP_RESEND_COOLDOWN_SECONDS,
});

const isLocked = (account: SignInAccount) =>
  !!account.lockedUntil && account.lockedUntil > new Date();

// Checked only once email and phone both match, so status is never shown to someone guessing.
function assertCanSignIn(account: SignInAccount) {
  if (isLocked(account)) throw new TooManyRequestsError(ACCOUNT_LOCKED);
  if (account.status !== 'active') throw new ForbiddenError(ACCOUNT_INACTIVE);
}

function openChallengeOwner(challenge: OtpChallenge | null) {
  if (!challenge || challenge.consumedAt) return null;
  const age = Date.now() - challenge.createdAt.getTime();
  return age > OTP_CHALLENGE_TTL_MINUTES * 60_000 ? null : ownerOf(challenge);
}

async function issueCode(
  kind: AccountKind,
  accountId: string,
  challengeId: string,
  manager: EntityManager,
) {
  const sent = await authRepository.countRecentCodes(
    kind,
    accountId,
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

async function recordFailure(
  kind: AccountKind,
  accountId: string,
  reason: string,
  context: RequestContext,
) {
  const lockedUntil = await authRepository.recordFailedSignIn(
    kind,
    accountId,
    MAX_FAILED_SIGN_INS,
    LOCK_MINUTES,
  );
  const justLocked = lockedUntil !== null && lockedUntil > new Date();

  await auditService.record({
    action: justLocked ? AUDIT_ACTIONS.accountLocked : AUDIT_ACTIONS.signInFailed,
    outcome: 'failure',
    ...asActor(kind, accountId),
    metadata: { reason },
    ...toAuditContext(context),
  });

  return justLocked;
}

export const authService = {
  // Step 1, for every kind of account. Any mismatch gets the same message, so it never says
  // which part was wrong or whether the email has an account.
  async signIn({ email, phone, client = 'mobile' }: SignInRequest, context: RequestContext) {
    const found = await authRepository.findAccountByEmail(email);

    if (!found || found.account.phone !== phone) {
      if (found) {
        if (await recordFailure(found.kind, found.account.id, 'phone_mismatch', context)) {
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

    const { kind, account } = found;
    assertCanSignIn(account);
    if (client === 'web' && kind !== 'platform_admin') {
      await auditService.record({
        action: AUDIT_ACTIONS.signInFailed,
        outcome: 'failure',
        ...asActor(kind, account.id),
        metadata: { reason: 'web_not_allowed' },
        ...toAuditContext(context),
      });
      throw new ForbiddenError(WEB_ADMINS_ONLY);
    }

    const challengeId = randomUUID();
    const maskedPhone = maskPhone(phone);

    const code = await dataSource.transaction(async (manager) => {
      await authRepository.insertChallenge(
        {
          id: challengeId,
          ...ownerFields(kind, account.id),
          maskedPhone,
          userAgent: context.userAgent ?? null,
          ipAddress: context.ipAddress ?? null,
        },
        manager,
      );
      const issued = await issueCode(kind, account.id, challengeId, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.otpSent,
          ...asActor(kind, account.id),
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
      const owner = openChallengeOwner(challenge);
      if (!challenge || !owner) throw new NotFoundError(SIGN_IN_EXPIRED);

      const account = await authRepository.findSignInAccount(owner.kind, { id: owner.id }, manager);
      if (!account?.phone) throw new NotFoundError(SIGN_IN_EXPIRED);
      assertCanSignIn(account);

      const latest = await authRepository.findLatestCode(challenge.id, manager);
      const waited = latest ? (Date.now() - latest.createdAt.getTime()) / 1000 : Infinity;
      if (waited < OTP_RESEND_COOLDOWN_SECONDS) {
        const seconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - waited);
        throw new TooManyRequestsError(
          `Please wait ${seconds} seconds before requesting a new code.`,
        );
      }

      const code = await issueCode(owner.kind, account.id, challenge.id, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.otpSent,
          ...asActor(owner.kind, account.id),
          targetType: 'otp_challenge',
          targetId: challenge.id,
          metadata: { resend: true },
          ...toAuditContext(context),
        },
        manager,
      );

      return { phone: account.phone, maskedPhone: challenge.maskedPhone, code };
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
      const owner = openChallengeOwner(challenge);
      if (!challenge || !owner) return { error: new NotFoundError(SIGN_IN_EXPIRED) };

      const account = await authRepository.findSignInAccount(owner.kind, { id: owner.id }, manager);
      if (!account) return { error: new NotFoundError(SIGN_IN_EXPIRED) };
      if (isLocked(account)) return { error: new TooManyRequestsError(ACCOUNT_LOCKED) };
      if (account.status !== 'active') return { error: new ForbiddenError(ACCOUNT_INACTIVE) };

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
          failed: owner,
        };
      }

      await authRepository.updateCode(latest.id, { consumedAt: new Date() }, manager);
      await authRepository.consumeChallenge(challenge.id, manager);
      await authRepository.recordSuccessfulSignIn(owner.kind, account.id, manager);
      const tokens = await openSession(owner.kind, account.id, context, manager);
      await auditService.record(
        {
          action: AUDIT_ACTIONS.signIn,
          ...asActor(owner.kind, account.id),
          ...toAuditContext(context),
        },
        manager,
      );
      return { owner, tokens };
    });

    if ('error' in outcome) {
      if (
        outcome.failed &&
        (await recordFailure(outcome.failed.kind, outcome.failed.id, 'wrong_code', context))
      ) {
        throw new TooManyRequestsError(ACCOUNT_LOCKED);
      }
      throw outcome.error;
    }

    const { owner, tokens } = outcome;
    return { user: await authService.getUser(owner.kind, owner.id), tokens };
  },

  // Rotates the refresh token. A token that was already rotated means it was copied:
  // the whole session is revoked and the legitimate device must sign in again.
  async refresh({ refreshToken }: RefreshTokenRequest, context: RequestContext) {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) throw new UnauthorizedError(SESSION_ENDED);

    const tokens = await dataSource.transaction(async (manager) => {
      const session = await authRepository.lockSession(parsed.sessionId, manager);
      if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
      const owner = ownerOf(session);

      if (!refreshSecretMatches(parsed.secret, session.refreshTokenHash)) {
        await authRepository.revokeSession(session.id, 'refresh_token_reused', manager);
        await auditService.record(
          {
            action: AUDIT_ACTIONS.refreshTokenReused,
            outcome: 'failure',
            ...asActor(owner.kind, owner.id),
            targetType: 'session',
            targetId: session.id,
            ...toAuditContext(context),
          },
          manager,
        );
        return null;
      }

      if ((await authRepository.findAccountStatus(owner.kind, owner.id, manager)) !== 'active') {
        await authRepository.revokeSession(session.id, 'account_inactive', manager);
        return null;
      }

      const next = createRefreshToken(session.id);
      await authRepository.rotateSessionToken(session.id, next.hash, manager);
      return buildTokens(owner.id, session.id, next.token, session.expiresAt);
    });

    if (!tokens) throw new UnauthorizedError(SESSION_ENDED);
    return tokens;
  },

  async signOut(auth: AccessContext, allDevices: boolean, context: RequestContext) {
    await dataSource.transaction(async (manager) => {
      if (allDevices) {
        await authRepository.revokeAccountSessions(
          auth.kind,
          auth.accountId,
          'sign_out_all',
          manager,
        );
      } else {
        await authRepository.revokeSession(auth.sessionId, 'sign_out', manager);
      }
      await auditService.record(
        {
          action: allDevices ? AUDIT_ACTIONS.signOutAll : AUDIT_ACTIONS.signOut,
          ...asActor(auth.kind, auth.accountId),
          ...toAuditContext(context),
        },
        manager,
      );
    });
  },

  async getUser(kind: AccountKind, accountId: string): Promise<UserResponse> {
    if (kind === 'platform_admin') {
      const admin = await authRepository.findPlatformAdminById(accountId);
      if (!admin) throw new UnauthorizedError(SESSION_ENDED);
      return toAdminUserResponse(admin);
    }

    const executive = await authRepository.findExecutiveById(accountId);
    if (!executive) throw new UnauthorizedError(SESSION_ENDED);
    return toUserResponse(executive, await loadProfileAccess(executive.memberId));
  },

  getCurrentUser(auth: AccessContext): Promise<UserResponse> {
    return authService.getUser(auth.kind, auth.accountId);
  },

  async getPlatformAdmin(platformAdminId: string): Promise<PlatformAdminResponse> {
    const admin = await authRepository.findPlatformAdminById(platformAdminId);
    if (!admin) throw new NotFoundError(NOT_FOUND);
    return toPlatformAdminResponse(admin);
  },

  // A member promoted to executive. Pass `manager` to join the caller's transaction.
  async createExecutive(
    input: CreateExecutiveRequest,
    actor: ActionActor = {},
    manager?: EntityManager,
  ): Promise<{ executiveId: string; memberId: string }> {
    if (!manager) {
      return dataSource.transaction((m) => authService.createExecutive(input, actor, m));
    }

    if (await authRepository.lockEmail(input.email, manager)) {
      throw new ConflictError(EMAIL_TAKEN, { errors: { email: [EMAIL_TAKEN] } });
    }

    const members = manager.getRepository(Member);
    let member = input.partyId
      ? await members.findOneBy({ organisationId: input.organisationId, partyId: input.partyId })
      : null;

    if (
      member &&
      (await manager.getRepository(OrganisationExecutive).existsBy({ memberId: member.id }))
    ) {
      throw new ConflictError('This member already has an account.');
    }
    if (member?.phone && member.phone !== input.phone) {
      throw new ValidationError({
        phone: ['This member is on file with a different phone number.'],
      });
    }

    member = member
      ? await members.save({ ...member, phone: input.phone, dateOfBirth: input.dateOfBirth })
      : await members.save(
          members.create({
            organisationId: input.organisationId,
            firstName: input.firstName,
            middleName: input.middleName ?? null,
            lastName: input.lastName,
            partyId: input.partyId ?? null,
            phone: input.phone,
            dateOfBirth: input.dateOfBirth,
          }),
        );

    const executive = await manager.getRepository(OrganisationExecutive).save(
      manager.getRepository(OrganisationExecutive).create({
        organisationId: input.organisationId,
        memberId: member.id,
        email: input.email,
        status: 'active',
      }),
    );

    await auditService.record(
      {
        action: AUDIT_ACTIONS.executiveCreated,
        targetType: 'executive',
        targetId: executive.id,
        metadata: { organisationId: input.organisationId },
        ...auditActor(actor),
      },
      manager,
    );

    return { executiveId: executive.id, memberId: member.id };
  },

  async setExecutiveStatus(
    executiveId: string,
    status: ManageableStatus,
    actor: ActionActor,
  ): Promise<void> {
    if (executiveId === actor.executiveId) throw new ForbiddenError(NOT_YOURSELF);

    await dataSource.transaction(async (manager) => {
      const executive = await authRepository.lockExecutive(executiveId, manager);
      if (!executive) throw new NotFoundError(NOT_FOUND);
      if (executive.status === status) return;
      if (executive.status === 'deactivated') {
        throw new ConflictError('This account has been deactivated and cannot be changed.');
      }

      await manager.getRepository(OrganisationExecutive).update({ id: executiveId }, { status });
      if (status === 'suspended') {
        await authRepository.revokeAccountSessions(
          'executive',
          executiveId,
          'account_inactive',
          manager,
        );
      }

      await auditService.record(
        {
          action:
            status === 'suspended'
              ? AUDIT_ACTIONS.executiveSuspended
              : AUDIT_ACTIONS.executiveReactivated,
          targetType: 'executive',
          targetId: executiveId,
          metadata: { previousStatus: executive.status },
          ...auditActor(actor),
        },
        manager,
      );
    });
  },

  async createPlatformAdmin(
    input: CreatePlatformAdminRequest,
    actor: ActionActor = {},
  ): Promise<PlatformAdminResponse> {
    const admin = await dataSource.transaction(async (manager) => {
      if (await authRepository.lockEmail(input.email, manager)) {
        throw new ConflictError(EMAIL_TAKEN, { errors: { email: [EMAIL_TAKEN] } });
      }

      const admins = manager.getRepository(PlatformAdmin);
      const created = await admins.save(admins.create({ ...input, status: 'active' }));
      await auditService.record(
        {
          action: AUDIT_ACTIONS.platformAdminCreated,
          targetType: 'platform_admin',
          targetId: created.id,
          ...auditActor(actor),
        },
        manager,
      );
      return created;
    });

    return toPlatformAdminResponse(admin);
  },

  endOrganisationSessions(organisationId: string, manager: EntityManager) {
    return authRepository.revokeOrganisationSessions(organisationId, manager);
  },

  async setPlatformAdminStatus(
    platformAdminId: string,
    status: ManageableStatus,
    actor: ActionActor,
  ): Promise<void> {
    if (platformAdminId === actor.platformAdminId) throw new ForbiddenError(NOT_YOURSELF);

    await dataSource.transaction(async (manager) => {
      const admin = await authRepository.lockPlatformAdmin(platformAdminId, manager);
      if (!admin) throw new NotFoundError(NOT_FOUND);
      if (admin.status === status) return;

      await manager.getRepository(PlatformAdmin).update({ id: platformAdminId }, { status });
      if (status === 'suspended') {
        await authRepository.revokeAccountSessions(
          'platform_admin',
          platformAdminId,
          'account_inactive',
          manager,
        );
      }

      await auditService.record(
        {
          action:
            status === 'suspended'
              ? AUDIT_ACTIONS.platformAdminSuspended
              : AUDIT_ACTIONS.platformAdminReactivated,
          targetType: 'platform_admin',
          targetId: platformAdminId,
          metadata: { previousStatus: admin.status },
          ...auditActor(actor),
        },
        manager,
      );
    });
  },
};
