import type { MigrationInterface, QueryRunner } from 'typeorm';

// Spreadsheet imports (FR-MEM-02..10): one row per upload, one row per data line of the file.
// Rows are deleted with their import; members and memberships keep a link to the import that made them.
export class MemberImports1793845000000 implements MigrationInterface {
  name = 'MemberImports1793845000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."member_import_file_type" AS ENUM('csv', 'xlsx')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."member_import_status" AS ENUM('processing', 'ready', 'confirming', 'completed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(`
      CREATE TABLE "member_imports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "organisation_id" uuid NOT NULL,
        "uploaded_by_executive_id" uuid NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "file_size" integer NOT NULL,
        "file_type" "public"."member_import_file_type" NOT NULL,
        "stored_path" character varying(255),
        "default_unit_id" uuid,
        "status" "public"."member_import_status" NOT NULL DEFAULT 'processing',
        "failure_reason" character varying(255),
        "total_rows" integer NOT NULL DEFAULT 0,
        "valid_rows" integer NOT NULL DEFAULT 0,
        "invalid_rows" integer NOT NULL DEFAULT 0,
        "duplicate_rows" integer NOT NULL DEFAULT 0,
        "created_count" integer NOT NULL DEFAULT 0,
        "updated_count" integer NOT NULL DEFAULT 0,
        "skipped_count" integer NOT NULL DEFAULT 0,
        "rejected_count" integer NOT NULL DEFAULT 0,
        "confirmed_by_executive_id" uuid,
        "parsed_at" TIMESTAMP WITH TIME ZONE,
        "confirmed_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_member_imports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_member_imports_organisation" FOREIGN KEY ("organisation_id")
          REFERENCES "organisations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_member_imports_uploaded_by" FOREIGN KEY ("uploaded_by_executive_id")
          REFERENCES "organisation_executives"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_member_imports_confirmed_by" FOREIGN KEY ("confirmed_by_executive_id")
          REFERENCES "organisation_executives"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_member_imports_default_unit" FOREIGN KEY ("default_unit_id")
          REFERENCES "organisation_units"("id") ON DELETE RESTRICT
      )`);
    // History lists: the whole organisation's, or one uploader's, newest first.
    await queryRunner.query(
      `CREATE INDEX "idx_member_imports_organisation_created" ON "member_imports" ("organisation_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_member_imports_uploader_created" ON "member_imports" ("uploaded_by_executive_id", "created_at")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."member_import_row_status" AS ENUM('valid', 'invalid', 'duplicate')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."member_import_duplicate_match" AS ENUM('party_id', 'phone')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."member_import_resolution" AS ENUM('skip', 'update_existing', 'create_new')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."member_import_row_outcome" AS ENUM('created', 'updated', 'skipped', 'rejected')`,
    );
    await queryRunner.query(`
      CREATE TABLE "member_import_rows" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "import_id" uuid NOT NULL,
        "row_number" integer NOT NULL,
        "raw_values" jsonb NOT NULL,
        "first_name" character varying(100),
        "middle_name" character varying(100),
        "last_name" character varying(100),
        "party_id" character varying(50),
        "phone" character varying(16),
        "date_of_birth" date,
        "unit_id" uuid,
        "errors" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" "public"."member_import_row_status" NOT NULL,
        "duplicate_match" "public"."member_import_duplicate_match",
        "duplicate_member_id" uuid,
        "duplicate_of_row" integer,
        "resolution" "public"."member_import_resolution",
        "outcome" "public"."member_import_row_outcome",
        "member_id" uuid,
        CONSTRAINT "PK_member_import_rows" PRIMARY KEY ("id"),
        CONSTRAINT "FK_member_import_rows_import" FOREIGN KEY ("import_id")
          REFERENCES "member_imports"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_member_import_rows_unit" FOREIGN KEY ("unit_id")
          REFERENCES "organisation_units"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_member_import_rows_duplicate_member" FOREIGN KEY ("duplicate_member_id")
          REFERENCES "members"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_member_import_rows_member" FOREIGN KEY ("member_id")
          REFERENCES "members"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_member_import_rows_number" ON "member_import_rows" ("import_id", "row_number")`,
    );
    // The preview pages through one status at a time, in file order.
    await queryRunner.query(
      `CREATE INDEX "idx_member_import_rows_status" ON "member_import_rows" ("import_id", "status", "row_number")`,
    );

    await queryRunner.query(
      `ALTER TABLE "memberships" ADD CONSTRAINT "FK_memberships_import" FOREIGN KEY ("import_id")
         REFERENCES "member_imports"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_memberships_import" ON "memberships" ("import_id") WHERE "import_id" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_memberships_import"`);
    await queryRunner.query(`ALTER TABLE "memberships" DROP CONSTRAINT "FK_memberships_import"`);
    await queryRunner.query(`DROP TABLE "member_import_rows"`);
    await queryRunner.query(`DROP TYPE "public"."member_import_row_outcome"`);
    await queryRunner.query(`DROP TYPE "public"."member_import_resolution"`);
    await queryRunner.query(`DROP TYPE "public"."member_import_duplicate_match"`);
    await queryRunner.query(`DROP TYPE "public"."member_import_row_status"`);
    await queryRunner.query(`DROP TABLE "member_imports"`);
    await queryRunner.query(`DROP TYPE "public"."member_import_status"`);
    await queryRunner.query(`DROP TYPE "public"."member_import_file_type"`);
  }
}
