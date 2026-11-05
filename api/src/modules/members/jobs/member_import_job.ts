import { Worker } from 'bullmq';

import { redis } from '../../../config/redis';
import { QUEUE_NAMES } from '../../../jobs/queues';
import {
  memberImportService,
  type ConfirmJobData,
  type ParseJobData,
} from '../member_import_service';

// Two job kinds on one queue: 'parse' checks an uploaded file, 'confirm' saves the accepted rows.
// Both re-check the import's status first, so a retry or a duplicate job does nothing twice.
export function createMemberImportWorker(): Worker {
  return new Worker(
    QUEUE_NAMES.memberImports,
    async (job) => {
      if (job.name === 'parse') {
        const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        await memberImportService.parse(job.data as ParseJobData, isLastAttempt);
      } else if (job.name === 'confirm') {
        await memberImportService.apply(job.data as ConfirmJobData);
      }
    },
    { connection: redis, concurrency: 2 },
  );
}
