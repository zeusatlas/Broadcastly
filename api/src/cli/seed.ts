import 'reflect-metadata';

import { dataSource } from '../config/database';
import { isProduction } from '../config/env';
import { initializeDatabase } from '../database/initialize_database';
import { createPlatformAdminSchema } from '../modules/auth';
import { appointChairmanSchema, platformService } from '../modules/platform';

// `npm run seed` — development data through the same services the API uses: a platform admin
// (web and mobile) and an organisation with its chairman (mobile). Safe to re-run.

// Parsed like API requests, so phones are stored in E.164 and emails lowercased.
const ADMIN = createPlatformAdminSchema.parse({
  firstName: 'Ama',
  lastName: 'Owusu',
  email: 'admin.test@example.com',
  phone: '0201234567',
});
const ORGANISATION = 'Central Constituency';
const CHAIRMAN = appointChairmanSchema.parse({
  firstName: 'Kwame',
  lastName: 'Mensah',
  email: 'chairman.test@example.com',
  phone: '0241234567',
  dateOfBirth: '1980-01-15',
});

const SEEDER = {};
const print = (line = '') => process.stdout.write(`${line}\n`);

async function seedAdmin() {
  const { items } = await platformService.listPlatformAdmins({ page: 1, pageSize: 100 });
  const exists = items.some((admin) => admin.email === ADMIN.email);
  if (!exists) await platformService.createPlatformAdmin(ADMIN, SEEDER);
  print(`  Platform admin: ${exists ? 'exists' : 'created'}`);
}

async function seedOrganisation() {
  const { items } = await platformService.listOrganisations({
    search: ORGANISATION,
    page: 1,
    pageSize: 100,
  });
  const found = items.find((org) => org.name.toLowerCase() === ORGANISATION.toLowerCase());
  print(`  Organisation: ${found ? 'exists' : 'created'}`);
  const organisation =
    found ??
    (await platformService.createOrganisation(
      { name: ORGANISATION, type: 'constituency' },
      SEEDER,
    ));

  if (!organisation.head) {
    await platformService.appointChairman(organisation.id, CHAIRMAN, SEEDER);
  }
  print(`  Head: ${organisation.head ? 'exists' : 'appointed'}`);
}

async function main() {
  if (isProduction) throw new Error('Seeding is for development only.');
  await initializeDatabase();
  print('Seeding development data\n');

  await seedAdmin();
  await seedOrganisation();

  print('\nSign in (the code is printed in the API log):');
  print(`  Platform admin (web or mobile): ${ADMIN.email} / 0201234567`);
  print(`  Chairman (mobile):              ${CHAIRMAN.email} / 0241234567`);
}

main()
  .catch((error: unknown) => {
    print(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });
