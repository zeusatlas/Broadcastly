import { z } from 'zod';

import '../../config/openapi';

import { normaliseGhanaPhone } from '../members';

import {
  EXECUTIVE_STATUSES,
  PERMISSIONS,
  USER_ROLES,
  type CreateExecutiveRequest,
  type RefreshTokenRequest,
  type ResendOtpRequest,
  type SignInRequest,
  type SignOutRequest,
  type VerifyOtpRequest,
} from './auth_types';
import { OTP_LENGTH, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_SECONDS } from './otp_service';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Enter a valid email address.'));

// Stored and compared in E.164, however the user typed it.
export const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .transform((value, ctx) => {
    const phone = normaliseGhanaPhone(value);
    if (!phone) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid Ghanaian phone number.' });
      return z.NEVER;
    }
    return phone;
  });

const dateOfBirthSchema = z.iso
  .date('Enter the date as YYYY-MM-DD.')
  .refine((value) => value >= '1900-01-01' && value < new Date().toISOString().slice(0, 10), {
    message: 'Enter a real date of birth.',
  });

const nameSchema = z.string().trim().min(1, 'Required.').max(100);

// ── Requests ────────────────────────────────────────────────────────────────

export const signInSchema = z
  .object({ email: emailSchema, phone: phoneSchema })
  .openapi('SignInRequest') satisfies z.ZodType<SignInRequest>;

export const verifyOtpSchema = z
  .object({
    challengeId: z.uuid('This sign-in request is not valid. Start again.'),
    code: z
      .string()
      .trim()
      .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code.`),
  })
  .openapi('VerifyOtpRequest') satisfies z.ZodType<VerifyOtpRequest>;

export const resendOtpSchema = z
  .object({ challengeId: z.uuid('This sign-in request is not valid. Start again.') })
  .openapi('ResendOtpRequest') satisfies z.ZodType<ResendOtpRequest>;

export const refreshTokenSchema = z
  .object({ refreshToken: z.string().min(1).max(200) })
  .openapi('RefreshTokenRequest') satisfies z.ZodType<RefreshTokenRequest>;

export const signOutSchema = z
  .object({ allDevices: z.boolean().optional() })
  .default({})
  .openapi('SignOutRequest') satisfies z.ZodType<SignOutRequest>;

export const createExecutiveSchema = z.object({
  firstName: nameSchema,
  middleName: nameSchema.optional(),
  lastName: nameSchema,
  partyId: z.string().trim().min(1).max(50).optional(),
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateOfBirthSchema,
  role: z.enum(USER_ROLES),
}) satisfies z.ZodType<CreateExecutiveRequest>;
// ── Responses (documentation only) ──────────────────────────────────────────

export const authTokensResponseSchema = z
  .object({
    accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…' }),
    refreshToken: z.string().openapi({ example: '0b8a7c56-2f3e-4d1a-9c6b-1e2f3a4b5c6d.q3Vx…' }),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int().openapi({ example: 900 }),
    sessionExpiresAt: z.iso.datetime().openapi({ example: '2026-11-02T09:30:00.000Z' }),
  })
  .openapi('AuthTokensResponse');

const appointmentSchema = z
  .object({
    id: z.uuid(),
    positionTitle: z.string().openapi({ example: 'Constituency Chairman' }),
    unitId: z.uuid(),
    unitName: z.string().openapi({ example: 'Central Constituency' }),
    unitType: z.string().openapi({ example: 'constituency' }),
    effectiveFrom: z.iso.datetime(),
    effectiveTo: z.iso.datetime().nullable(),
  })
  .openapi('AppointmentSummary');

export const userResponseSchema = z
  .object({
    id: z.uuid(),
    memberId: z.uuid(),
    partyId: z.string().nullable().openapi({ example: 'M-004512' }),
    firstName: z.string().openapi({ example: 'Ama' }),
    middleName: z.string().nullable().openapi({ example: 'Serwaa' }),
    lastName: z.string().openapi({ example: 'Mensah' }),
    fullName: z.string().openapi({ example: 'Ama Serwaa Mensah' }),
    email: z.string().openapi({ example: 'ama.mensah@example.com' }),
    phone: z.string().nullable().openapi({ example: '+233241234567' }),
    dateOfBirth: z.iso.date().nullable().openapi({ example: '1984-03-12' }),
    role: z.enum(USER_ROLES).openapi({ example: 'constituency_chairman' }),
    status: z.enum(EXECUTIVE_STATUSES).openapi({ example: 'active' }),
    permissions: z
      .array(z.enum(PERMISSIONS))
      .openapi({ example: ['broadcast.draft', 'member.manage', 'report.view'] }),
    appointments: z.array(appointmentSchema),
    lastSignInAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('UserResponse');

export const otpChallengeResponseSchema = z
  .object({
    challengeId: z.uuid(),
    maskedPhone: z.string().openapi({ example: '+233 •• ••• 4567' }),
    expiresIn: z.number().int().openapi({ example: OTP_TTL_SECONDS }),
    resendIn: z.number().int().openapi({ example: OTP_RESEND_COOLDOWN_SECONDS }),
  })
  .openapi('OtpChallengeResponse');

export const signInResponseSchema = z
  .object({ user: userResponseSchema, tokens: authTokensResponseSchema })
  .openapi('SignInResponse');
