import { Router } from 'express';

import {
  errorResponses,
  jsonBody,
  jsonResponse,
  messageEnvelope,
  paginatedSchema,
  successEnvelope,
} from '../../common/http/openapi_schemas';
import { validate } from '../../common/middleware/validate';
import { bearerAuth, openApiRegistry } from '../../config/openapi';
import { authenticate, authorize } from '../auth';

import { creditsController as c } from './credits_controller';
import {
  createPurchaseSchema,
  creditBalancesResponseSchema,
  creditTransactionResponseSchema,
  listCreditTransactionsSchema,
  listPurchasesSchema,
  purchaseResponseSchema,
  simulatedPaymentEventSchema,
} from './credits_schemas';

export const creditsRouter = Router();

const purchaser = authorize({ permission: 'credit.purchase' });

// The provider calls this, not a signed-in user; the driver verifies the event (SRS 6.5).
creditsRouter.post('/payments/webhook', c.paymentWebhook);

creditsRouter.get('/balance', authenticate, c.getBalances);
creditsRouter.get(
  '/transactions',
  authenticate,
  validate({ query: listCreditTransactionsSchema }),
  c.listTransactions,
);
creditsRouter.get(
  '/purchases',
  authenticate,
  purchaser,
  validate({ query: listPurchasesSchema }),
  c.listPurchases,
);
creditsRouter.post(
  '/purchases',
  authenticate,
  purchaser,
  validate({ body: createPurchaseSchema }),
  c.createPurchase,
);

const tags = ['Credits'];
const security = [{ [bearerAuth.name]: [] }];
const NOT_EXECUTIVE: [number, string] = [403, 'Not an executive of an organisation.'];
const NOT_PURCHASER: [number, string] = [403, 'No credit.purchase permission.'];

openApiRegistry.registerPath({
  method: 'get',
  path: '/credits/balance',
  operationId: 'getCreditBalances',
  tags,
  summary: 'Get credit balances',
  description:
    'Your own wallet, and the organisation’s wallet if you hold `credit.purchase` or `credit.allocate` (otherwise `null`). `available` is the balance less credits reserved for scheduled broadcasts.',
  security,
  responses: {
    200: jsonResponse(
      'Balances.',
      successEnvelope(creditBalancesResponseSchema, 'Credit balances retrieved.'),
    ),
    ...errorResponses(401, NOT_EXECUTIVE),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/credits/transactions',
  operationId: 'listCreditTransactions',
  tags,
  summary: 'List credit history',
  description:
    'Ledger entries of your wallet (`wallet=mine`) or the organisation’s (`wallet=organisation`, needs a credit permission), newest first. Filter with `period` (`today`, `yesterday`, `last_3_days`, `last_7_days`, `last_30_days`, `last_365_days`, `all_time`, or `custom` with `from`/`to`).',
  security,
  request: { query: listCreditTransactionsSchema },
  responses: {
    200: jsonResponse(
      'A page of ledger entries.',
      successEnvelope(
        paginatedSchema(creditTransactionResponseSchema),
        'Credit history retrieved.',
      ),
    ),
    ...errorResponses(401, NOT_EXECUTIVE, 422),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/credits/purchases',
  operationId: 'listCreditPurchases',
  tags,
  summary: "List the organisation's purchases",
  description: 'Newest first. Filter by `status` and `period`.',
  security,
  request: { query: listPurchasesSchema },
  responses: {
    200: jsonResponse(
      'A page of purchases.',
      successEnvelope(paginatedSchema(purchaseResponseSchema), 'Purchases retrieved.'),
    ),
    ...errorResponses(401, NOT_PURCHASER, 422),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/credits/purchases',
  operationId: 'createCreditPurchase',
  tags,
  summary: 'Buy credits for the organisation',
  description: `
Starts a purchase as \`pending\`. Credits reach the organisation's wallet only when the payment
provider confirms it through the webhook; then the status becomes \`completed\` (or \`failed\`).

- Send an \`Idempotency-Key\` header (8–100 letters, digits, - or _): repeating the request with the
  same key returns the first purchase instead of starting another.
- Pay at \`checkoutUrl\` when it is set.
`,
  security,
  request: {
    body: jsonBody(createPurchaseSchema, { credits: 10000 }),
  },
  responses: {
    201: jsonResponse(
      'The purchase.',
      successEnvelope(purchaseResponseSchema, 'Purchase started.', 201),
    ),
    ...errorResponses(401, NOT_PURCHASER, 422),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/credits/payments/webhook',
  operationId: 'paymentWebhook',
  tags,
  summary: 'Payment provider webhook',
  description:
    'Called by the payment provider. With `PAYMENT_DRIVER=simulate` (testing stand-in until a provider is connected) send `{ reference, outcome: "paid" | "failed" }` to settle a purchase. Settling twice changes nothing.',
  request: {
    body: jsonBody(simulatedPaymentEventSchema, { reference: 'BCP-3F2A9C1D7E4B', outcome: 'paid' }),
  },
  responses: {
    200: jsonResponse('Received.', messageEnvelope('Payment notification received.')),
    ...errorResponses([404, 'No purchase has this reference.', 'Purchase not found.'], 422),
  },
});
