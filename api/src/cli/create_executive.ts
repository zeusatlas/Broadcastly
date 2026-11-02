import 'reflect-metadata';

import { createInterface } from 'node:readline/promises';

import { dataSource } from '../config/database';
import { initializeDatabase } from '../database/initialize_database';
import { authService, createExecutiveSchema, USER_ROLES } from '../modules/auth';

// `npm run executive:create` — creates an executive account from the terminal, e.g. the first
// chairman or platform admin, before any admin endpoint exists. They sign in with email + phone.

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

const print = (line = '') => process.stdout.write(`${line}\n`);
const ask = async (label: string) => (await rl.question(`${label}: `)).trim() || undefined;

async function main() {
  print('Create an executive account\n');
  USER_ROLES.forEach((role, index) => print(`  ${index + 1}. ${role}`));
  const roleChoice = Number(await ask('\nRole number'));

  const input = {
    role: USER_ROLES[roleChoice - 1],
    firstName: await ask('First name'),
    middleName: await ask('Middle name (optional)'),
    lastName: await ask('Last name'),
    partyId: await ask('Party ID (optional)'),
    email: await ask('Email'),
    phone: await ask('Phone number (e.g. 0241234567)'),
    dateOfBirth: await ask('Date of birth (YYYY-MM-DD)'),
  };

  const parsed = createExecutiveSchema.safeParse(input);
  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => print(`  ${issue.path.join('.')}: ${issue.message}`));
    process.exitCode = 1;
    return;
  }

  await initializeDatabase();
  const { executiveId } = await authService.createExecutive(parsed.data);
  print(`\nAccount created: ${executiveId}`);
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
