import 'reflect-metadata';

import { dataSource } from '../config/database';
import { isProduction } from '../config/env';
import { initializeDatabase } from '../database/initialize_database';
import { newExecutiveSchema, platformService } from '../modules/platform';

// `npm run seed` — development data, created through the same services the API uses:
// a platform admin (web) and a constituency with its chairman (mobile). Safe to re-run.

// Parsed like an API request, so phones are stored in E.164 and emails lowercased.
const ADMIN = newExecutiveSchema.parse({
  firstName: 'Ama',
  lastName: 'Owusu',
  email: 'admin.test@example.com',
  phone: '0201234567',
  dateOfBirth: '1985-06-10',
});
const CONSTITUENCY = 'Central Constituency';
const CHAIRMAN = newExecutiveSchema.parse({
  firstName: 'Kwame',
  lastName: 'Mensah',
  email: 'chairman.test@example.com',
  phone: '0241234567',
  dateOfBirth: '1980-01-15',
});

const SEEDER = { executiveId: null };
const print = (line = '') => process.stdout.write(`${line}\n`);

async function seedAdmin() {
  const { items } = await platformService.listPlatformAdmins({ page: 1, pageSize: 100 });
  const exists = items.some((admin) => admin.email === ADMIN.email);
  if (!exists) await platformService.createPlatformAdmin(ADMIN, SEEDER);
  print(`  Platform admin: ${exists ? 'exists' : 'created'}`);
}

async function seedConstituency() {
  const { items } = await platformService.listConstituencies({
    search: CONSTITUENCY,
    page: 1,
    pageSize: 100,
  });
  const found = items.find((unit) => unit.name.toLowerCase() === CONSTITUENCY.toLowerCase());
  print(`  Constituency: ${found ? 'exists' : 'created'}`);
  const constituency =
    found ?? (await platformService.createConstituency({ name: CONSTITUENCY }, SEEDER));

  if (!constituency.chairman)
    await platformService.appointChairman(constituency.id, CHAIRMAN, SEEDER);
  print(`  Chairman: ${constituency.chairman ? 'exists' : 'appointed'}`);
}

async function main() {
  if (isProduction) throw new Error('Seeding is for development only.');
  await initializeDatabase();
  print('Seeding development data\n');

  await seedAdmin();
  await seedConstituency();

  print('\nSign in (the code is printed in the API log):');
  print(`  Web, platform admin:  ${ADMIN.email} / 0201234567`);
  print(`  Mobile, chairman:     ${CHAIRMAN.email} / 0241234567`);
}

main()
  .catch((error: unknown) => {
    print(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });
