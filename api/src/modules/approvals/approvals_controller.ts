import type { Request, Response } from 'express';

import { getRequestContext } from '../../common/http/request_context';
import { sendSuccess } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { requireAuth } from '../auth';

import { approvalsService } from './approvals_service';
import type {
  ApprovalParams,
  ApproveBroadcastRequest,
  ListApprovalsRequest,
  RejectBroadcastRequest,
} from './approvals_types';

const idOf = (res: Response) => validated<ApprovalParams>(res, 'params').broadcastId;

export const approvalsController = {
  async list(req: Request, res: Response) {
    const data = await approvalsService.list(
      requireAuth(req),
      validated<ListApprovalsRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Approvals retrieved.' });
  },

  async get(req: Request, res: Response) {
    const data = await approvalsService.get(requireAuth(req), idOf(res));
    return sendSuccess(res, { data, message: 'Approval retrieved.' });
  },

  async approve(req: Request, res: Response) {
    const { reason } = validated<ApproveBroadcastRequest>(res, 'body');
    const data = await approvalsService.approve(
      requireAuth(req),
      idOf(res),
      reason,
      getRequestContext(req),
    );
    const message =
      data.status === 'scheduled' ? 'Approved and scheduled.' : 'Approved and sending.';
    return sendSuccess(res, { data, message });
  },

  async reject(req: Request, res: Response) {
    const { reason } = validated<RejectBroadcastRequest>(res, 'body');
    const data = await approvalsService.reject(
      requireAuth(req),
      idOf(res),
      reason,
      getRequestContext(req),
    );
    return sendSuccess(res, { data, message: 'Returned to the author.' });
  },
};
