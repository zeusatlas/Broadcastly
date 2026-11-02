import { randomUUID } from 'node:crypto';

import type { IncomingMessage, ServerResponse } from 'node:http';

const HEADER = 'x-request-id';
const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

// Correlates one request across logs, jobs and support tickets. Reused by pino-http as req.id.
// A client-supplied id is accepted only if it is safe to echo into logs and headers.
export function generateRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[HEADER];
  const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(HEADER, id);

  return id;
}
