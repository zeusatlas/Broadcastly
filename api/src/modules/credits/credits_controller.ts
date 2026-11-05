import type { Request, Response } from 'express';

import { idempotencyKeyOf } from '../../common/http/idempotency_key';
import { getRequestContext } from '../../common/http/request_context';
import { sendCreated, sendSuccess, sendNoData } from '../../common/http/respond';
import { validated } from '../../common/middleware/validate';
import { env } from '../../config/env';
import { actorFrom, requireAuth } from '../auth';

import { creditsService } from './credits_service';
import type {
  CreateAllocationRequest,
  CreatePurchaseRequest,
  ListAllocationRecipientsRequest,
  ListAllocationsRequest,
  ListCreditTransactionsRequest,
  ListPurchasesRequest,
} from './credits_types';

export const creditsController = {
  // The price the server will charge, so the app can show the total before the buyer confirms.
  getPricing(_req: Request, res: Response) {
    return sendSuccess(res, {
      data: { pricePesewasPerCredit: env.CREDIT_PRICE_PESEWAS, currency: 'GHS' },
      message: 'Pricing retrieved.',
    });
  },

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

  async createAllocation(req: Request, res: Response) {
    const auth = requireAuth(req);
    const data = await creditsService.createAllocation(
      auth,
      validated<CreateAllocationRequest>(res, 'body'),
      idempotencyKeyOf(req),
      actorFrom(auth, getRequestContext(req)),
    );
    return sendCreated(res, data, 'Credits allocated.');
  },

  async listAllocations(req: Request, res: Response) {
    const data = await creditsService.listAllocations(
      requireAuth(req),
      validated<ListAllocationsRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Allocations retrieved.' });
  },

  async listAllocationRecipients(req: Request, res: Response) {
    const data = await creditsService.listAllocationRecipients(
      requireAuth(req),
      validated<ListAllocationRecipientsRequest>(res, 'query'),
    );
    return sendSuccess(res, { data, message: 'Recipients retrieved.' });
  },

  async paymentWebhook(req: Request, res: Response) {
    await creditsService.handleWebhook(req.headers, req.body);
    return sendNoData(res, 'Payment notification received.');
  },
};
