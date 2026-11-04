import type { Request, Response } from 'express';

import { ValidationError } from '../../common/errors/app_error';
import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendSuccess, sendNoData } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { actorFrom, requireAuth } from '../auth';

import { idempotencyKeySchema } from './credits_schemas';
import { creditsService } from './credits_service';
import type {
  CreatePurchaseRequest,
  ListCreditTransactionsRequest,
  ListPurchasesRequest,
} from './credits_types';

function idempotencyKeyOf(req: Request): string | null {
  const header = req.get('Idempotency-Key');
  if (header === undefined) return null;
  const parsed = idempotencyKeySchema.safeParse(header);
  if (!parsed.success) {
    throw new ValidationError(
      { 'Idempotency-Key': ['Use 8 to 100 letters, digits, - or _.'] },
      'The Idempotency-Key header is invalid.',
    );
  }
  return parsed.data;
}

export const creditsController = {
  async getBalances(req: Request, res: Response) {
    const data = await creditsService.getBalances(requireAuth(req));
    return sendSuccess(res, { data, message: 'Credit balances retrieved.' });
  },

  async listTransactions(req: Request, res: Response) {
    const data = await creditsService.listTransactions(
      requireAuth(req),
      validated<ListCreditTransactionsRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Credit history retrieved.' });
  },

  async listPurchases(req: Request, res: Response) {
    const data = await creditsService.listOwnPurchases(
      requireAuth(req),
      validated<ListPurchasesRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Purchases retrieved.' });
  },

  async createPurchase(req: Request, res: Response) {
    const auth = requireAuth(req);
    const data = await creditsService.createPurchase(
      auth,
      validated<CreatePurchaseRequest>(res, 'body'),
      idempotencyKeyOf(req),
      actorFrom(auth, getRequestContext(req)),
    );
    return sendCreated(res, data, 'Purchase started.');
  },

  async paymentWebhook(req: Request, res: Response) {
    await creditsService.handleWebhook(req.headers, req.body);
    return sendNoData(res, 'Payment notification received.');
  },
};
