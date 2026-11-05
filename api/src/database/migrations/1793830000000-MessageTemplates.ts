import type { MigrationInterface, QueryRunner } from 'typeorm';

// Reusable message templates (FR-SMS-04, FR-SMS-05). Archived rows stay for history, so the name
// index is partial: an archived template's name can be reused.
export class MessageTemplates1793830000000 implements MigrationInterface {
  name = 'MessageTemplates1793830000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."message_template_category" AS ENUM('official_notice', 'meeting_announcement', 'reminder')`,
    );
    await queryRunner.query(`
      CREATE TABLE "message_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "organisation_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "body" text NOT NULL,
        "category" "public"."message_template_category" NOT NULL,
        "created_by_executive_id" uuid NOT NULL,
        "updated_by_executive_id" uuid NOT NULL,
        "archived_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_message_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_templates_organisation"
          FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_message_templates_created_by"
          FOREIGN KEY ("created_by_executive_id") REFERENCES "organisation_executives"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_message_templates_updated_by"
          FOREIGN KEY ("updated_by_executive_id") REFERENCES "organisation_executives"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_message_templates_organisation_name" ON "message_templates" ("organisation_id", lower("name")) WHERE "archived_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_message_templates_organisation_updated" ON "message_templates" ("organisation_id", "updated_at") WHERE "archived_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "message_templates"`);
    await queryRunner.query(`DROP TYPE "public"."message_template_category"`);
  }
}
