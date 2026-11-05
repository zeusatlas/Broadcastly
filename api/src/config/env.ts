import { existsSync } from 'node:fs';

import { z } from 'zod';

// Node 24 reads .env natively; no dotenv dependency. Real deployments inject variables directly.
if (existsSync('.env')) process.loadEnvFile('.env');

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),

    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    // Restricted to a plain identifier because it is interpolated into CREATE DATABASE.
    DB_NAME: z
      .string()
      .regex(/^[a-z_][a-z0-9_]{0,62}$/, 'DB_NAME must be lowercase letters, digits or _')
      .default('broadcastly'),
    DB_SSL: booleanString,
    DB_AUTO_CREATE: booleanString,
    DB_AUTO_MIGRATE: booleanString,

    REDIS_URL: z.url(),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    // A session ends this long after sign-in, however often it is refreshed.
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(24),
    JWT_ISSUER: z.string().default('broadcastly-api'),
    JWT_AUDIENCE: z.string().default('broadcastly-app'),

    API_DOCS_ENABLED: booleanString,

    // 'log' writes messages (sign-in codes included) to the console. Testing stand-in until a real
    // provider is connected (SRS §6.2); startup warns while it is in use (config/startup.ts).
    SMS_DRIVER: z.enum(['log']).default('log'),
    SMS_SEND_RATE_PER_SECOND: z.coerce.number().int().min(1).max(1_000).default(50),

    PUBLIC_BASE_URL: z.url().default('http://localhost:8000'),
    UPLOADS_DIR: z.string().min(1).default('uploads'),
    MEMBER_IMPORT_DIR: z.string().min(1).default('storage/member-imports'),
    MEMBER_IMPORT_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1024)
      .max(50 * 1024 * 1024)
      .default(5 * 1024 * 1024),
    MEMBER_IMPORT_MAX_ROWS: z.coerce.number().int().min(1).max(100_000).default(10_000),

    PAYMENT_DRIVER: z.enum(['simulate']).default('simulate'),
    CREDIT_PRICE_PESEWAS: z.coerce.number().int().positive().default(4),
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Runs before the logger exists, so it writes to stderr and exits. Only variable names are
    // printed, never their values (they may be secrets).
    const problems = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
    );
    process.stderr.write(
      `\nCannot start: the environment configuration is invalid.\n${problems.join('\n')}\n` +
        'Fix these in api/.env (compare with .env.example), then start again.\n\n',
    );
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
