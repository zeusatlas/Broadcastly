import path from 'node:path';

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { errorHandler } from './common/middleware/error_handler';
import { notFound } from './common/middleware/not_found';
import { apiRateLimit } from './common/middleware/rate_limit';
import { generateRequestId } from './common/middleware/request_id';
import { env, isTest } from './config/env';
import { logger } from './config/logger';
import { mountApiDocs } from './config/api_docs';
import { apiRouter } from './routes';

// Order matters: identify → log → secure → limit → parse → route → 404 → errors.
export function createApp(): Express {
  const app = express();

  // Behind one reverse proxy (TLS termination, NFR-SEC-01) so req.ip is the real client.
  app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      logger,
      genReqId: generateRequestId,
      autoLogging: !isTest,
      // Only method, URL and status: bodies hold member personal data (NFR-PRIV-01).
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  app.use(helmet());
  // Uploaded images (organisation logos) under random names; cross-origin so the web app can show them.
  app.use(
    '/uploads',
    express.static(path.resolve(env.UPLOADS_DIR), {
      index: false,
      dotfiles: 'deny',
      maxAge: '7d',
      setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: false }));
  app.use('/api', apiRateLimit);
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1', apiRouter);

  if (env.API_DOCS_ENABLED) mountApiDocs(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
