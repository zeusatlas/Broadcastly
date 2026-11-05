import { randomUUID } from 'node:crypto';

import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface OutgoingSms {
  // Our recipient row id, echoed back so each result maps to its row.
  recipientId: string;
  to: string;
  body: string;
}

export interface SmsSendResult {
  recipientId: string;
  providerReference: string | null;
  error: string | null;
}

export type DeliveryState = 'delivered' | 'failed' | 'unknown';

export interface DeliveryUpdate {
  providerReference: string;
  state: DeliveryState;
  error: string | null;
}

// The boundary every bulk SMS gateway implements (SRS 6.4). Core code depends only on this,
// so a provider can be swapped without touching broadcasts.
export interface BulkSmsProvider {
  sendBatch(messages: OutgoingSms[]): Promise<SmsSendResult[]>;
  // Turns a delivery callback body into updates; throws if the callback cannot be trusted.
  parseDeliveryReport(
    body: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): DeliveryUpdate[];
}

const STATES = new Set<DeliveryState>(['delivered', 'failed', 'unknown']);

// Testing stand-in (see config/startup.ts): nothing leaves the server, so no number or text is logged.
// Delivery reports are posted by hand to the webhook as { reports: [{ providerReference, state }] }.
const logProvider: BulkSmsProvider = {
  async sendBatch(messages) {
    logger.info(`Bulk SMS: ${messages.length} message(s) accepted (not sent, SMS_DRIVER=log)`);
    return messages.map((message) => ({
      recipientId: message.recipientId,
      providerReference: `log-${randomUUID()}`,
      error: null,
    }));
  },

  parseDeliveryReport(body) {
    const reports = (body as { reports?: unknown } | null)?.reports;
    if (!Array.isArray(reports)) throw new Error('Delivery report has no reports array.');
    return reports.flatMap(
      (report: { providerReference?: unknown; state?: unknown; error?: unknown }) =>
        typeof report?.providerReference === 'string' && STATES.has(report.state as DeliveryState)
          ? [
              {
                providerReference: report.providerReference,
                state: report.state as DeliveryState,
                error: typeof report.error === 'string' ? report.error.slice(0, 255) : null,
              },
            ]
          : [],
    );
  },
};

const DRIVERS: Record<typeof env.SMS_DRIVER, BulkSmsProvider> = { log: logProvider };

export const bulkSmsProvider: BulkSmsProvider = DRIVERS[env.SMS_DRIVER];
