import { Worker } from 'bullmq';

import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { redis } from '../../../config/redis';
import { QUEUE_NAMES } from '../../../jobs/queues';
import { broadcastsService } from '../broadcasts_service';

// Sends one broadcast per job at the provider's rate (NFR-PERF-02). Safe to retry: rows already
// handed to the provider are never sent again (FR-SMS-14, BR-13).
export function createSmsDispatchWorker(): Worker {
  const worker = new Worker<{ broadcastId: string }>(
    QUEUE_NAMES.smsDispatch,
    (job) => broadcastsService.runDispatch(job.data.broadcastId, env.SMS_SEND_RATE_PER_SECOND),
    { connection: redis, concurrency: 2 },
  );
  broadcastsService
    .requeueOutstanding()
    .then((count) => count > 0 && logger.info(`Re-queued ${count} outstanding broadcast(s)`))
    .catch((error: unknown) =>
      logger.error({ err: error }, 'Could not re-queue outstanding broadcasts'),
    );
  return worker;
}
