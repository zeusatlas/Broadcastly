import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganisationNotificationPreferences1793820000000 implements MigrationInterface {
  name = 'OrganisationNotificationPreferences1793820000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "organisation_notification_preferences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "organisation_id" uuid NOT NULL,
        "preferences" jsonb NOT NULL DEFAULT '{"security":true,"approvals":true,"broadcasts":true,"imports":true,"digest":false}',
        CONSTRAINT "PK_organisation_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organisation_notification_preferences_organisation" UNIQUE ("organisation_id"),
        CONSTRAINT "FK_organisation_notification_preferences_organisation"
          FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "organisation_notification_preferences"`);
  }
}
