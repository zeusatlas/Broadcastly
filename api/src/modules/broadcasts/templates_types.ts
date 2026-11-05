import type { PageParams } from '../../common/http/pagination';

// The three kinds of reusable official message the SRS names (FR-SMS-04).
export const TEMPLATE_CATEGORIES = ['official_notice', 'meeting_announcement', 'reminder'] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

// Approved personalisation fields (FR-SMS-05), written in a body as {first_name} and filled per recipient.
export const TEMPLATE_FIELDS = ['first_name', 'meeting_date', 'meeting_location'] as const;
export type TemplateField = (typeof TEMPLATE_FIELDS)[number];

export interface TemplateParams {
  templateId: string;
}

export interface ListTemplatesRequest extends PageParams {
  search?: string;
  category?: TemplateCategory;
}

export interface CreateTemplateRequest {
  name: string;
  category: TemplateCategory;
  body: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  category?: TemplateCategory;
  body?: string;
}

export interface TemplateResponse {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  fields: TemplateField[];
  createdAt: Date;
  updatedAt: Date;
}
