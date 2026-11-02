import { env } from '../../config/env';
import { logger } from '../../config/logger';

// Transactional SMS (sign-in codes), sent at once. Bulk broadcasts use sms_provider.ts via the
// dispatch queue. A real gateway driver implements SmsSender and is selected by SMS_DRIVER.
export interface SmsSender {
  send(to: string, body: string): Promise<void>;
}

// Development only (env.ts forbids it in production): the message, code included, goes to the log.
const logSender: SmsSender = {
  async send(to, body) {
    logger.info(`SMS to …${to.slice(-4)} (not sent, SMS_DRIVER=log): ${body}`);
  },
};

const DRIVERS: Record<typeof env.SMS_DRIVER, SmsSender> = { log: logSender };

export const smsSender: SmsSender = DRIVERS[env.SMS_DRIVER];
