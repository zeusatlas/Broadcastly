import { dataSource } from '../../config/database';
import { redis } from '../../config/redis';

import type { DependencyStatus, HealthResponse } from './health_types';

async function check(probe: () => Promise<unknown>): Promise<DependencyStatus> {
  try {
    await probe();
    return 'up';
  } catch {
    return 'down';
  }
}

export const healthService = {
  async getHealth(): Promise<HealthResponse> {
    const [database, cache] = await Promise.all([
      check(() => dataSource.query('SELECT 1')),
      check(() => redis.ping()),
    ]);

    return { uptimeSeconds: Math.round(process.uptime()), database, redis: cache };
  },
};
