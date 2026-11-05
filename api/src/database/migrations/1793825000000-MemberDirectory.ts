import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MemberDirectory1793825000000 implements MigrationInterface {
  name = 'MemberDirectory1793825000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive')`);
    await queryRunner.query(
      `ALTER TABLE "members" ADD "status" "public"."member_status" NOT NULL DEFAULT 'active',
                             ADD "deactivated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_members_organisation_status" ON "members" ("organisation_id", "status")`,
    );
    // Recipient resolution and de-duplication look members up by number (FR-SMS-08).
    await queryRunner.query(
      `CREATE INDEX "idx_members_organisation_phone" ON "members" ("organisation_id", "phone")`,
    );

    await queryRunner.query(`CREATE TYPE "public"."membership_source" AS ENUM('manual', 'import')`);
    await queryRunner.query(`CREATE TYPE "public"."membership_status" AS ENUM('active', 'ended')`);
    await queryRunner.query(`
      CREATE TABLE "memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "organisation_id" uuid NOT NULL,
        "member_id" uuid NOT NULL,
        "unit_id" uuid NOT NULL,
        "status" "public"."membership_status" NOT NULL DEFAULT 'active',
        "source" "public"."membership_source" NOT NULL,
        "import_id" uuid,
        "created_by_executive_id" uuid,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "FK_memberships_member" FOREIGN KEY ("member_id", "organisation_id")
          REFERENCES "members"("id", "organisation_id") ON DELETE RESTRICT,
        CONSTRAINT "FK_memberships_unit" FOREIGN KEY ("unit_id") REFERENCES "organisation_units"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_memberships_created_by" FOREIGN KEY ("created_by_executive_id")
          REFERENCES "organisation_executives"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_memberships_active_member" ON "memberships" ("member_id") WHERE "status" = 'active'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_memberships_unit_active" ON "memberships" ("unit_id") WHERE "status" = 'active'`,
    );

    await queryRunner.query(`
      CREATE TABLE "suppressions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "organisation_id" uuid NOT NULL,
        "phone" varchar(16) NOT NULL,
        "reason" varchar(255),
        "created_by_executive_id" uuid,
        "lifted_at" TIMESTAMP WITH TIME ZONE,
        "lifted_by_executive_id" uuid,
        CONSTRAINT "PK_suppressions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_suppressions_organisation" FOREIGN KEY ("organisation_id")
          REFERENCES "organisations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_suppressions_created_by" FOREIGN KEY ("created_by_executive_id")
          REFERENCES "organisation_executives"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_suppressions_lifted_by" FOREIGN KEY ("lifted_by_executive_id")
          REFERENCES "organisation_executives"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_suppressions_active_phone" ON "suppressions" ("organisation_id", "phone")
         WHERE "lifted_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "suppressions"`);
    await queryRunner.query(`DROP TABLE "memberships"`);
    await queryRunner.query(`DROP TYPE "public"."membership_status"`);
    await queryRunner.query(`DROP TYPE "public"."membership_source"`);
    await queryRunner.query(`DROP INDEX "public"."idx_members_organisation_phone"`);
    await queryRunner.query(`DROP INDEX "public"."idx_members_organisation_status"`);
    await queryRunner.query(
      `ALTER TABLE "members" DROP COLUMN "deactivated_at", DROP COLUMN "status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."member_status"`);
  }
}
