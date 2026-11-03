import type { MigrationInterface, QueryRunner } from 'typeorm';

// Owner's naming: organisation_units and organisation_executives. Executives are tied to their
// organisation; offices become per-organisation positions, so the fixed role column goes.
export class OrganisationExecutives1793632000000 implements MigrationInterface {
  name = 'OrganisationExecutives1793632000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // Renamed in place, keeping rows; constraint names follow so TypeORM sees no drift.
    await q(`ALTER TABLE "organisational_units" RENAME TO "organisation_units"`);
    await q(
      `ALTER TABLE "organisation_units" RENAME CONSTRAINT "PK_2a5e3a514b58b1a4f68091e2167" TO "PK_9229b00a05a9dbe7a3e130c0e28"`,
    );
    await q(
      `ALTER TABLE "organisation_units" RENAME CONSTRAINT "FK_81e89a11c173ced96e7c3dd522a" TO "FK_d3b7bb26c2b96fd4c50d5381a4d"`,
    );
    await q(
      `ALTER TABLE "organisation_units" RENAME CONSTRAINT "FK_75cdc1ae365d3fb56daa642890e" TO "FK_23d74e7d2e34f91ddcaf867b08b"`,
    );
    await q(
      `ALTER INDEX "idx_organisational_units_organisation_id" RENAME TO "idx_organisation_units_organisation_id"`,
    );
    await q(
      `ALTER INDEX "idx_organisational_units_parent_id" RENAME TO "idx_organisation_units_parent_id"`,
    );

    await q(`ALTER TABLE "executives" RENAME TO "organisation_executives"`);
    await q(
      `ALTER TABLE "organisation_executives" RENAME CONSTRAINT "PK_d7471a68550c577d275bd3228cd" TO "PK_f50bee84a2b2a66150f5d0a680c"`,
    );
    await q(
      `ALTER TABLE "organisation_executives" RENAME CONSTRAINT "UQ_b40ea64b58469198ad321c632e2" TO "UQ_1126802ba38ff367aa4f14c26d6"`,
    );
    await q(`ALTER TABLE "organisation_executives" ADD "organisation_id" uuid`);
    await q(
      `UPDATE "organisation_executives" e SET "organisation_id" = m."organisation_id"
         FROM "members" m WHERE m."id" = e."member_id"`,
    );
    await q(`ALTER TABLE "organisation_executives" ALTER COLUMN "organisation_id" SET NOT NULL`);
    await q(
      `ALTER TABLE "organisation_executives" DROP CONSTRAINT "FK_eb5b7e202917dbd1531339e1402"`,
    );
    await q(
      `ALTER TABLE "organisation_executives" DROP CONSTRAINT "REL_eb5b7e202917dbd1531339e140"`,
    );
    await q(`ALTER TABLE "organisation_executives" DROP COLUMN "role"`);
    await q(`DROP TYPE "public"."executive_role"`);
    await q(
      `ALTER TABLE "members" ADD CONSTRAINT "uq_members_id_organisation" UNIQUE ("id", "organisation_id")`,
    );
    await q(
      `ALTER TABLE "organisation_executives" ADD CONSTRAINT "REL_7584ced5d8cfadd35629a92f2c" UNIQUE ("member_id", "organisation_id")`,
    );
    await q(
      `ALTER TABLE "organisation_executives" ADD CONSTRAINT "FK_7584ced5d8cfadd35629a92f2c2" FOREIGN KEY ("member_id", "organisation_id") REFERENCES "members"("id","organisation_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await q(
      `CREATE INDEX "idx_organisation_executives_organisation_id" ON "organisation_executives"  ("organisation_id") `,
    );

    await q(`ALTER TABLE "positions" ADD "organisation_id" uuid`);
    await q(`ALTER TABLE "positions" ALTER COLUMN "unit_type" SET DEFAULT 'organisation'`);
    await q(`CREATE INDEX "idx_positions_organisation_id" ON "positions"  ("organisation_id") `);
    // Hand-written: titles unique per organisation ignoring case; built-ins (no organisation) count as one group.
    await q(
      `CREATE UNIQUE INDEX "uq_positions_organisation_title" ON "positions" ("organisation_id", lower("title")) NULLS NOT DISTINCT`,
    );
    await q(
      `ALTER TABLE "positions" ADD CONSTRAINT "FK_ebdfdc236deae000fd5294d43d8" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    await q(`ALTER TABLE "positions" DROP CONSTRAINT "FK_ebdfdc236deae000fd5294d43d8"`);
    await q(`DROP INDEX "public"."uq_positions_organisation_title"`);
    await q(`DROP INDEX "public"."idx_positions_organisation_id"`);
    await q(`ALTER TABLE "positions" ALTER COLUMN "unit_type" DROP DEFAULT`);
    await q(`ALTER TABLE "positions" DROP COLUMN "organisation_id"`);

    await q(`DROP INDEX "public"."idx_organisation_executives_organisation_id"`);
    await q(
      `ALTER TABLE "organisation_executives" DROP CONSTRAINT "FK_7584ced5d8cfadd35629a92f2c2"`,
    );
    await q(
      `ALTER TABLE "organisation_executives" DROP CONSTRAINT "REL_7584ced5d8cfadd35629a92f2c"`,
    );
    await q(`ALTER TABLE "members" DROP CONSTRAINT "uq_members_id_organisation"`);
    await q(
      `CREATE TYPE "public"."executive_role" AS ENUM('constituency_chairman', 'constituency_executive', 'area_executive', 'polling_station_executive')`,
    );
    await q(
      `ALTER TABLE "organisation_executives" ADD "role" "public"."executive_role" NOT NULL DEFAULT 'constituency_executive'`,
    );
    await q(
      `UPDATE "organisation_executives" e SET "role" = 'constituency_chairman' WHERE EXISTS (
         SELECT 1 FROM "appointments" a WHERE a."member_id" = e."member_id"
            AND a."position_id" = '5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21' AND a."status" = 'active')`,
    );
    await q(`ALTER TABLE "organisation_executives" ALTER COLUMN "role" DROP DEFAULT`);
    await q(
      `ALTER TABLE "organisation_executives" ADD CONSTRAINT "REL_eb5b7e202917dbd1531339e140" UNIQUE ("member_id")`,
    );
    await q(
      `ALTER TABLE "organisation_executives" ADD CONSTRAINT "FK_eb5b7e202917dbd1531339e1402" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await q(`ALTER TABLE "organisation_executives" DROP COLUMN "organisation_id"`);
    await q(
      `ALTER TABLE "organisation_executives" RENAME CONSTRAINT "UQ_1126802ba38ff367aa4f14c26d6" TO "UQ_b40ea64b58469198ad321c632e2"`,
    );
    await q(
      `ALTER TABLE "organisation_executives" RENAME CONSTRAINT "PK_f50bee84a2b2a66150f5d0a680c" TO "PK_d7471a68550c577d275bd3228cd"`,
    );
    await q(`ALTER TABLE "organisation_executives" RENAME TO "executives"`);

    await q(
      `ALTER INDEX "idx_organisation_units_parent_id" RENAME TO "idx_organisational_units_parent_id"`,
    );
    await q(
      `ALTER INDEX "idx_organisation_units_organisation_id" RENAME TO "idx_organisational_units_organisation_id"`,
    );
    await q(
      `ALTER TABLE "organisation_units" RENAME CONSTRAINT "FK_23d74e7d2e34f91ddcaf867b08b" TO "FK_75cdc1ae365d3fb56daa642890e"`,
    );
    await q(
      `ALTER TABLE "organisation_units" RENAME CONSTRAINT "FK_d3b7bb26c2b96fd4c50d5381a4d" TO "FK_81e89a11c173ced96e7c3dd522a"`,
    );
    await q(
      `ALTER TABLE "organisation_units" RENAME CONSTRAINT "PK_9229b00a05a9dbe7a3e130c0e28" TO "PK_2a5e3a514b58b1a4f68091e2167"`,
    );
    await q(`ALTER TABLE "organisation_units" RENAME TO "organisational_units"`);
  }
}
