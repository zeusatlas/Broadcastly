import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApp } from '../src/app';
import { errorHandler } from '../src/common/middleware/error_handler';
import { validate } from '../src/common/middleware/validate';
import { sendSuccess } from '../src/common/http/respond';
import { authenticate } from '../src/modules/auth';

// These pin the wire contract the mobile app depends on (mobile-ui/src/types/api/api_response.ts).

function appWith(register: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());
  register(app);
  app.use(errorHandler);
  return app;
}

describe('response envelope', () => {
  it('wraps success as { status, status_code, message, data }', async () => {
    const app = appWith((a) => a.get('/x', (_req, res) => sendSuccess(res, { data: { id: '1' } })));

    const res = await request(app).get('/x');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      status_code: 200,
      message: 'Request successful.',
      data: { id: '1' },
    });
  });

  it('omits data when there is none', async () => {
    const app = appWith((a) => a.post('/x', (_req, res) => sendSuccess(res, { message: 'Done.' })));

    const res = await request(app).post('/x');

    expect(res.body).toEqual({ status: 'success', status_code: 200, message: 'Done.' });
  });

  it('answers unknown routes with the error envelope', async () => {
    const res = await request(createApp()).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 'error', status_code: 404, errors: {} });
    expect(typeof res.body.message).toBe('string');
  });
});

describe('api docs', () => {
  it('generates OpenAPI from the routes modules register', async () => {
    const res = await request(createApp()).get('/api/docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.paths).toHaveProperty('/health');
  });

  it('serves an endpoint-free overview as the landing definition, and v1 with the endpoints', async () => {
    const app = createApp();
    const overview = await request(app).get('/api/docs/overview.json');
    const v1 = await request(app).get('/api/docs/v1.json');

    expect(overview.body.info.title).toBe('Broadcastly API');
    expect(overview.body.paths).toEqual({});
    expect(v1.body.paths).toHaveProperty('/auth/login');
    expect(v1.body.servers).toEqual([{ url: '/api/v1' }]);
  });
});

describe('validation errors', () => {
  const schema = z.object({ email: z.email(), name: z.string().min(2) });

  it('returns 422 with messages keyed by field', async () => {
    const app = appWith((a) =>
      a.post('/x', validate({ body: schema }), (_req, res) => sendSuccess(res)),
    );

    const res = await request(app).post('/x').send({ email: 'nope', name: 'a' });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(Object.keys(res.body.errors).sort()).toEqual(['email', 'name']);
    expect(Array.isArray(res.body.errors.email)).toBe(true);
  });

  it('rejects malformed JSON without leaking parser details', async () => {
    const app = appWith(() => {});

    const res = await request(app)
      .post('/x')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('The request body is not valid JSON.');
  });
});

describe('server errors', () => {
  it('never exposes the internal error message', async () => {
    const app = appWith((a) =>
      a.get('/x', () => {
        throw new Error('relation "members" does not exist');
      }),
    );

    const res = await request(app).get('/x');

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('members');
  });
});

describe('authenticate', () => {
  const app = appWith((a) => a.get('/private', authenticate, (_req, res) => sendSuccess(res)));

  it('rejects a request without a bearer token', async () => {
    const res = await request(app).get('/private');

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
  });

  it('rejects a forged token', async () => {
    const res = await request(app).get('/private').set('Authorization', 'Bearer not.a.jwt');

    expect(res.status).toBe(401);
  });
});
