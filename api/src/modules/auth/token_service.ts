import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { UnauthorizedError } from '../../common/errors/app_error';
import { env } from '../../config/env';

import type { AccessTokenClaims } from './auth_types';

// Algorithm pinned on verify: never let a token choose its own algorithm (e.g. "none").
const ALGORITHM = 'HS256';
const REFRESH_SECRET_BYTES = 32;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SignedAccessToken {
  token: string;
  expiresIn: number;
}

export function signAccessToken(claims: AccessTokenClaims): SignedAccessToken {
  const token = jwt.sign({ sid: claims.sid }, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    subject: claims.sub,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
  const { exp, iat } = jwt.decode(token) as jwt.JwtPayload;

  return { token, expiresIn: exp! - iat! };
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: [ALGORITHM],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    if (typeof payload === 'string' || !payload.sub || typeof payload.sid !== 'string') {
      throw new UnauthorizedError();
    }

    return { sub: payload.sub, sid: payload.sid };
  } catch (error) {
    // Expired, malformed and forged tokens all look the same to the caller: a 401 the app refreshes.
    throw new UnauthorizedError('Your session has ended. Please sign in again.', { cause: error });
  }
}

// Refresh tokens are opaque: "<sessionId>.<random secret>". Only a SHA-256 of the secret is
// stored, which is safe because the secret is 256 random bits, not a user-chosen password.
export function createRefreshToken(sessionId: string): { token: string; hash: string } {
  const secret = randomBytes(REFRESH_SECRET_BYTES).toString('base64url');
  return { token: `${sessionId}.${secret}`, hash: hashRefreshSecret(secret) };
}

export function parseRefreshToken(token: string): { sessionId: string; secret: string } | null {
  const [sessionId, secret, ...rest] = token.split('.');
  if (!sessionId || !secret || rest.length > 0 || !UUID_PATTERN.test(sessionId)) return null;

  return { sessionId, secret };
}

export function hashRefreshSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function refreshSecretMatches(secret: string, storedHash: string): boolean {
  return timingSafeEqual(Buffer.from(hashRefreshSecret(secret)), Buffer.from(storedHash));
}
