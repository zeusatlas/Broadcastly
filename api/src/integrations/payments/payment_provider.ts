import { z } from 'zod';

import { env } from '../../config/env';

// The boundary for the payment gateway (SRS 6.5, FR-CR-02). Credits are added only after the
// provider's own confirmation reaches the webhook; the app's word that it paid is never enough.

export interface InitiatePaymentInput {
  reference: string;
  amountPesewas: number;
  currency: 'GHS';
  description: string;
}

export interface InitiatedPayment {
  // Where the buyer completes payment; null when the driver needs no redirect.
  checkoutUrl: string | null;
}

export interface PaymentEvent {
  reference: string;
  outcome: 'paid' | 'failed';
  reason?: string;
}

export interface PaymentProvider {
  name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatedPayment>;
  // Verifies and reads a webhook; null when it is not a genuine event from this provider.
  parseWebhook(headers: Record<string, unknown>, body: unknown): PaymentEvent | null;
}

const simulatedEventSchema = z.object({
  reference: z.string().min(1).max(60),
  outcome: z.enum(['paid', 'failed']),
  reason: z.string().max(255).optional(),
});

// Testing stand-in (startup warns while it is used): the webhook body itself says paid or failed.
const simulateProvider: PaymentProvider = {
  name: 'simulate',
  initiate: () => Promise.resolve({ checkoutUrl: null }),
  parseWebhook: (_headers, body) => simulatedEventSchema.safeParse(body).data ?? null,
};

const PROVIDERS: Record<typeof env.PAYMENT_DRIVER, PaymentProvider> = {
  simulate: simulateProvider,
};

export const paymentProvider = PROVIDERS[env.PAYMENT_DRIVER];
