import { DataSource } from 'typeorm';

import { dataSource } from '../config/database';
import { env } from '../config/env';

export interface DatabaseStartup {
  created: boolean;
  appliedMigrations: string[];
  hasPendingMigrations: boolean;
}

// Connects to the built-in "postgres" database and creates DB_NAME if it does not exist.
// The DB_USERNAME role needs CREATEDB; otherwise run scripts/create_database.sql once instead.
async function ensureDatabaseExists(): Promise<boolean> {
  const admin = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: 'postgres',
    ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
  });

  await admin.initialize();
  try {
    const rows: unknown[] = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      env.DB_NAME,
    ]);
    if (rows.length > 0) return false;

    await admin.query(`CREATE DATABASE "${env.DB_NAME}" ENCODING 'UTF8' TEMPLATE template0`);
    return true;
  } finally {
    await admin.destroy();
  }
}

// Used on boot by the API and the CLI. Reports what happened; the caller decides what to log.
export async function initializeDatabase(): Promise<DatabaseStartup> {
  const created = env.DB_AUTO_CREATE ? await ensureDatabaseExists() : false;

  await dataSource.initialize();

  if (env.DB_AUTO_MIGRATE) {
    const applied = await dataSource.runMigrations({ transaction: 'each' });
    return { created, appliedMigrations: applied.map((m) => m.name), hasPendingMigrations: false };
  }

  return {
    created,
    appliedMigrations: [],
    hasPendingMigrations: await dataSource.showMigrations(),
  };
}
