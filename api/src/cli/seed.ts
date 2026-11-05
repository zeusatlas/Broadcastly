import 'reflect-metadata';

import { dataSource } from '../config/database';
import { isProduction } from '../config/env';
import { initializeDatabase } from '../database/initialize_database';
import { type Permission, authService, createPlatformAdminSchema } from '../modules/auth';
import { Broadcast } from '../modules/broadcasts';
import { ledgerService } from '../modules/credits';
import { Member } from '../modules/members';
import { organisationService } from '../modules/organisation';
import { appointChairmanSchema, platformService } from '../modules/platform';

// Development fixtures only. Every operation is idempotent so this can be run after migrations.

const ADMIN = createPlatformAdminSchema.parse({
  firstName: 'Ama',
  lastName: 'Owusu',
  email: 'admin.test@example.com',
  phone: '0201234567',
});

const SEEDER = {};
const print = (line = '') => process.stdout.write(`${line}\n`);
const pad = (value: number) => String(value).padStart(3, '0');
// Valid Ghana numbers (+233 then 9 digits), unique per organisation and per member.
const seedPhone = (prefix: string, slug: string, index: number) =>
  `+233${prefix}${slug === 'zeus' ? '1' : '2'}${String(index).padStart(6, '0')}`;
const executivePhone = (slug: string, index: number) => seedPhone('25', slug, index);

const FIRST_NAMES = [
  'Amina',
  'Daniel',
  'Esi',
  'Felix',
  'Grace',
  'Hannah',
  'Isaac',
  'Joana',
  'Kofi',
  'Lydia',
  'Michael',
  'Nana',
  'Osei',
  'Patricia',
  'Rita',
  'Samuel',
  'Theresa',
  'Victor',
  'Wendy',
  'Yaw',
];

interface ExecutiveFixture {
  emailName: string;
  firstName: string;
  lastName: string;
  memberIndex: number;
  positionTitle: string;
  unitType: string;
  unitName: string | null;
  permissions: Permission[];
  creditBalance: number;
}

interface OrganisationFixture {
  name: string;
  aliases?: string[];
  slug: string;
  headTitle: string;
  headCreditBalance: number;
  memberCount: number;
  broadcastCount: number;
  organisationCreditBalance: number;
  executives: ExecutiveFixture[];
}

const ORGANISATIONS: OrganisationFixture[] = [
  {
    name: 'Zeus Constituency',
    aliases: ['Zeus Atlas Ltd'],
    slug: 'zeus',
    headTitle: 'Head',
    headCreditBalance: 1200,
    memberCount: 30,
    broadcastCount: 20,
    organisationCreditBalance: 8000,
    executives: [
      {
        emailName: 'sec',
        firstName: 'Sarah',
        lastName: 'Mensah',
        memberIndex: 1,
        positionTitle: 'Secretary',
        unitType: 'organisation',
        unitName: null,
        permissions: ['broadcast.draft', 'broadcast.submit', 'broadcast.select_recipients', 'report.view'],
        creditBalance: 1000,
      },
      {
        emailName: 'hr',
        firstName: 'Henry',
        lastName: 'Owusu',
        memberIndex: 2,
        positionTitle: 'HR Officer',
        unitType: 'branch',
        unitName: 'North Branch',
        permissions: ['member.manage', 'member.import', 'report.view'],
        creditBalance: 850,
      },
      {
        emailName: 'compliance',
        firstName: 'Clara',
        lastName: 'Boateng',
        memberIndex: 3,
        positionTitle: 'Compliance Officer',
        unitType: 'electoral_area',
        unitName: 'North Electoral Area',
        permissions: ['broadcast.approve', 'report.view'],
        creditBalance: 700,
      },
      {
        emailName: 'organizer',
        firstName: 'Oliver',
        lastName: 'Addo',
        memberIndex: 4,
        positionTitle: 'Organizer',
        unitType: 'branch',
        unitName: 'South Branch',
        permissions: ['broadcast.draft', 'broadcast.select_recipients', 'report.view'],
        creditBalance: 600,
      },
    ],
  },
  {
    name: 'Xolace Organisation',
    aliases: ['Xolace Inc'],
    slug: 'xolace',
    headTitle: 'Head',
    headCreditBalance: 1500,
    memberCount: 20,
    broadcastCount: 10,
    organisationCreditBalance: 5500,
    executives: [
      {
        emailName: 'cto',
        firstName: 'Caleb',
        lastName: 'Asare',
        memberIndex: 1,
        positionTitle: 'CTO',
        unitType: 'organisation',
        unitName: null,
        permissions: ['report.view', 'broadcast.draft'],
        creditBalance: 1100,
      },
      {
        emailName: 'coo',
        firstName: 'Olivia',
        lastName: 'Darko',
        memberIndex: 2,
        positionTitle: 'COO',
        unitType: 'branch',
        unitName: 'Operations Branch',
        permissions: ['member.manage', 'report.view'],
        creditBalance: 900,
      },
      {
        emailName: 'ceo',
        firstName: 'Emmanuel',
        lastName: 'Kusi',
        memberIndex: 3,
        positionTitle: 'CEO',
        unitType: 'organisation',
        unitName: null,
        permissions: ['broadcast.draft', 'broadcast.submit', 'report.view'],
        creditBalance: 1300,
      },
      {
        emailName: 'cmo',
        firstName: 'Martha',
        lastName: 'Adjei',
        memberIndex: 4,
        positionTitle: 'CMO',
        unitType: 'branch',
        unitName: 'Communications Branch',
        permissions: ['broadcast.draft', 'broadcast.select_recipients', 'report.view'],
        creditBalance: 750,
      },
      {
        emailName: 'ambassador',
        firstName: 'Abena',
        lastName: 'Frimpong',
        memberIndex: 5,
        positionTitle: 'Ambassador',
        unitType: 'electoral_area',
        unitName: 'Central Electoral Area',
        permissions: ['report.view'],
        creditBalance: 500,
      },
      {
        emailName: 'hello',
        firstName: 'Helen',
        lastName: 'Owusu',
        memberIndex: 6,
        positionTitle: 'Hello Desk Officer',
        unitType: 'branch',
        unitName: 'Operations Branch',
        permissions: ['member.manage'],
        creditBalance: 350,
      },
      {
        emailName: 'support',
        firstName: 'Seth',
        lastName: 'Badu',
        memberIndex: 7,
        positionTitle: 'Support Officer',
        unitType: 'branch',
        unitName: 'Communications Branch',
        permissions: ['report.view'],
        creditBalance: 250,
      },
    ],
  },
];

async function seedAdmin() {
  const { items } = await platformService.listPlatformAdmins({ page: 1, pageSize: 100 });
  const exists = items.some((admin) => admin.email === ADMIN.email);
  if (!exists) await platformService.createPlatformAdmin(ADMIN, SEEDER);
  print(`  Platform admin: ${exists ? 'exists' : 'created'}`);
}

async function ensureMembers(organisationId: string, fixture: OrganisationFixture) {
  const repository = dataSource.getRepository(Member);
  for (let index = 1; index <= fixture.memberCount; index += 1) {
    const partyId = `${fixture.slug.toUpperCase()}-${pad(index)}`;
    const phone = seedPhone('24', fixture.slug, index);
    const existing = await repository.findOneBy({ organisationId, partyId });
    if (existing) {
      if (existing.phone !== phone && !fixture.executives.some((e) => e.memberIndex === index)) {
        await repository.update({ id: existing.id }, { phone });
      }
      continue;
    }
    const firstName = FIRST_NAMES[(index - 1) % FIRST_NAMES.length];
    await repository.save(
      repository.create({
        organisationId,
        firstName,
        middleName: null,
        lastName: `${fixture.slug === 'zeus' ? 'Member' : 'Associate'} ${pad(index)}`,
        partyId,
        phone,
        dateOfBirth: `198${index % 10}-0${(index % 9) + 1}-15`,
      }),
    );
  }
  for (const executive of fixture.executives) {
    const partyId = `${fixture.slug.toUpperCase()}-${pad(executive.memberIndex)}`;
    const member = await repository.findOneBy({ organisationId, partyId });
    if (!member) throw new Error(`Seed member ${partyId} was not created.`);
    member.firstName = executive.firstName;
    member.lastName = executive.lastName;
    member.phone = executivePhone(fixture.slug, executive.memberIndex);
    member.dateOfBirth = '1988-04-20';
    await repository.save(member);
  }
  print(`  Members: ${fixture.memberCount} ready`);
}

// Spreads members without a unit across the organisation's units, so unit broadcasts have recipients.
async function ensureMemberships(organisationId: string) {
  await dataSource.query(
    `WITH units AS (
       SELECT id, row_number() OVER (ORDER BY name) - 1 AS slot, count(*) OVER () AS total
         FROM organisation_units WHERE organisation_id = $1 AND status = 'active'),
     loose AS (
       SELECT m.id, row_number() OVER (ORDER BY m.party_id, m.id) - 1 AS n FROM members m
        WHERE m.organisation_id = $1
          AND NOT EXISTS (SELECT 1 FROM memberships ms WHERE ms.member_id = m.id AND ms.status = 'active'))
     INSERT INTO memberships (organisation_id, member_id, unit_id, source)
     SELECT $1, loose.id, units.id, 'manual' FROM loose JOIN units ON units.slot = loose.n % units.total`,
    [organisationId],
  );
}

async function ensureUnit(organisationId: string, name: string, type: string, parentId: string | null) {
  const [existing] = (await dataSource.query(
    `SELECT id FROM organisation_units WHERE organisation_id = $1 AND name = $2`,
    [organisationId, name],
  )) as Array<{ id: string }>;
  if (existing) return existing.id;
  return dataSource.transaction(async (manager) => {
    const unit = await organisationService.createUnit({ organisationId, name, type, parentId }, manager);
    return unit.id;
  });
}

async function ensurePosition(organisationId: string, title: string, unitType: string) {
  const [existing] = (await dataSource.query(
    `SELECT id FROM positions WHERE organisation_id = $1 AND lower(title) = lower($2)`,
    [organisationId, title],
  )) as Array<{ id: string }>;
  if (existing) return existing.id;
  return dataSource.transaction(async (manager) => {
    const position = await organisationService.createPosition({ organisationId, title, unitType }, manager);
    return position.id;
  });
}

async function ensureExecutive(
  organisationId: string,
  fixture: OrganisationFixture,
  executive: ExecutiveFixture,
) {
  const email = `${executive.emailName}.${fixture.slug}@example.com`;
  const [existing] = (await dataSource.query(
    `SELECT id FROM organisation_executives WHERE organisation_id = $1 AND email = $2`,
    [organisationId, email],
  )) as Array<{ id: string }>;
  if (existing) return existing.id;

  const result = await authService.createExecutive(
    {
      organisationId,
      partyId: `${fixture.slug.toUpperCase()}-${pad(executive.memberIndex)}`,
      firstName: executive.firstName,
      lastName: executive.lastName,
      email,
      phone: executivePhone(fixture.slug, executive.memberIndex),
      dateOfBirth: '1988-04-20',
    },
    SEEDER,
  );
  return result.executiveId;
}

async function seedExecutives(
  organisationId: string,
  chairmanId: string,
  fixture: OrganisationFixture,
) {
  const units = new Map<string, string>();
  for (const unit of [
    ['North Electoral Area', 'electoral_area'],
    ['North Branch', 'branch'],
    ['South Branch', 'branch'],
    ['Central Electoral Area', 'electoral_area'],
    ['Operations Branch', 'branch'],
    ['Communications Branch', 'branch'],
  ] as const) {
    units.set(unit[0], await ensureUnit(organisationId, unit[0], unit[1], null));
  }

  const executiveIds: Array<{ id: string; creditBalance: number }> = [
    { id: chairmanId, creditBalance: fixture.headCreditBalance },
  ];
  for (const executive of fixture.executives) {
    const executiveId = await ensureExecutive(organisationId, fixture, executive);
    const positionId = await ensurePosition(organisationId, executive.positionTitle, executive.unitType);
    const unitId = executive.unitName ? units.get(executive.unitName) ?? null : null;
    await dataSource.transaction(async (manager) => {
      const [appointment] = (await manager.query(
        `SELECT id FROM appointments WHERE organisation_id = $1 AND member_id =
           (SELECT member_id FROM organisation_executives WHERE id = $2)
           AND position_id = $3 AND unit_id IS NOT DISTINCT FROM $4::uuid AND status = 'active'`,
        [organisationId, executiveId, positionId, unitId],
      )) as Array<{ id: string }>;
      if (appointment) return;
      const [executiveRow] = (await manager.query(
        `SELECT id, member_id FROM organisation_executives WHERE id = $1`,
        [executiveId],
      )) as Array<{ id: string; member_id: string }>;
      if (!executiveRow) throw new Error(`Seed executive ${executiveId} was not found.`);
      const created = await organisationService.createAppointment(
        {
          memberId: executiveRow.member_id,
          positionId,
          organisationId,
          unitId,
          appointedByExecutiveId: chairmanId,
        },
        manager,
      );
      await organisationService.grantPermissions(created.id, executive.permissions, chairmanId, manager);
    });
    executiveIds.push({ id: executiveId, creditBalance: executive.creditBalance });
  }
  return executiveIds;
}

