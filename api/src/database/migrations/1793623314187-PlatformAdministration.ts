import type { MigrationInterface, QueryRunner } from 'typeorm';

// Platform admins create constituencies and appoint one chairman to each.
const CHAIRMAN_POSITION_ID = '5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21';

export class PlatformAdministration1793623314187 implements MigrationInterface {
  name = 'PlatformAdministration1793623314187';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hand-written: the office every chairman holds, at a fixed id the code refers to.
    await queryRunner.query(
      `INSERT INTO "positions" ("id", "title", "unit_type") VALUES ($1, 'Constituency Chairman', 'constituency')
       ON CONFLICT ("id") DO NOTHING`,
      [CHAIRMAN_POSITION_ID],
    );
    // Hand-written: expression index (TypeORM cannot declare it), so names are unique ignoring case.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_organisational_units_constituency_name" ON "organisational_units" (lower("name")) WHERE "type" = 'constituency'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_appointments_active_chairman" ON "appointments"  ("unit_id") WHERE "status" = 'active' AND "position_id" = '${CHAIRMAN_POSITION_ID}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_appointments_active_chairman"`);
    await queryRunner.query(`DROP INDEX "public"."uq_organisational_units_constituency_name"`);
    // Fails while appointments still use it, which is the safe outcome (history is never deleted).
    await queryRunner.query(`DELETE FROM "positions" WHERE "id" = $1`, [CHAIRMAN_POSITION_ID]);
  }
}
