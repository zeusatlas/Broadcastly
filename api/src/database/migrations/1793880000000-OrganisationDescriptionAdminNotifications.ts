import type { MigrationInterface, QueryRunner } from 'typeorm';

// Organisations get a description; platform admins get in-app notifications built from the audit log.
export class OrganisationDescriptionAdminNotifications1793880000000 implements MigrationInterface {
  name = 'OrganisationDescriptionAdminNotifications1793880000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organisations" ADD "description" text`);
    await queryRunner.query(
      `ALTER TABLE "platform_admins" ADD "notifications_read_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE TABLE "platform_notification_reads" ("platform_admin_id" uuid NOT NULL, "audit_event_id" uuid NOT NULL, "read_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_platform_notification_reads" PRIMARY KEY ("platform_admin_id", "audit_event_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "platform_notification_reads" ADD CONSTRAINT "FK_platform_notification_reads_admin" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "platform_notification_reads" ADD CONSTRAINT "FK_platform_notification_reads_event" FOREIGN KEY ("audit_event_id") REFERENCES "audit_events"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_audit_events_created_at" ON "audit_events" ("created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_events_created_at"`);
    await queryRunner.query(`DROP TABLE "platform_notification_reads"`);
    await queryRunner.query(`ALTER TABLE "platform_admins" DROP COLUMN "notifications_read_at"`);
    await queryRunner.query(`ALTER TABLE "organisations" DROP COLUMN "description"`);
  }
}