async function seedCredits(
  organisationId: string,
  chairmanId: string,
  executiveIds: Array<{ id: string; creditBalance: number }>,
  organisationBalance: number,
) {
  await dataSource.transaction(async (manager) => {
    const organisationWallet = await ledgerService.walletFor({ organisationId }, manager);
    await ledgerService.post(
      {
        walletId: organisationWallet.id,
        type: 'adjustment',
        amount: organisationBalance,
        idempotencyKey: `seed:organisation:${organisationId}`,
        reason: 'Development seed balance',
        initiatedByExecutiveId: chairmanId,
      },
      manager,
    );
    for (const executive of executiveIds) {
      const wallet = await ledgerService.walletFor({ organisationId, executiveId: executive.id }, manager);
      await ledgerService.post(
        {
          walletId: wallet.id,
          type: 'adjustment',
          amount: executive.creditBalance,
          idempotencyKey: `seed:executive:${executive.id}`,
          reason: 'Development seed balance',
          initiatedByExecutiveId: executive.id,
        },
        manager,
      );
    }
  });
  print(`  Credits: organisation ${organisationBalance.toLocaleString()} ready`);
}

async function seedBroadcasts(
  organisationId: string,
  executiveId: string,
  count: number,
  slug: string,
) {
  const repository = dataSource.getRepository(Broadcast);
  const statuses = ['completed', 'pending_approval', 'cancelled', 'draft', 'partially_failed'] as const;
  for (let index = 1; index <= count; index += 1) {
    const title = `${slug.toUpperCase()} development broadcast ${pad(index)}`;
    const existing = await repository.findOneBy({ organisationId, createdByExecutiveId: executiveId, title });
    if (existing) continue;
    const status = statuses[(index - 1) % statuses.length];
    const recipientCount = status === 'draft' ? 0 : 80 + index * 7;
    const deliveredCount = status === 'completed' ? recipientCount - 3 : status === 'partially_failed' ? recipientCount - 12 : 0;
    await repository.save(
      repository.create({
        organisationId,
        createdByExecutiveId: executiveId,
        title,
        message: `Development fixture ${index}: please review the latest ${slug} organisation update.`,
        status,
        audience: { level: 'constituency', developmentFixture: true },
        audienceSummary: 'Organisation-wide',
        recipientCount,
        segmentCount: 1,
        estimatedCredits: recipientCount,
        deliveredCount,
        failedCount: status === 'partially_failed' ? 12 : status === 'completed' ? 3 : 0,
        submittedCount: status === 'completed' || status === 'partially_failed' ? recipientCount : 0,
        scheduledAt: null,
        cancelledAt: status === 'cancelled' ? new Date(Date.now() - index * 3_600_000) : null,
        submittedAt: status === 'draft' ? null : new Date(Date.now() - index * 3_600_000),
        completedAt: status === 'completed' || status === 'partially_failed' ? new Date(Date.now() - index * 3_600_000) : null,
      }),
    );
  }
  print(`  Broadcasts: ${count} ready`);
}

