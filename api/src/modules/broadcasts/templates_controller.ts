import type { Request, Response } from 'express';

import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendNoData, sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { requireAuth } from '../auth';

import { templatesService } from './templates_service';
import type {
  CreateTemplateRequest,
  ListTemplatesRequest,
  TemplateParams,
  UpdateTemplateRequest,
} from './templates_types';

export const templatesController = {
  async list(req: Request, res: Response) {
    const data = await templatesService.list(
      requireAuth(req),
      validated<ListTemplatesRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Templates retrieved.' });
  },

  async get(req: Request, res: Response) {
    const { templateId } = validated<TemplateParams>(res, 'params');
    const data = await templatesService.get(requireAuth(req), templateId);
    return sendSuccess(res, { data, message: 'Template retrieved.' });
  },

  async create(req: Request, res: Response) {
    const data = await templatesService.create(
      requireAuth(req),
      validated<CreateTemplateRequest>(res, 'body'),
      getRequestContext(req),
    );
    return sendCreated(res, data, 'Template created.');
  },

  async update(req: Request, res: Response) {
    const { templateId } = validated<TemplateParams>(res, 'params');
    const data = await templatesService.update(
      requireAuth(req),
      templateId,
      validated<UpdateTemplateRequest>(res, 'body'),
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Template updated.' });
  },

  async archive(req: Request, res: Response) {
    const { templateId } = validated<TemplateParams>(res, 'params');
    await templatesService.archive(requireAuth(req), templateId, getRequestContext(req));
    return sendNoData(res, 'Template archived.');
  },
};
