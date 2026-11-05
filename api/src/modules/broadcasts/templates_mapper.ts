import type { TemplateRow } from './templates_repository';
import { placeholdersIn } from './templates_schemas';
import { TEMPLATE_FIELDS, type TemplateResponse } from './templates_types';

export const toTemplateResponse = (row: TemplateRow): TemplateResponse => {
  const used = new Set(placeholdersIn(row.body));
  return { ...row, fields: TEMPLATE_FIELDS.filter((field) => used.has(field)) };
};
