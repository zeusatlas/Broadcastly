import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { resolvePeriod } from '../src/common/http/period';
import { detectImageType } from '../src/common/uploads/image_upload';
import { listPurchasesSchema } from '../src/modules/credits';

// Pure logic and route protection only; the endpoint flows were run end to end against PostgreSQL
// on a throwaway database (see api/AGENTS.md §7c) until an integration test database exists.

const NOW = new Date('2026-11-03T15:30:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

describe('date periods', () => {
  it('today starts at UTC midnight and is open-ended', () => {
    expect(resolvePeriod({ period: 'today' }, NOW)).toEqual({
      from: new Date('2026-11-03T00:00:00.000Z'),
      to: null,
    });
  });

  it('yesterday is exactly the previous calendar day', () => {
    expect(resolvePeriod({ period: 'yesterday' }, NOW)).toEqual({
      from: new Date('2026-11-02T00:00:00.000Z'),
      to: new Date('2026-11-03T00:00:00.000Z'),
    });
  });

  it.each([
    ['last_3_days', 3],
    ['last_7_days', 7],
    ['last_30_days', 30],
    ['last_365_days', 365],
  ] as const)('%s is a rolling window ending now', (period, days) => {
    expect(resolvePeriod({ period }, NOW)).toEqual({
      from: new Date(NOW.getTime() - days * DAY),
      to: null,
    });
  });

  it('all_time has no bounds', () => {
    expect(resolvePeriod({ period: 'all_time' }, NOW)).toEqual({ from: null, to: null });
  });

  it('custom includes the whole end date', () => {
    expect(resolvePeriod({ period: 'custom', from: '2026-10-01', to: '2026-10-31' }, NOW)).toEqual(
      {
        from: new Date('2026-10-01T00:00:00.000Z'),
        to: new Date('2026-11-01T00:00:00.000Z'),
      },
    );
  });

  it('custom needs a date and a sane order', () => {
    const base = { page: '1', pageSize: '20', period: 'custom' };
    expect(listPurchasesSchema.safeParse(base).success).toBe(false);
    expect(
      listPurchasesSchema.safeParse({ ...base, from: '2026-11-02', to: '2026-11-01' }).success,
    ).toBe(false);
    expect(listPurchasesSchema.safeParse({ ...base, from: '2026-11-01' }).success).toBe(true);
  });
});

describe('image type detection', () => {
  it('recognises PNG, JPEG and WebP by their bytes', () => {
    expect(detectImageType(Buffer.from('89504e470d0a1a0a00000000', 'hex'))).toBe('image/png');
    expect(detectImageType(Buffer.from('ffd8ffe000104a4649460001', 'hex'))).toBe('image/jpeg');
    expect(detectImageType(Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBP', 'latin1'))).toBe(
      'image/webp',
    );
  });

  it('rejects anything else, whatever its name or label', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a......'))).toBeNull();
  });
});

describe('route protection', () => {
  const app = createApp();

  it.each([
    ['get', '/api/v1/credits/balance'],
    ['post', '/api/v1/credits/purchases'],
    ['get', '/api/v1/platform/broadcasts'],
    ['get', '/api/v1/platform/purchases'],
    ['get', '/api/v1/platform/audit-log'],
    ['get', '/api/v1/platform/credit-transactions'],
    ['post', '/api/v1/platform/credit-adjustments'],
    ['get', '/api/v1/platform/purchases/summary'],
    ['post', '/api/v1/platform/organisations/3f2c1a9e-6b7d-4e8f-9a0b-1c2d3e4f5a6b/suspend'],
    ['post', '/api/v1/platform/organisations/3f2c1a9e-6b7d-4e8f-9a0b-1c2d3e4f5a6b/logo'],
    ['post', '/api/v1/organisation/logo'],
  ] as const)('%s %s needs a session', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it('refuses a malformed payment webhook before touching the database', async () => {
    const res = await request(app).post('/api/v1/credits/payments/webhook').send({ amount: 5 });
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('This is not a valid payment notification.');
  });
});
