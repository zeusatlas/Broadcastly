import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganisationHeadTitles1793800000000 implements MigrationInterface {
  name = 'OrganisationHeadTitles1793800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organisations" ADD "head_title" character varying(120) NOT NULL DEFAULT 'Head'`,
    );
    await queryRunner.query(
      `UPDATE "positions" SET "title" = 'Head', "unit_type" = 'organisation'
       WHERE "id" = '5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "positions" SET "title" = 'Constituency Chairman', "unit_type" = 'constituency'
       WHERE "id" = '5b0c7c1e-2a4d-4f8e-9c3b-0c0a1e5d7f21'`,
    );
    await queryRunner.query(`ALTER TABLE "organisations" DROP COLUMN "head_title"`);
  }
}
