import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { env } from '../../config/env';

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 3 * 60;
// A challenge can be resent until this old; after that the user starts again from email + phone.
export const OTP_CHALLENGE_TTL_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
// Caps SMS cost and abuse per executive, however many challenges are opened.
export const OTP_MAX_SENDS_PER_WINDOW = 5;
export const OTP_SEND_WINDOW_MINUTES = 15;

// Keyed with a purpose-specific key derived from the JWT secret, and bound to the code's row id,
// so a leaked otp_codes table cannot be brute-forced offline (a 6-digit space is tiny).
const otpKey = createHmac('sha256', env.JWT_ACCESS_SECRET).update('otp-code-v1').digest();

export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
}

export function hashOtp(codeId: string, code: string): string {
  return createHmac('sha256', otpKey).update(`${codeId}:${code}`).digest('hex');
}

export function otpMatches(codeId: string, code: string, storedHash: string): boolean {
  const actual = Buffer.from(hashOtp(codeId, code), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const otpMessage = (code: string) =>
  `${code} is your Broadcastly sign-in code. It expires in ${OTP_TTL_SECONDS / 60} minutes. Never share it.`;
