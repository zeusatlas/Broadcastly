import type { MigrationInterface, QueryRunner } from 'typeorm';

// Guarantees behind the chairman's tools; both use expressions TypeORM cannot declare.
export class ChairmanManagement1793640000000 implements MigrationInterface {
  name = 'ChairmanManagement1793640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_organisation_units_sibling_name" ON "organisation_units" ("organisation_id", "parent_id", lower("name")) NULLS NOT DISTINCT`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_appointments_active_holding" ON "appointments" ("member_id", "position_id", "unit_id") NULLS NOT DISTINCT WHERE "status" = 'active'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_appointments_active_holding"`);
    await queryRunner.query(`DROP INDEX "public"."uq_organisation_units_sibling_name"`);
  }
}
