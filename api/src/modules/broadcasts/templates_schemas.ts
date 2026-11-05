import { z } from 'zod';

import '../../config/openapi';

import { pageQuerySchema } from '../../common/http/pagination';

import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_FIELDS,
  type CreateTemplateRequest,
  type ListTemplatesRequest,
  type TemplateParams,
  type UpdateTemplateRequest,
} from './templates_types';

export const MAX_TEMPLATE_BODY = 1600;
const PLACEHOLDER = /\{([^{}]*)\}/g;
const ALLOWED = new Set<string>(TEMPLATE_FIELDS);

export const placeholdersIn = (body: string) => [...body.matchAll(PLACEHOLDER)].map((m) => m[1]!);

const nameSchema = z
  .string('Enter a template name.')
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().min(2, 'Enter at least 2 characters.').max(120, 'Use at most 120 characters.'));

const categorySchema = z.enum(TEMPLATE_CATEGORIES, 'Choose a category.');

const bodySchema = z
  .string('Enter the message.')
  .trim()
  .min(1, 'Enter the message.')
  .max(MAX_TEMPLATE_BODY, `Use at most ${MAX_TEMPLATE_BODY} characters.`)
  .superRefine((body, ctx) => {
    const unknown = [...new Set(placeholdersIn(body).filter((field) => !ALLOWED.has(field)))];
    if (unknown.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Only {first_name}, {meeting_date} and {meeting_location} can be used. Remove ${unknown.map((field) => `{${field}}`).join(', ')}.`,
      });
    }
  });

const searchSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined);

export const listTemplatesSchema = pageQuerySchema.extend({
  search: searchSchema,
  category: z.enum(TEMPLATE_CATEGORIES).optional(),
}) satisfies z.ZodType<ListTemplatesRequest>;

export const templateParamsSchema = z.object({
  templateId: z.uuid('Not a valid template id.'),
}) satisfies z.ZodType<TemplateParams>;

export const createTemplateSchema = z
  .object({ name: nameSchema, category: categorySchema, body: bodySchema })
  .openapi('CreateTemplateRequest') satisfies z.ZodType<CreateTemplateRequest>;

export const updateTemplateSchema = z
  .object({
    name: nameSchema.optional(),
    category: categorySchema.optional(),
    body: bodySchema.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Send a name, category or body.',
  })
  .openapi('UpdateTemplateRequest') satisfies z.ZodType<UpdateTemplateRequest>;

export const templateResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: 'Monthly meeting' }),
    category: z.enum(TEMPLATE_CATEGORIES).openapi({ example: 'meeting_announcement' }),
    body: z.string().openapi({
      example: 'Dear {first_name}, our monthly meeting is on {meeting_date} at {meeting_location}.',
    }),
    fields: z
      .array(z.enum(TEMPLATE_FIELDS))
      .openapi({ example: ['first_name', 'meeting_date', 'meeting_location'] }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi('TemplateResponse');
