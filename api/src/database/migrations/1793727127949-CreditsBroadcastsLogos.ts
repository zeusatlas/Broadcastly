import type { MigrationInterface, QueryRunner } from 'typeorm';

// Credit wallets, ledger and purchases (FR-CR-01..10), the broadcasts table (FR-SMS-12), organisation
// logos and suspension. The ledger gets the same append-only trigger as audit_events (BR-11).
export class CreditsBroadcastsLogos1793727127949 implements MigrationInterface {
  name = 'CreditsBroadcastsLogos1793727127949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."broadcast_status" AS ENUM('draft', 'pending_approval', 'approved', 'scheduled', 'processing', 'submitted', 'completed', 'partially_failed', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "broadcasts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organisation_id" uuid NOT NULL, "created_by_executive_id" uuid NOT NULL, "title" character varying(150), "message" text NOT NULL, "status" "public"."broadcast_status" NOT NULL DEFAULT 'draft', "audience" jsonb NOT NULL DEFAULT '{}'::jsonb, "audience_summary" character varying(255), "recipient_count" integer NOT NULL DEFAULT '0', "segment_count" integer NOT NULL DEFAULT '0', "estimated_credits" integer NOT NULL DEFAULT '0', "delivered_count" integer NOT NULL DEFAULT '0', "failed_count" integer NOT NULL DEFAULT '0', "scheduled_at" TIMESTAMP WITH TIME ZONE, "submitted_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b0586900034d0726bbdcb1b21b2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_broadcasts_status_created" ON "broadcasts"  ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_broadcasts_organisation_created" ON "broadcasts"  ("organisation_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_owner_type" AS ENUM('organisation', 'executive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "owner_type" "public"."wallet_owner_type" NOT NULL, "organisation_id" uuid NOT NULL, "executive_id" uuid, "balance" integer NOT NULL DEFAULT '0', "reserved" integer NOT NULL DEFAULT '0', CONSTRAINT "chk_wallets_not_negative" CHECK ("balance" >= 0 AND "reserved" >= 0 AND "reserved" <= "balance"), CONSTRAINT "chk_wallets_owner" CHECK (("owner_type" = 'executive') = ("executive_id" IS NOT NULL)), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_wallets_executive" ON "wallets"  ("executive_id") WHERE "executive_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_wallets_organisation" ON "wallets"  ("organisation_id") WHERE "owner_type" = 'organisation'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."credit_purchase_status" AS ENUM('pending', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "credit_purchases" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "organisation_id" uuid NOT NULL, "wallet_id" uuid NOT NULL, "credits" integer NOT NULL, "amount_pesewas" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'GHS', "status" "public"."credit_purchase_status" NOT NULL DEFAULT 'pending', "provider" character varying(30) NOT NULL, "reference" character varying(60) NOT NULL, "checkout_url" character varying(500), "idempotency_key" character varying(100), "failure_reason" character varying(255), "initiated_by_executive_id" uuid, "completed_at" TIMESTAMP WITH TIME ZONE, "failed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_4c85a7e1322815d6b255adf5779" UNIQUE ("reference"), CONSTRAINT "chk_credit_purchases_positive" CHECK ("credits" > 0 AND "amount_pesewas" > 0), CONSTRAINT "PK_89d96f2901d625d5879c1bc6f47" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_credit_purchases_idempotency" ON "credit_purchases"  ("organisation_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_credit_purchases_status_created" ON "credit_purchases"  ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_credit_purchases_organisation_created" ON "credit_purchases"  ("organisation_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."credit_transaction_type" AS ENUM('purchase', 'allocation_in', 'allocation_out', 'reservation', 'release', 'consumption', 'refund', 'reversal', 'adjustment')`,
    );
    await queryRunner.query(
      `CREATE TABLE "credit_transactions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "wallet_id" uuid NOT NULL, "type" "public"."credit_transaction_type" NOT NULL, "amount" integer NOT NULL, "balance_after" integer NOT NULL, "reason" character varying(255), "idempotency_key" character varying(120) NOT NULL, "initiated_by_executive_id" uuid, "initiated_by_platform_admin_id" uuid, "purchase_id" uuid, "broadcast_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e8026b0e6a057f0f46f263eff77" UNIQUE ("idempotency_key"), CONSTRAINT "chk_credit_transactions_amount" CHECK ("amount" <> 0 AND "balance_after" >= 0), CONSTRAINT "PK_a408319811d1ab32832ec86fc2c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_credit_transactions_wallet_created" ON "credit_transactions"  ("wallet_id", "created_at") `,
    );
    await queryRunner.query(`ALTER TABLE "organisations" ADD "logo_path" character varying(255)`);
    await queryRunner.query(`ALTER TYPE "public"."organisation_status" ADD VALUE 'suspended'`);
    await queryRunner.query(
      `ALTER TABLE "broadcasts" ADD CONSTRAINT "FK_9e643631d97de08b7e6508cd4f0" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "broadcasts" ADD CONSTRAINT "FK_a0ac383ff205562102875453ffc" FOREIGN KEY ("created_by_executive_id") REFERENCES "organisation_executives"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_08c801f604e20bb5bf13bb40eec" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD CONSTRAINT "FK_a104dc631dfd77cc37ec8d22258" FOREIGN KEY ("executive_id") REFERENCES "organisation_executives"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_purchases" ADD CONSTRAINT "FK_691ab2d9c15d0d0a054b8ef320e" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_purchases" ADD CONSTRAINT "FK_889875d8f63376a914acb1b6eda" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_purchases" ADD CONSTRAINT "FK_637debb645bdcb022833c820853" FOREIGN KEY ("initiated_by_executive_id") REFERENCES "organisation_executives"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_transactions" ADD CONSTRAINT "FK_83fe47af610729ff29c3cb9afcc" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_transactions" ADD CONSTRAINT "FK_1af102ba33c9c4fdedb95e46237" FOREIGN KEY ("initiated_by_executive_id") REFERENCES "organisation_executives"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_transactions" ADD CONSTRAINT "FK_8394f2dbb64fde10c2c25973b28" FOREIGN KEY ("initiated_by_platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_transactions" ADD CONSTRAINT "FK_e6b319fa54cca003e1f3745649c" FOREIGN KEY ("purchase_id") REFERENCES "credit_purchases"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE FUNCTION "prevent_credit_transaction_change"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'credit_transactions is append-only'; END $$`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "credit_transactions_append_only" BEFORE UPDATE OR DELETE ON "credit_transactions" FOR EACH ROW EXECUTE FUNCTION "prevent_credit_transaction_change"()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER "credit_transactions_append_only" ON "credit_transactions"`,
    );
    await queryRunner.query(`DROP FUNCTION "prevent_credit_transaction_change"()`);
    await queryRunner.query(
      `ALTER TABLE "credit_transactions" DROP CONSTRAINT "FK_e6b319fa54cca003e1f3745649c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_transactions" DROP CONSTRAINT "FK_8394f2dbb64fde10c2c25973b28"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_transactions" DROP CONSTRAINT "FK_1af102ba33c9c4fdedb95e46237"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_transactions" DROP CONSTRAINT "FK_83fe47af610729ff29c3cb9afcc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_purchases" DROP CONSTRAINT "FK_637debb645bdcb022833c820853"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_purchases" DROP CONSTRAINT "FK_889875d8f63376a914acb1b6eda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_purchases" DROP CONSTRAINT "FK_691ab2d9c15d0d0a054b8ef320e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_a104dc631dfd77cc37ec8d22258"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_08c801f604e20bb5bf13bb40eec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "broadcasts" DROP CONSTRAINT "FK_a0ac383ff205562102875453ffc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "broadcasts" DROP CONSTRAINT "FK_9e643631d97de08b7e6508cd4f0"`,
    );
    await queryRunner.query(
      `UPDATE "organisations" SET "status" = 'inactive' WHERE "status" = 'suspended'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organisation_status_old" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(`ALTER TABLE "organisations" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "organisations" ALTER COLUMN "status" TYPE "public"."organisation_status_old" USING "status"::"text"::"public"."organisation_status_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisations" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."organisation_status"`);
    await queryRunner.query(
      `ALTER TYPE "public"."organisation_status_old" RENAME TO "organisation_status"`,
    );
    await queryRunner.query(`ALTER TABLE "organisations" DROP COLUMN "logo_path"`);
    await queryRunner.query(`DROP INDEX "public"."idx_credit_transactions_wallet_created"`);
    await queryRunner.query(`DROP TABLE "credit_transactions"`);
    await queryRunner.query(`DROP TYPE "public"."credit_transaction_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_credit_purchases_organisation_created"`);
    await queryRunner.query(`DROP INDEX "public"."idx_credit_purchases_status_created"`);
    await queryRunner.query(`DROP INDEX "public"."uq_credit_purchases_idempotency"`);
    await queryRunner.query(`DROP TABLE "credit_purchases"`);
    await queryRunner.query(`DROP TYPE "public"."credit_purchase_status"`);
    await queryRunner.query(`DROP INDEX "public"."uq_wallets_organisation"`);
    await queryRunner.query(`DROP INDEX "public"."uq_wallets_executive"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TYPE "public"."wallet_owner_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_broadcasts_organisation_created"`);
    await queryRunner.query(`DROP INDEX "public"."idx_broadcasts_status_created"`);
    await queryRunner.query(`DROP TABLE "broadcasts"`);
    await queryRunner.query(`DROP TYPE "public"."broadcast_status"`);
  }
}
