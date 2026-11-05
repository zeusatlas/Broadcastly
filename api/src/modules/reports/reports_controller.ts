import type { Request, Response } from 'express';

import { getRequestContext } from '../../common/http/request_context';
import { sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { requireAuth } from '../auth';

import { reportsService } from './reports_service';
import type { ListDeliveriesRequest, ReportParams } from './reports_types';

const idOf = (res: Response) => validated<ReportParams>(res, 'params').broadcastId;

export const reportsController = {
  async deliveries(req: Request, res: Response) {
    const query = validated<ListDeliveriesRequest>(res, 'query');
    const data = await reportsService.deliveries(requireAuth(req), idOf(res), query);
    return sendSuccess(res, { data, message: 'Delivery report retrieved.' });
  },

  // A file download, so it streams CSV instead of the JSON envelope.
  async exportDeliveries(req: Request, res: Response) {
    const { fileName, lines } = await reportsService.exportDeliveries(
      requireAuth(req),
      idOf(res),
      getRequestContext(req),
    );
    res.status(200);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');
    for await (const chunk of lines) {
      if (!res.write(chunk)) await new Promise((resolve) => res.once('drain', resolve));
    }
    res.end();
  },
};
