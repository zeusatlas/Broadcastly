import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';

import {
  MEMBER_SORTS,
  MEMBER_STATUSES,
  type CreateMemberRequest,
  type ListMembersRequest,
  type MemberParams,
  type UpdateMemberRequest,
} from './members_types';
import { normaliseGhanaPhone } from './phone_number';

// Stored and compared in E.164, however the user typed it (FR-MEM-05).
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

const searchSchema = z.string().trim().max(100).optional();
const nameSchema = z.string().trim().min(1, 'Required.').max(100);
const optionalText = (max: number) => z.string().trim().max(max);
const dateOfBirthSchema = z.iso
  .date('Enter the date as YYYY-MM-DD.')
  .refine((value) => value >= '1900-01-01' && value < new Date().toISOString().slice(0, 10), {
    message: 'Enter a real date of birth.',
  });

export const memberParamsSchema = z.object({
  memberId: z.uuid(),
}) satisfies z.ZodType<MemberParams>;

export const listMembersSchema = pageQuerySchema.extend({
  search: searchSchema,
  status: z.enum(MEMBER_STATUSES).optional(),
  unitId: z.uuid().optional(),
  isExecutive: z.stringbool().optional(),
  sort: z.enum(MEMBER_SORTS).optional(),
  groupBy: z.enum(['unit']).optional(),
}) satisfies z.ZodType<ListMembersRequest>;

export const createMemberSchema = z
  .object({
    firstName: nameSchema,
    middleName: optionalText(100).optional(),
    lastName: nameSchema,
    memberNumber: optionalText(50).min(1).optional(),
    phone: phoneSchema.optional(),
    dateOfBirth: dateOfBirthSchema.optional(),
    unitId: z.uuid().optional(),
  })
  .openapi('CreateMemberRequest') satisfies z.ZodType<CreateMemberRequest>;

export const updateMemberSchema = z
  .object({
    firstName: nameSchema.optional(),
    middleName: optionalText(100).nullable().optional(),
    lastName: nameSchema.optional(),
    memberNumber: optionalText(50).min(1).nullable().optional(),
    phone: phoneSchema.nullable().optional(),
    dateOfBirth: dateOfBirthSchema.nullable().optional(),
    unitId: z.uuid().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Change at least one detail.' })
  .openapi('UpdateMemberRequest') satisfies z.ZodType<UpdateMemberRequest>;

export const memberResponseSchema = z
  .object({
    id: z.uuid(),
    organisationId: z.uuid(),
    firstName: z.string().openapi({ example: 'Akosua' }),
    middleName: z.string().nullable().openapi({ example: null }),
    lastName: z.string().openapi({ example: 'Boateng' }),
    fullName: z.string().openapi({ example: 'Akosua Boateng' }),
    memberNumber: z.string().nullable().openapi({ example: 'MBR-0042' }),
    phone: z.string().nullable().openapi({ example: '+233241234567' }),
    dateOfBirth: z.iso.date().nullable().openapi({ example: '1990-04-20' }),
    unitId: z.uuid().nullable(),
    unitName: z.string().nullable().openapi({ example: 'North Branch' }),
    status: z.enum(MEMBER_STATUSES),
    isExecutive: z.boolean(),
    email: z.email().nullable().openapi({ example: null }),
    createdAt: z.iso.datetime(),
  })
  .openapi('MemberResponse');
