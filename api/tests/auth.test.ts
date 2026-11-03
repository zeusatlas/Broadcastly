import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { hasAccess, type AccessContext } from '../src/modules/auth';
import {
  createExecutiveSchema,
  signInSchema,
  verifyOtpSchema,
} from '../src/modules/auth/auth_schemas';
import { generateOtp, hashOtp, otpMatches } from '../src/modules/auth/otp_service';
import { maskPhone, normaliseGhanaPhone } from '../src/modules/members';
import {
  createRefreshToken,
  parseRefreshToken,
  refreshSecretMatches,
  signAccessToken,
  verifyAccessToken,
} from '../src/modules/auth/token_service';

// Pure auth logic only; nothing here opens a database. Endpoint flows were verified against
// PostgreSQL by hand (see api/AGENTS.md §7) until an integration test database exists.

const SESSION_ID = '0b8a7c56-2f3e-4d1a-9c6b-1e2f3a4b5c6d';

describe('sign-in codes', () => {
  const CHALLENGE = '7c1e2d3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f';

  it('generates 6 digits, keeping leading zeros', () => {
    for (let i = 0; i < 200; i += 1) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it('matches only the right code for the right challenge', () => {
    const hash = hashOtp(CHALLENGE, '012345');

    expect(otpMatches(CHALLENGE, '012345', hash)).toBe(true);
    expect(otpMatches(CHALLENGE, '012346', hash)).toBe(false);
    expect(otpMatches('0b8a7c56-2f3e-4d1a-9c6b-1e2f3a4b5c6d', '012345', hash)).toBe(false);
  });

  it('never stores the code itself', () => {
    expect(hashOtp(CHALLENGE, '012345')).not.toContain('012345');
  });
});

describe('Ghanaian phone numbers', () => {
  it.each([
    '0241234567',
    '024 123 4567',
    '24-123-4567',
    '233241234567',
    '+233 24 123 4567',
    '00233241234567',
  ])('normalises %j to E.164', (raw) => expect(normaliseGhanaPhone(raw)).toBe('+233241234567'));

  it.each(['+233 55 928 6073', '0559286073', '233559286073', '055 928 6073', '+233559286073'])(
    'normalises the owner-listed format %j to +233559286073',
    (raw) => expect(normaliseGhanaPhone(raw)).toBe('+233559286073'),
  );

  it.each(['', '12345', '02412345678', '+2342412345678', '0741234567', 'phone'])(
    'rejects %j',
    (raw) => expect(normaliseGhanaPhone(raw)).toBeNull(),
  );

  it('masks all but the country code and last four digits', () => {
    expect(maskPhone('+233241234567')).toBe('+233 •• ••• 4567');
  });
});
describe('tokens', () => {
  it('round-trips an access token and reports its lifetime', () => {
    const { token, expiresIn } = signAccessToken({ sub: 'account-1', sid: SESSION_ID });

    expect(verifyAccessToken(token)).toEqual({ sub: 'account-1', sid: SESSION_ID });
    expect(expiresIn).toBe(15 * 60);
  });

  it('creates an opaque refresh token bound to its session', () => {
    const { token, hash } = createRefreshToken(SESSION_ID);
    const parsed = parseRefreshToken(token)!;

    expect(parsed.sessionId).toBe(SESSION_ID);
    expect(refreshSecretMatches(parsed.secret, hash)).toBe(true);
    expect(refreshSecretMatches('other-secret', hash)).toBe(false);
  });

  it.each(['', 'no-dot', 'not-a-uuid.secret', `${SESSION_ID}.a.b`])(
    'rejects malformed refresh token %j',
    (token) => expect(parseRefreshToken(token)).toBeNull(),
  );
});

describe('schemas', () => {
  it('normalises email and phone before lookup', () => {
    expect(signInSchema.parse({ email: '  Ama@Example.COM ', phone: '024 123 4567' })).toEqual({
      email: 'ama@example.com',
      phone: '+233241234567',
    });
  });

  it('accepts only a 6-digit code', () => {
    const challengeId = '7c1e2d3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f';

    expect(verifyOtpSchema.safeParse({ challengeId, code: '123456' }).success).toBe(true);
    expect(verifyOtpSchema.safeParse({ challengeId, code: '12345' }).success).toBe(false);
    expect(verifyOtpSchema.safeParse({ challengeId, code: '12a456' }).success).toBe(false);
  });

  it('requires a real past date of birth for a new account', () => {
    const base = {
      organisationId: '0b8a7c56-2f3e-4d1a-9c6b-1e2f3a4b5c6d',
      firstName: 'Ama',
      lastName: 'Mensah',
      email: 'ama@example.com',
      phone: '0241234567',
    };

    expect(createExecutiveSchema.safeParse({ ...base, dateOfBirth: '1984-03-12' }).success).toBe(
      true,
    );
    expect(createExecutiveSchema.safeParse({ ...base, dateOfBirth: '2999-01-01' }).success).toBe(
      false,
    );
    expect(createExecutiveSchema.safeParse({ ...base, dateOfBirth: '12/03/1984' }).success).toBe(
      false,
    );
  });
});
describe('hasAccess', () => {
  const auth: AccessContext = {
    kind: 'executive',
    accountId: 'a',
    memberId: 'p',
    organisationId: 'o',
    organisationWide: false,
    sessionId: 's',
    role: 'executive',
    permissions: new Set(['broadcast.draft', 'report.view']),
    scopeUnitIds: [],
  };

  it('applies permission, anyOf, allOf and roles together', () => {
    expect(hasAccess(auth, { permission: 'broadcast.draft' })).toBe(true);
    expect(hasAccess(auth, { permission: 'broadcast.send' })).toBe(false);
    expect(hasAccess(auth, { anyOf: ['broadcast.send', 'report.view'] })).toBe(true);
    expect(hasAccess(auth, { allOf: ['broadcast.draft', 'broadcast.send'] })).toBe(false);
    expect(hasAccess(auth, { roles: ['chairman'] })).toBe(false);
  });
});

describe('auth routes', () => {
  it('validates the sign-in body before touching the database', async () => {
    const res = await request(createApp()).post('/api/v1/auth/login').send({ email: 'bad' });

    expect(res.status).toBe(422);
    expect(Object.keys(res.body.errors).sort()).toEqual(['email', 'phone']);
  });

  it('requires a bearer token for /auth/me', async () => {
    const res = await request(createApp()).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
  });

  it('documents every auth route in OpenAPI', async () => {
    const res = await request(createApp()).get('/api/docs.json');

    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/auth/login',
        '/auth/verify-otp',
        '/auth/resend-otp',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
      ]),
    );
  });
});
