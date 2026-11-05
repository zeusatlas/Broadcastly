import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BroadcastWorkflow1793835000000 implements MigrationInterface {
  name = 'BroadcastWorkflow1793835000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "broadcasts"
         ADD "sent_by_executive_id" uuid,
         ADD "dispatch_key" varchar(120),
         ADD "submitted_count" integer NOT NULL DEFAULT 0,
         ADD "cancelled_at" TIMESTAMP WITH TIME ZONE,
         ADD CONSTRAINT "FK_broadcasts_sent_by" FOREIGN KEY ("sent_by_executive_id")
           REFERENCES "organisation_executives"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_broadcasts_creator_created" ON "broadcasts" ("created_by_executive_id", "created_at")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."approval_decision" AS ENUM('approved', 'rejected')`,
    );
    await queryRunner.query(`
      CREATE TABLE "approval_decisions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "organisation_id" uuid NOT NULL,
        "broadcast_id" uuid NOT NULL,
        "decided_by_executive_id" uuid NOT NULL,
        "decision" "public"."approval_decision" NOT NULL,
        "reason" varchar(500),
        CONSTRAINT "PK_approval_decisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_approval_decisions_broadcast" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_approval_decisions_executive" FOREIGN KEY ("decided_by_executive_id")
          REFERENCES "organisation_executives"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_approval_decisions_broadcast" ON "approval_decisions" ("broadcast_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_approval_decisions_organisation" ON "approval_decisions" ("organisation_id", "created_at")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."recipient_status" AS ENUM('pending', 'sending', 'submitted', 'delivered', 'failed', 'unknown')`,
    );
    await queryRunner.query(`
      CREATE TABLE "broadcast_recipients" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "broadcast_id" uuid NOT NULL,
        "member_id" uuid,
        "phone" varchar(16) NOT NULL,
        "status" "public"."recipient_status" NOT NULL DEFAULT 'pending',
        "provider_reference" varchar(120),
        "error" varchar(255),
        "submitted_at" TIMESTAMP WITH TIME ZONE,
        "status_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_broadcast_recipients" PRIMARY KEY ("id"),
        CONSTRAINT "FK_broadcast_recipients_broadcast" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_broadcast_recipients_member" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT
      )`);
    // One row per number per broadcast, so a number can never be sent the same broadcast twice (BR-07).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_broadcast_recipients_phone" ON "broadcast_recipients" ("broadcast_id", "phone")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_broadcast_recipients_status" ON "broadcast_recipients" ("broadcast_id", "status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_broadcast_recipients_provider_ref" ON "broadcast_recipients" ("provider_reference")
         WHERE "provider_reference" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."credit_reservation_status" AS ENUM('held', 'settled', 'released')`,
    );
    await queryRunner.query(`
      CREATE TABLE "credit_reservations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "wallet_id" uuid NOT NULL,
        "broadcast_id" uuid NOT NULL,
        "amount" integer NOT NULL,
        "consumed" integer NOT NULL DEFAULT 0,
        "status" "public"."credit_reservation_status" NOT NULL DEFAULT 'held',
        "settled_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_credit_reservations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_credit_reservations_broadcast" UNIQUE ("broadcast_id"),
        CONSTRAINT "chk_credit_reservations_amounts" CHECK ("amount" > 0 AND "consumed" >= 0 AND "consumed" <= "amount"),
        CONSTRAINT "FK_credit_reservations_wallet" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_credit_reservations_broadcast" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE RESTRICT
      )`);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "organisation_id" uuid NOT NULL,
        "executive_id" uuid NOT NULL,
        "type" varchar(40) NOT NULL,
        "title" varchar(150) NOT NULL,
        "body" varchar(500) NOT NULL,
        "broadcast_id" uuid,
        "read_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_executive" FOREIGN KEY ("executive_id")
          REFERENCES "organisation_executives"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_notifications_broadcast" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE RESTRICT
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_executive_created" ON "notifications" ("executive_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_executive_unread" ON "notifications" ("executive_id") WHERE "read_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "credit_reservations"`);
    await queryRunner.query(`DROP TYPE "public"."credit_reservation_status"`);
    await queryRunner.query(`DROP TABLE "broadcast_recipients"`);
    await queryRunner.query(`DROP TYPE "public"."recipient_status"`);
    await queryRunner.query(`DROP TABLE "approval_decisions"`);
    await queryRunner.query(`DROP TYPE "public"."approval_decision"`);
    await queryRunner.query(`DROP INDEX "public"."idx_broadcasts_creator_created"`);
    await queryRunner.query(
      `ALTER TABLE "broadcasts" DROP CONSTRAINT "FK_broadcasts_sent_by", DROP COLUMN "cancelled_at",
         DROP COLUMN "submitted_count", DROP COLUMN "dispatch_key", DROP COLUMN "sent_by_executive_id"`,
    );
  }
}
