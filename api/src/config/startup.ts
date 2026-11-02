import type { DatabaseStartup } from '../database/initialize_database';

import { env } from './env';
import { logger } from './logger';

// Turns boot failures into one plain sentence that says what to fix, instead of a stack trace.
// Used by both entry points (server.ts, worker.ts).

export type StartupService = 'PostgreSQL' | 'Redis' | 'HTTP server';

export const databaseAddress = `${env.DB_HOST}:${env.DB_PORT}`;
export const redisAddress = new URL(env.REDIS_URL).host;

interface ErrorWithCode {
  code?: string;
  message?: string;
  errors?: ErrorWithCode[];
  driverError?: ErrorWithCode;
}

// Refused connections arrive as an AggregateError (IPv4 + IPv6 attempts) with an empty message;
// TypeORM query failures keep the PostgreSQL code on driverError.
function errorCode(error: unknown): string | undefined {
  const value = error as ErrorWithCode | undefined;
  return value?.code ?? value?.driverError?.code ?? value?.errors?.[0]?.code;
}

type Hint = string | ((detail: string) => string);

const HINTS: Record<StartupService, Record<string, Hint>> = {
  PostgreSQL: {
    ECONNREFUSED: `Cannot reach PostgreSQL at ${databaseAddress}. Make sure it is running and DB_HOST/DB_PORT in .env are correct.`,
    ENOTFOUND: `Cannot find the database host "${env.DB_HOST}". Check DB_HOST in .env.`,
    ETIMEDOUT: `Timed out connecting to PostgreSQL at ${databaseAddress}. Check the host, port and firewall.`,
    '28P01': `PostgreSQL rejected the login for user "${env.DB_USERNAME}". Check DB_USERNAME and DB_PASSWORD in .env.`,
    '3D000': `Database "${env.DB_NAME}" does not exist. Set DB_AUTO_CREATE=true in .env, or run scripts/create_database.sql.`,
    '42501': (detail) =>
      `PostgreSQL user "${env.DB_USERNAME}" lacks a privilege (${detail}). Run scripts/create_database.sql as the postgres superuser.`,
  },
  Redis: {
    ECONNREFUSED: `Cannot reach Redis at ${redisAddress}. Start it with "npm run services:up" (Docker Desktop must be running).`,
    ENOTFOUND: `Cannot find the Redis host in REDIS_URL (${redisAddress}). Check REDIS_URL in .env.`,
    ETIMEDOUT: `Timed out connecting to Redis at ${redisAddress}. Check REDIS_URL in .env.`,
  },
  'HTTP server': {
    EADDRINUSE: `Port ${env.PORT} is already in use. Stop the other process or change PORT in .env.`,
    EACCES: `Not allowed to listen on port ${env.PORT}. Choose a port above 1024 in .env.`,
  },
};

export class StartupError extends Error {
  readonly known: boolean;

  constructor(service: StartupService, cause: unknown) {
    const detail = (cause as ErrorWithCode | undefined)?.message || String(cause);
    const hint = HINTS[service][errorCode(cause) ?? ''];
    const message = typeof hint === 'function' ? hint(detail) : hint;
    super(message ?? `${service}: ${detail}`, { cause });
    this.known = hint !== undefined;
  }
}

// Wraps one boot step so a failure is reported against the service that caused it.
export async function startupStep<T>(service: StartupService, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw new StartupError(service, error);
  }
}

export function logDatabaseStartup(result: DatabaseStartup): void {
  if (result.created) logger.info(`Database "${env.DB_NAME}" did not exist, so it was created`);
  logger.info(`Database connected: "${env.DB_NAME}" on ${databaseAddress}`);

  const applied = result.appliedMigrations;
  if (applied.length > 0) {
    logger.info(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
  } else if (result.hasPendingMigrations) {
    logger.warn(
      'Pending migrations found. Run "npm run migration:run" or set DB_AUTO_MIGRATE=true',
    );
  } else {
    logger.info('Database schema is up to date');
  }
}

// Known problems get one line. Unknown ones also get the stack, which is what you need to debug them.
export function reportStartupFailure(processName: string, error: unknown): void {
  if (error instanceof StartupError && error.known) {
    logger.fatal(`${processName} failed to start: ${error.message}`);
  } else {
    logger.fatal({ err: error }, `${processName} failed to start: ${(error as Error).message}`);
  }
}
