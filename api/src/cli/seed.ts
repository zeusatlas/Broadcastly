import 'reflect-metadata';

import { dataSource } from '../config/database';
import { isProduction } from '../config/env';
import { initializeDatabase } from '../database/initialize_database';
import { authService, createExecutiveSchema } from '../modules/auth';

// `npm run seed` — development data: one constituency chairman with an active appointment.
// Safe to re-run: each record is looked up first and only created when missing.

const CHAIRMAN = createExecutiveSchema.parse({
  role: 'constituency_chairman',
  firstName: 'Kwame',
  lastName: 'Mensah',
  email: 'chairman.test@example.com',
  phone: '0241234567',
  dateOfBirth: '1980-01-15',
});
const UNIT = { type: 'constituency', name: 'Central Constituency' };
const POSITION = { title: 'Constituency Chairman', unitType: 'constituency' };

const print = (line = '') => process.stdout.write(`${line}\n`);

// Entities are looked up by name: the CLI may only import modules through their index.ts.
async function findOrCreate(entity: string, where: Record<string, unknown>, label: string) {
  const repository = dataSource.getRepository(entity);
  const existing = await repository.findOneBy(where);
  print(`  ${label}: ${existing ? 'exists' : 'created'}`);
  return (existing ?? (await repository.save(repository.create(where)))) as { id: string };
}

async function main() {
  if (isProduction) throw new Error('Seeding is for development only.');
  await initializeDatabase();
  print('Seeding development data\n');

  const executives = dataSource.getRepository('Executive');
  let executive = (await executives.findOneBy({ email: CHAIRMAN.email })) as {
    id: string;
    memberId: string;
  } | null;
  print(`  Chairman account: ${executive ? 'exists' : 'created'}`);
  if (!executive) {
    const { executiveId, memberId } = await authService.createExecutive(CHAIRMAN);
    executive = { id: executiveId, memberId };
  }

  const unit = await findOrCreate('OrganisationalUnit', UNIT, 'Unit');
  const position = await findOrCreate('Position', POSITION, 'Position');

  const appointments = dataSource.getRepository('Appointment');
  const appointment = { memberId: executive.memberId, positionId: position.id, unitId: unit.id };
  const active = await appointments.existsBy({ ...appointment, status: 'active' });
  print(`  Appointment: ${active ? 'exists' : 'created'}`);
  if (!active)
    await appointments.save(appointments.create({ ...appointment, effectiveFrom: new Date() }));

  print(`\nSign in with ${CHAIRMAN.email} / 0241234567`);
}

main()
  .catch((error: unknown) => {
    print(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });
