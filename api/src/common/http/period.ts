import { z } from 'zod';

// Date windows for history lists. Rolling windows end now; Ghana is UTC+0, so UTC days match local days.
export const PERIODS = [
  'today',
  'yesterday',
  'last_3_days',
  'last_7_days',
  'last_30_days',
  'last_365_days',
  'all_time',
  'custom',
] as const;
export type Period = (typeof PERIODS)[number];

export interface PeriodParams {
  period: Period;
  // Calendar dates (YYYY-MM-DD), both inclusive; used only with period=custom.
  from?: string;
  to?: string;
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const ROLLING_DAYS: Partial<Record<Period, number>> = {
  last_3_days: 3,
  last_7_days: 7,
  last_30_days: 30,
  last_365_days: 365,
};

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export function resolvePeriod({ period, from, to }: PeriodParams, now = new Date()): DateRange {
  const today = startOfUtcDay(now);
  const rolling = ROLLING_DAYS[period];

  if (rolling) return { from: new Date(now.getTime() - rolling * DAY_MS), to: null };
  switch (period) {
    case 'today':
      return { from: today, to: null };
    case 'yesterday':
      return { from: new Date(today.getTime() - DAY_MS), to: today };
    case 'custom':
      return {
        from: from ? new Date(`${from}T00:00:00.000Z`) : null,
        to: to ? new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS) : null,
      };
    default:
      return { from: null, to: null };
  }
}

const calendarDate = z.iso.date('Use a date like 2026-11-03.');

export const periodQueryShape = {
  period: z.enum(PERIODS).default('all_time'),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
};

// Shared refinement for any schema extended with periodQueryShape.
export function checkPeriod(value: PeriodParams, ctx: z.RefinementCtx) {
  if (value.period !== 'custom') return;
  if (!value.from && !value.to) {
    ctx.addIssue({ code: 'custom', path: ['from'], message: 'Choose a start or end date.' });
  }
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({ code: 'custom', path: ['to'], message: 'The end date is before the start date.' });
  }
}
