import 'reflect-metadata';

import type { Server } from 'node:http';

import { createApp } from './app';
import { dataSource } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectRedis, redis } from './config/redis';
import {
  logDatabaseStartup,
  redisAddress,
  reportStartupFailure,
  startupStep,
  warnAboutTestDrivers,
} from './config/startup';
import { initializeDatabase } from './database/initialize_database';
import { closeQueues } from './jobs/queues';

const SHUTDOWN_TIMEOUT_MS = 15_000;

// Resolves once the port is bound, so "API ready" is only logged when it is really listening.
function listen(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createApp().listen(port);
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

async function main() {
  logger.info(`Starting Broadcastly API (${env.NODE_ENV}, Node ${process.version})…`);
  warnAboutTestDrivers();

  logDatabaseStartup(await startupStep('PostgreSQL', initializeDatabase));

  await startupStep('Redis', connectRedis);
  logger.info(`Redis connected: ${redisAddress}`);

  const server = await startupStep('HTTP server', () => listen(env.PORT));
  const baseUrl = `http://localhost:${env.PORT}`;
  logger.info(`API ready: ${baseUrl}/api/v1 (health check: ${baseUrl}/api/v1/health)`);
  if (env.API_DOCS_ENABLED) logger.info(`API docs: ${baseUrl}/api/docs`);

  // Finish in-flight requests, then release connections, so a deploy never cuts a send mid-way.
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down…`);
    setTimeout(() => {
      logger.error('Shutdown took too long; forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      await closeQueues();
      await Promise.allSettled([dataSource.destroy(), redis.quit()]);
      logger.info('API stopped');
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

main().catch(async (error: unknown) => {
  reportStartupFailure('API', error);
  await Promise.allSettled([
    dataSource.isInitialized ? dataSource.destroy() : undefined,
    redis.quit(),
  ]);
  process.exit(1);
});
