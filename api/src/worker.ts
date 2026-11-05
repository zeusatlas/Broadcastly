import 'reflect-metadata';

import type { Worker } from 'bullmq';

import { dataSource } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectRedis, redis } from './config/redis';
import {
  databaseAddress,
  redisAddress,
  reportStartupFailure,
  startupStep,
  warnAboutTestDrivers,
} from './config/startup';
import { closeQueues } from './jobs/queues';
import { createSmsDispatchWorker } from './modules/broadcasts';
import { createMemberImportWorker } from './modules/members';

// Separate process from the API so a slow import or SMS burst never blocks HTTP requests
// (NFR-PERF-01). Scale workers independently of the API.
//
// Each module exports a factory that creates its Worker, e.g. from modules/broadcasts/jobs/:
//   createSmsDispatchWorker(redis)
// Register them in WORKERS below.
const WORKERS: Array<() => Worker> = [createSmsDispatchWorker, createMemberImportWorker];

async function main() {
  logger.info(`Starting Broadcastly API worker (${env.NODE_ENV})…`);
  warnAboutTestDrivers();

  // The worker never creates the database or runs migrations; the API owns that.
  await startupStep('PostgreSQL', () => dataSource.initialize());
  logger.info(`Database connected: "${env.DB_NAME}" on ${databaseAddress}`);

  await startupStep('Redis', connectRedis);
  logger.info(`Redis connected: ${redisAddress}`);

  const workers = WORKERS.map((create) => create());

  for (const worker of workers) {
    // Every failure is recorded for operational review (NFR-OBS-01, FR-NOT-04).
    worker.on('failed', (job, error) => {
      logger.error({ queue: worker.name, jobId: job?.id, err: error }, 'Job failed');
    });
  }

  logger.info(`Worker ready: ${workers.length} queue worker(s) running`);

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Worker shutting down…`);
    // close() waits for the current job, so a send is never abandoned half-way.
    await Promise.allSettled(workers.map((worker) => worker.close()));
    await closeQueues();
    await Promise.allSettled([dataSource.destroy(), redis.quit()]);
    logger.info('Worker stopped');
    process.exit(0);
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

main().catch(async (error: unknown) => {
  reportStartupFailure('Worker', error);
  await Promise.allSettled([
    dataSource.isInitialized ? dataSource.destroy() : undefined,
    redis.quit(),
  ]);
  process.exit(1);
});
