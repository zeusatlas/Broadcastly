import type { MigrationInterface, QueryRunner } from 'typeorm';

// Platform admins get permissions (owner's decision, 2026-11-06). Admins that already exist were
// full admins, so they become main admins and keep every permission.
export class PlatformAdminPermissions1793860000000 implements MigrationInterface {
  name = 'PlatformAdminPermissions1793860000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "platform_admins" ADD "is_super_admin" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "platform_admins" ADD "permissions" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(`UPDATE "platform_admins" SET "is_super_admin" = true`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "platform_admins" DROP COLUMN "permissions"`);
    await queryRunner.query(`ALTER TABLE "platform_admins" DROP COLUMN "is_super_admin"`);
  }
}
