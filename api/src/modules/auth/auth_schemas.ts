import { z } from 'zod';

import '../../config/openapi';

import { phoneSchema } from '../members';

import {
  EXECUTIVE_STATUSES,
  PERMISSIONS,
  PLATFORM_ADMIN_STATUSES,
  SIGN_IN_CLIENTS,
  USER_ROLES,
  type CreateExecutiveRequest,
  type CreatePlatformAdminRequest,
  type RefreshTokenRequest,
  type ResendOtpRequest,
  type SignInRequest,
  type SessionParams,
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

const dateOfBirthSchema = z.iso
  .date('Enter the date as YYYY-MM-DD.')
  .refine((value) => value >= '1900-01-01' && value < new Date().toISOString().slice(0, 10), {
    message: 'Enter a real date of birth.',
  });

const nameSchema = z.string().trim().min(1, 'Required.').max(100);

export const signInSchema = z
  .object({ email: emailSchema, phone: phoneSchema, client: z.enum(SIGN_IN_CLIENTS).optional() })
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
  organisationId: z.uuid('Not a valid organisation id.'),
  firstName: nameSchema,
  middleName: nameSchema.optional(),
  lastName: nameSchema,
  partyId: z.string().trim().min(1).max(50).optional(),
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateOfBirthSchema,
}) satisfies z.ZodType<CreateExecutiveRequest>;

export const createPlatformAdminSchema = z
  .object({ firstName: nameSchema, lastName: nameSchema, email: emailSchema, phone: phoneSchema })
  .openapi('CreatePlatformAdminRequest') satisfies z.ZodType<CreatePlatformAdminRequest>;

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
    organisationId: z.uuid(),
    organisationName: z.string().openapi({ example: 'Central Constituency' }),
    unitId: z.uuid().nullable(),
    unitName: z.string().nullable().openapi({ example: null }),
    unitType: z.string().nullable().openapi({ example: null }),
    effectiveFrom: z.iso.datetime(),
    effectiveTo: z.iso.datetime().nullable(),
  })
  .openapi('AppointmentSummary');

export const organisationRefSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Central Constituency' }),
    type: z.string().openapi({ example: 'constituency' }),
    logoUrl: z
      .url()
      .nullable()
      .openapi({ example: 'https://api.example.com/uploads/organisation-logos/3f2a.png' }),
  })
  .openapi('OrganisationRef');

export const userResponseSchema = z
  .object({
    id: z.uuid(),
    role: z.enum(USER_ROLES).openapi({ example: 'chairman' }),
    status: z.enum(EXECUTIVE_STATUSES).openapi({ example: 'active' }),
    memberId: z.uuid().nullable(),
    partyId: z.string().nullable().openapi({ example: 'M-004512' }),
    firstName: z.string().openapi({ example: 'Ama' }),
    middleName: z.string().nullable().openapi({ example: 'Serwaa' }),
    lastName: z.string().openapi({ example: 'Mensah' }),
    fullName: z.string().openapi({ example: 'Ama Serwaa Mensah' }),
    email: z.string().openapi({ example: 'ama.mensah@example.com' }),
    phone: z.string().nullable().openapi({ example: '+233241234567' }),
    dateOfBirth: z.iso.date().nullable().openapi({ example: '1984-03-12' }),
    organisation: organisationRefSchema.nullable(),
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

export const platformAdminResponseSchema = z
  .object({
    id: z.uuid(),
    firstName: z.string().openapi({ example: 'Ama' }),
    lastName: z.string().openapi({ example: 'Owusu' }),
    fullName: z.string().openapi({ example: 'Ama Owusu' }),
    email: z.string().openapi({ example: 'ama.owusu@example.com' }),
    phone: z.string().openapi({ example: '+233201234567' }),
    status: z.enum(PLATFORM_ADMIN_STATUSES).openapi({ example: 'active' }),
    lastSignInAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi('PlatformAdminResponse');

export const sessionParamsSchema = z.object({
  sessionId: z.uuid(),
}) satisfies z.ZodType<SessionParams>;

export const sessionResponseSchema = z
  .object({
    id: z.uuid(),
    userAgent: z.string().nullable().openapi({ example: 'okhttp/4.12.0' }),
    signedInAt: z.iso.datetime(),
    lastUsedAt: z.iso.datetime().nullable(),
    expiresAt: z.iso.datetime(),
    isCurrent: z.boolean(),
  })
  .openapi('SessionResponse');
