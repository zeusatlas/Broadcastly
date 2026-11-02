import 'reflect-metadata';

import path from 'node:path';

import { DataSource } from 'typeorm';

import { env } from './env';

// TypeORM 1.x. Do not copy 0.3 patterns from older projects: no global getRepository(),
// no Connection, no findOneById, no TYPEORM_* env vars. Use dataSource.getRepository(Entity).
export const dataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
  applicationName: 'broadcastly-api',
  // gen_random_uuid() from pgcrypto, a trusted extension the database owner may create.
  uuidExtension: 'pgcrypto',
  // Schema changes only through reviewed migrations. synchronize can silently drop columns.
  synchronize: false,
  migrationsRun: false,
  logging: env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'trace' ? ['error', 'warn'] : ['error'],
  entities: [path.join(__dirname, '../modules/**/entities/*_entity.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/*.{ts,js}')],
  migrationsTableName: 'schema_migrations',
  // A runaway query or a transaction left open cannot hold a connection or row locks forever.
  // Raise statement_timeout per query (SET LOCAL) for long jobs instead of here.
  extra: { max: 20, statement_timeout: 15_000, idle_in_transaction_session_timeout: 30_000 },
});
