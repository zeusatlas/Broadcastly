import type { Request, Response } from 'express';

import { idempotencyKeyOf } from '../../common/http/idempotency_key';
import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { requireAuth } from '../auth';

import { broadcastsService } from './broadcasts_service';
import type {
  BroadcastParams,
  CreateBroadcastRequest,
  DispatchBroadcastRequest,
  EstimateBroadcastRequest,
  ListBroadcastsRequest,
  UpdateBroadcastRequest,
} from './broadcasts_types';

const idOf = (res: Response) => validated<BroadcastParams>(res, 'params').broadcastId;

export const broadcastsController = {
  async estimate(req: Request, res: Response) {
    const body = validated<EstimateBroadcastRequest>(res, 'body');
    const data = await broadcastsService.estimate(requireAuth(req), body);
    return sendSuccess(res, { data, message: 'Estimate ready.' });
  },

  async create(req: Request, res: Response) {
    const body = validated<CreateBroadcastRequest>(res, 'body');
    const data = await broadcastsService.createDraft(
      requireAuth(req),
      body,
      getRequestContext(req),
    );
    return sendCreated(res, data, 'Draft saved.');
  },

  async update(req: Request, res: Response) {
    const body = validated<UpdateBroadcastRequest>(res, 'body');
    const data = await broadcastsService.updateDraft(
      requireAuth(req),
      idOf(res),
      body,
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Draft saved.' });
  },

  async submit(req: Request, res: Response) {
    const body = validated<DispatchBroadcastRequest>(res, 'body');
    const data = await broadcastsService.submit(
      requireAuth(req),
      idOf(res),
      body,
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Sent for approval.' });
  },

  async send(req: Request, res: Response) {
    const body = validated<DispatchBroadcastRequest>(res, 'body');
    const data = await broadcastsService.send(
      requireAuth(req),
      idOf(res),
      body,
      idempotencyKeyOf(req) ?? undefined,
      getRequestContext(req),
    );
    const message = data.status === 'scheduled' ? 'Broadcast scheduled.' : 'Broadcast is sending.';
    return sendSuccess(res, { data, message });
  },

  async cancel(req: Request, res: Response) {
    const data = await broadcastsService.cancel(
      requireAuth(req),
      idOf(res),
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Broadcast cancelled.' });
  },

  async list(req: Request, res: Response) {
    const query = validated<ListBroadcastsRequest>(res, 'query');
    const data = await broadcastsService.list(requireAuth(req), query);
    return sendSuccess(res, { data, message: 'Broadcasts retrieved.' });
  },

  async get(req: Request, res: Response) {
    const data = await broadcastsService.get(requireAuth(req), idOf(res));
    return sendSuccess(res, { data, message: 'Broadcast retrieved.' });
  },

  async deliveryReport(req: Request, res: Response) {
    const data = await broadcastsService.applyDeliveryReport(req.body, req.headers);
    return sendSuccess(res, { data, message: 'Delivery report received.' });
  },
};
