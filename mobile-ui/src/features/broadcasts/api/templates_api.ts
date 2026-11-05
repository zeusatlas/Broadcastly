import { http, type RequestOptions } from '@/lib/api';

import type {
  CreateTemplateRequest,
  ListTemplatesParams,
  TemplateResponse,
  TemplatesResponse,
  UpdateTemplateRequest,
} from '../types';

// Reusable message templates (FR-SMS-04, FR-SMS-05).
export const templatesEndpoints = {
  readTemplates: (params: ListTemplatesParams, options?: RequestOptions) =>
    http.get<TemplatesResponse>('/templates', { ...options, params }),

  readTemplate: ({ templateId }: { templateId: string }, options?: RequestOptions) =>
    http.get<TemplateResponse>(`/templates/${templateId}`, options),

  createTemplate: (credentials: CreateTemplateRequest) =>
    http.post<TemplateResponse, CreateTemplateRequest>('/templates', credentials),

  updateTemplate: ({
    templateId,
    credentials,
  }: {
    templateId: string;
    credentials: UpdateTemplateRequest;
  }) =>
    http.patch<TemplateResponse, UpdateTemplateRequest>(`/templates/${templateId}`, credentials),

  archiveTemplate: ({ templateId }: { templateId: string }) =>
    http.delete(`/templates/${templateId}`),
};