const TEMPLATE_FIXTURES = [
  ['Monthly meeting', 'meeting_announcement', 'Dear {first_name}, our monthly meeting is on {meeting_date} at {meeting_location}.'],
  ['Official notice', 'official_notice', 'Dear {first_name}, please note this official notice from the executive.'],
  ['Meeting reminder', 'reminder', 'Reminder: the meeting is on {meeting_date} at {meeting_location}.'],
] as const;

async function seedTemplates(organisationId: string, executiveId: string) {
  await dataSource.query(
    `INSERT INTO message_templates
       (organisation_id, name, category, body, created_by_executive_id, updated_by_executive_id)
     SELECT $1::uuid, t.name, t.category::message_template_category, t.body, $2::uuid, $2::uuid
       FROM unnest($3::text[], $4::text[], $5::text[]) AS t(name, category, body)
     ON CONFLICT DO NOTHING`,
    [
      organisationId,
      executiveId,
      TEMPLATE_FIXTURES.map(([name]) => name),
      TEMPLATE_FIXTURES.map(([, category]) => category),
      TEMPLATE_FIXTURES.map(([, , body]) => body),
    ],
  );
  print(`  Templates: ${TEMPLATE_FIXTURES.length} ready`);
}

async function seedOrganisation(fixture: OrganisationFixture) {
  const names = [fixture.name, ...(fixture.aliases ?? [])].map((name) => name.toLowerCase());
  const [organisationRow] = (await dataSource.query(
    `SELECT id FROM organisations WHERE lower(name) = ANY($1::text[]) ORDER BY created_at LIMIT 1`,
    [names],
  )) as Array<{ id: string }>;
  const found = organisationRow ? await platformService.getOrganisation(organisationRow.id) : undefined;
  const organisation =
    found ?? (await platformService.createOrganisation({ name: fixture.name, type: 'constituency' }, SEEDER));

  const headEmail = `head.${fixture.slug}@example.com`;
  const [existingHead] = (await dataSource.query(
    `SELECT id FROM organisation_executives WHERE organisation_id = $1 AND email = $2`,
    [organisation.id, headEmail],
  )) as Array<{ id: string }>;
  if (!organisation.head && !existingHead) {
    await platformService.appointChairman(
      organisation.id,
      appointChairmanSchema.parse({
        firstName: `Head`,
        lastName: fixture.slug === 'zeus' ? 'Zeus' : 'Xolace',
        email: headEmail,
        phone: fixture.slug === 'zeus' ? '0247000001' : '0247000002',
        dateOfBirth: '1978-01-15',
      }),
      SEEDER,
    );
  }

  const [chairman] = (await dataSource.query(
    `SELECT id FROM organisation_executives WHERE organisation_id = $1 ORDER BY created_at LIMIT 1`,
    [organisation.id],
  )) as Array<{ id: string }>;
  if (!chairman) throw new Error(`Head account for ${fixture.name} was not found.`);
  await dataSource.transaction((manager) =>
    organisationService.setHeadTitle(organisation.id, fixture.headTitle, manager),
  );
  await ensureMembers(organisation.id, fixture);
  const executives = await seedExecutives(organisation.id, chairman.id, fixture);
  await ensureMemberships(organisation.id);
  await seedCredits(organisation.id, chairman.id, executives, fixture.organisationCreditBalance);
  await seedBroadcasts(organisation.id, chairman.id, fixture.broadcastCount, fixture.slug);
  await seedTemplates(organisation.id, chairman.id);
  print(`  ${fixture.name}: ready`);
}

async function main() {
  if (isProduction) throw new Error('Seeding is for development only.');
  await initializeDatabase();
  print('Seeding development data\n');
  await seedAdmin();
  for (const fixture of ORGANISATIONS) await seedOrganisation(fixture);
  print('\nDevelopment sign-in accounts:');
  print('  Platform admin: admin.test@example.com / 0201234567');
  print('  Zeus head:      head.zeus@example.com / 0247000001');
  print('  Xolace head:    head.xolace@example.com / 0247000002');
  for (const fixture of ORGANISATIONS) {
    print(`  ${fixture.name} executives:`);
    for (const executive of fixture.executives) {
      print(`    ${executive.emailName}.${fixture.slug}@example.com / ${executivePhone(fixture.slug, executive.memberIndex)}`);
    }
  }
}

main()
  .catch((error: unknown) => {
    print(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });
