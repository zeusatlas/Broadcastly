import type { MigrationInterface, QueryRunner } from 'typeorm';

const CHAIRMAN_POSITION_ID = '5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21';

// Organisations become the tenants: every member, unit and appointment belongs to one.
// Top-level constituency units turn into organisations, keeping their ids.
export class Organisations1793629603293 implements MigrationInterface {
  name = 'Organisations1793629603293';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string, params?: unknown[]) => queryRunner.query(sql, params);

    await q(`CREATE TYPE "public"."organisation_status" AS ENUM('active', 'inactive')`);
    await q(
      `CREATE TABLE "organisations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "type" character varying(40) NOT NULL DEFAULT 'constituency', "status" "public"."organisation_status" NOT NULL DEFAULT 'active', CONSTRAINT "PK_7bf54cba378d5b2f1d4c10ef4df" PRIMARY KEY ("id"))`,
    );
    await q(`ALTER TABLE "organisational_units" ADD "organisation_id" uuid`);
    await q(`ALTER TABLE "appointments" ADD "organisation_id" uuid`);
    await q(`ALTER TABLE "members" ADD "organisation_id" uuid`);
    await q(`ALTER TABLE "appointments" ALTER COLUMN "unit_id" DROP NOT NULL`);
    await q(`DROP INDEX "public"."uq_appointments_active_chairman"`);
    await q(`DROP INDEX "public"."uq_organisational_units_constituency_name"`);

    // Hand-written data move: roots become organisations; units, appointments, members follow.
    await q(
      `INSERT INTO "organisations" ("id", "created_at", "updated_at", "name", "type", "status")
       SELECT "id", "created_at", "updated_at", "name", "type", "status"::text::"public"."organisation_status"
         FROM "organisational_units" WHERE "parent_id" IS NULL AND "type" = 'constituency'`,
    );
    await q(
      `WITH RECURSIVE tree AS (
         SELECT "id", "id" AS root_id FROM "organisational_units" WHERE "parent_id" IS NULL
         UNION ALL
         SELECT u."id", t.root_id FROM "organisational_units" u JOIN tree t ON u."parent_id" = t."id"
       )
       UPDATE "organisational_units" u SET "organisation_id" = tree.root_id
         FROM tree WHERE tree."id" = u."id" AND tree.root_id IN (SELECT "id" FROM "organisations")`,
    );
    await q(
      `UPDATE "organisational_units" SET "parent_id" = NULL
        WHERE "parent_id" IN (SELECT "id" FROM "organisations")`,
    );
    await q(
      `UPDATE "appointments" SET "organisation_id" = "unit_id", "unit_id" = NULL
        WHERE "unit_id" IN (SELECT "id" FROM "organisations")`,
    );
    await q(
      `UPDATE "appointments" a SET "organisation_id" = u."organisation_id"
         FROM "organisational_units" u WHERE a."unit_id" = u."id" AND a."organisation_id" IS NULL`,
    );
    await q(
      `UPDATE "members" m SET "organisation_id" = (
         SELECT a."organisation_id" FROM "appointments" a
          WHERE a."member_id" = m."id" AND a."organisation_id" IS NOT NULL
          ORDER BY a."effective_from" LIMIT 1)`,
    );
    for (const table of ['organisational_units', 'appointments', 'members']) {
      const [row] = (await q(
        `SELECT count(*)::int AS n FROM "${table}" WHERE "organisation_id" IS NULL`,
      )) as Array<{ n: number }>;
      if (row && row.n > 0) {
        throw new Error(`${row.n} ${table} rows have no organisation; assign them, then migrate.`);
      }
    }
    await q(`DELETE FROM "organisational_units" WHERE "id" IN (SELECT "id" FROM "organisations")`);
    await q(`UPDATE "positions" SET "unit_type" = 'organisation' WHERE "id" = $1`, [
      CHAIRMAN_POSITION_ID,
    ]);

    await q(`ALTER TABLE "organisational_units" ALTER COLUMN "organisation_id" SET NOT NULL`);
    await q(`ALTER TABLE "appointments" ALTER COLUMN "organisation_id" SET NOT NULL`);
    await q(`ALTER TABLE "members" ALTER COLUMN "organisation_id" SET NOT NULL`);
    await q(`ALTER TABLE "members" DROP CONSTRAINT "UQ_ecfd68487e02e084c746a424866"`);
    await q(`ALTER TYPE "public"."user_role" RENAME TO "executive_role"`);

    await q(`CREATE UNIQUE INDEX "uq_organisations_name" ON "organisations" (lower("name"))`);
    await q(
      `CREATE INDEX "idx_organisational_units_organisation_id" ON "organisational_units"  ("organisation_id") `,
    );
    await q(
      `CREATE INDEX "idx_appointments_organisation_id" ON "appointments"  ("organisation_id") `,
    );
    await q(
      `CREATE UNIQUE INDEX "uq_appointments_active_chairman" ON "appointments"  ("organisation_id") WHERE "status" = 'active' AND "position_id" = '${CHAIRMAN_POSITION_ID}'`,
    );
    await q(`CREATE INDEX "idx_members_organisation_id" ON "members"  ("organisation_id") `);
    await q(
      `CREATE UNIQUE INDEX "uq_members_organisation_party_id" ON "members"  ("organisation_id", "party_id") WHERE "party_id" IS NOT NULL`,
    );
    await q(
      `ALTER TABLE "organisational_units" ADD CONSTRAINT "FK_81e89a11c173ced96e7c3dd522a" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_eb8481617435335e21b0faaa382" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "members" ADD CONSTRAINT "FK_ea8e953157d3927bf956cf40a60" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    const [row] = (await q(`SELECT count(*)::int AS n FROM "organisations"`)) as Array<{
      n: number;
    }>;
    if (row && row.n > 0) {
      throw new Error('organisations is not empty; move that data out before reverting.');
    }

    await q(`ALTER TABLE "members" DROP CONSTRAINT "FK_ea8e953157d3927bf956cf40a60"`);
    await q(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_eb8481617435335e21b0faaa382"`);
    await q(`ALTER TABLE "organisational_units" DROP CONSTRAINT "FK_81e89a11c173ced96e7c3dd522a"`);
    await q(`DROP INDEX "public"."uq_members_organisation_party_id"`);
    await q(`DROP INDEX "public"."idx_members_organisation_id"`);
    await q(`DROP INDEX "public"."uq_appointments_active_chairman"`);
    await q(`DROP INDEX "public"."idx_appointments_organisation_id"`);
    await q(`DROP INDEX "public"."idx_organisational_units_organisation_id"`);
    await q(`ALTER TYPE "public"."executive_role" RENAME TO "user_role"`);
    await q(
      `ALTER TABLE "members" ADD CONSTRAINT "UQ_ecfd68487e02e084c746a424866" UNIQUE ("party_id")`,
    );
    await q(`ALTER TABLE "appointments" ALTER COLUMN "unit_id" SET NOT NULL`);
    await q(`ALTER TABLE "members" DROP COLUMN "organisation_id"`);
    await q(`ALTER TABLE "appointments" DROP COLUMN "organisation_id"`);
    await q(`ALTER TABLE "organisational_units" DROP COLUMN "organisation_id"`);
    await q(
      `CREATE UNIQUE INDEX "uq_organisational_units_constituency_name" ON "organisational_units" (lower("name")) WHERE "type" = 'constituency'`,
    );
    await q(
      `CREATE UNIQUE INDEX "uq_appointments_active_chairman" ON "appointments"  ("unit_id") WHERE "status" = 'active' AND "position_id" = '${CHAIRMAN_POSITION_ID}'`,
    );
    await q(`DROP TABLE "organisations"`);
    await q(`DROP TYPE "public"."organisation_status"`);
  }
}
