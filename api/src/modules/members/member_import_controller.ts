import type { Request, Response } from 'express';

import type { PageParams } from '../../common/http/pagination';
import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { requireAuth } from '../auth';

import { memberImportService as service, type UploadedSpreadsheet } from './member_import_service';
import type {
  ImportRowParams,
  ListImportRowsRequest,
  MemberImportParams,
  ResolveImportRowRequest,
  StartMemberImportRequest,
} from './member_import_types';

const importIdOf = (res: Response) => validated<MemberImportParams>(res, 'params').importId;

export const memberImportController = {
  // A file download, so it is the one response here outside the JSON envelope.
  template(_req: Request, res: Response) {
    res.attachment('member-import-template.csv');
    res.type('text/csv; charset=utf-8');
    return res.send(service.template());
  },

  async list(req: Request, res: Response) {
    const data = await service.list(requireAuth(req), validated<PageParams>(res, 'query'));
    return sendSuccess(res, { data, message: 'Imports retrieved.' });
  },

  async start(req: Request, res: Response) {
    const data = await service.start(
      requireAuth(req),
      validated<StartMemberImportRequest>(res, 'body'),
      res.locals.spreadsheet as UploadedSpreadsheet,
      getRequestContext(req),
    );
    return sendCreated(res, data, 'Import started. The file is being checked.');
  },

  async get(req: Request, res: Response) {
    const data = await service.get(requireAuth(req), importIdOf(res));
    return sendSuccess(res, { data, message: 'Import retrieved.' });
  },

  async listRows(req: Request, res: Response) {
    const data = await service.listRows(
      requireAuth(req),
      importIdOf(res),
      validated<ListImportRowsRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Rows retrieved.' });
  },

  async resolveRow(req: Request, res: Response) {
    const { importId, rowId } = validated<ImportRowParams>(res, 'params');
    const { resolution } = validated<ResolveImportRowRequest>(res, 'body');
    const data = await service.resolveRow(requireAuth(req), importId, rowId, resolution);
    return sendSuccess(res, { data, message: 'Decision saved.' });
  },

  async confirm(req: Request, res: Response) {
    const data = await service.confirm(requireAuth(req), importIdOf(res), getRequestContext(req));
    return sendSuccess(res, {
      data,
      message:
        data.status === 'completed' ? 'Import completed.' : 'Import confirmed. Saving members.',
    });
  },

  async cancel(req: Request, res: Response) {
    const data = await service.cancel(requireAuth(req), importIdOf(res), getRequestContext(req));
    return sendSuccess(res, { data, message: 'Import cancelled.' });
  },
};
