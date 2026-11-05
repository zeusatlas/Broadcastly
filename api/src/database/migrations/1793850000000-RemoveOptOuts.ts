import type { MigrationInterface, QueryRunner } from 'typeorm';

// Opt-outs were removed from the product (owner's decision, 2026-11-05).
export class RemoveOptOuts1793850000000 implements MigrationInterface {
  name = 'RemoveOptOuts1793850000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "suppressions"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
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
        CONSTRAINT "PK_suppressions" PRIMARY KEY ("id")
      )`);
  }
}
