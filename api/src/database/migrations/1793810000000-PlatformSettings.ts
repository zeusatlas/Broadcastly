import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformSettings1793810000000 implements MigrationInterface {
  name = 'PlatformSettings1793810000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "platform_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "max_file_size_mb" integer NOT NULL DEFAULT 25,
        "max_rows_per_file" integer NOT NULL DEFAULT 10000,
        "allowed_file_types" jsonb NOT NULL DEFAULT '{"csv":true,"xlsx":true}',
        "notification_preferences" jsonb NOT NULL DEFAULT '{"security":true,"payments":true,"service":true,"digest":false}',
        CONSTRAINT "PK_platform_settings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`INSERT INTO "platform_settings" DEFAULT VALUES`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "platform_settings"`);
  }
}
