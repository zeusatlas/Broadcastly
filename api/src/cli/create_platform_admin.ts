import 'reflect-metadata';

import { createInterface } from 'node:readline/promises';

import { dataSource } from '../config/database';
import { initializeDatabase } from '../database/initialize_database';
import { authService, createPlatformAdminSchema } from '../modules/auth';

// `npm run admin:create` — the first platform admin on a new server. After that, admins add
// each other from the web app.

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const print = (line = '') => process.stdout.write(`${line}\n`);
const ask = async (label: string) => (await rl.question(`${label}: `)).trim() || undefined;

async function main() {
  print('Create a platform admin\n');
  const parsed = createPlatformAdminSchema.safeParse({
    firstName: await ask('First name'),
    lastName: await ask('Last name'),
    email: await ask('Email'),
    phone: await ask('Phone number (e.g. 0241234567)'),
  });
  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => print(`  ${issue.path.join('.')}: ${issue.message}`));
    process.exitCode = 1;
    return;
  }

  await initializeDatabase();
  const admin = await authService.createPlatformAdmin(parsed.data, {}, { isSuperAdmin: true });
  print(`\nMain platform admin created (every permission): ${admin.id}`);
}

main()
  .catch((error: unknown) => {
    print(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    if (dataSource.isInitialized) await dataSource.destroy();
  });
