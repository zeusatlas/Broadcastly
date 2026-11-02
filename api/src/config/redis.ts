import { Redis } from 'ioredis';

import { env } from './env';
import { logger } from './logger';

// One connection shared by every queue producer and worker in a process.
// BullMQ workers require maxRetriesPerRequest: null so they keep processing through reconnects.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// ioredis retries forever and emits an error per attempt; log the outage once, not every retry.
let connected = false;
let outage = false;
redis.on('error', (error: Error & { code?: string }) => {
  if (!connected || outage) return;
  outage = true;
  logger.warn(
    `Redis connection lost (${error.code ?? error.message}). Retrying in the background…`,
  );
});
redis.on('ready', () => {
  if (!outage) return;
  outage = false;
  logger.info('Redis reconnected');
});

// connect() only reports "Connection is closed.", so the real cause (e.g. ECONNREFUSED) is
// taken from the error event. On failure the retry loop is stopped so the process can exit.
export async function connectRedis(): Promise<void> {
  let lastError: Error | undefined;
  const capture = (error: Error) => (lastError = error);
  redis.on('error', capture);

  try {
    await redis.connect();
    connected = true;
  } catch (error) {
    redis.disconnect();
    throw lastError ?? error;
  } finally {
    redis.off('error', capture);
  }
}
