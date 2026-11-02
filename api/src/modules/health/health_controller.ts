import type { Request, Response } from 'express';

import { ServiceUnavailableError } from '../../common/errors/app_error';
import { sendSuccess } from '../../common/http/respond';

import { healthService } from './health_service';

// Controllers only translate HTTP <-> service calls. No business rules, no queries.
export const healthController = {
  async getHealth(_req: Request, res: Response) {
    const health = await healthService.getHealth();
    const isHealthy = health.database === 'up' && health.redis === 'up';

    // Load balancers read the status code, so a degraded dependency must be a 503.
    if (!isHealthy) throw new ServiceUnavailableError('A required service is unavailable.');

    return sendSuccess(res, { data: health, message: 'Service is healthy.' });
  },
};
