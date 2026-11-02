import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793565522329 implements MigrationInterface {
  name = 'InitialSchema1793565522329';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'failure')`);
    await queryRunner.query(
      `CREATE TABLE "audit_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actor_executive_id" uuid, "action" character varying(80) NOT NULL, "outcome" "public"."audit_outcome" NOT NULL DEFAULT 'success', "target_type" character varying(50), "target_id" uuid, "request_id" character varying(64), "ip_address" character varying(45), "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "PK_910f64d901a5c3e9878f0d4a407" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_events_actor_executive_id" ON "audit_events"  ("actor_executive_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_events_action" ON "audit_events"  ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_events_target" ON "audit_events"  ("target_type", "target_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "members" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "first_name" character varying(100) NOT NULL, "middle_name" character varying(100), "last_name" character varying(100) NOT NULL, "party_id" character varying(50), "phone" character varying(16), "date_of_birth" date, CONSTRAINT "UQ_ecfd68487e02e084c746a424866" UNIQUE ("party_id"), CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('platform_admin', 'constituency_chairman', 'constituency_executive', 'area_executive', 'polling_station_executive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."executive_status" AS ENUM('invited', 'active', 'suspended', 'deactivated')`,
    );
    await queryRunner.query(
      `CREATE TABLE "executives" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "member_id" uuid NOT NULL, "email" character varying(254) NOT NULL, "role" "public"."user_role" NOT NULL, "status" "public"."executive_status" NOT NULL DEFAULT 'active', "failed_sign_in_attempts" smallint NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, "last_sign_in_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_b40ea64b58469198ad321c632e2" UNIQUE ("email"), CONSTRAINT "REL_eb5b7e202917dbd1531339e140" UNIQUE ("member_id"), CONSTRAINT "PK_d7471a68550c577d275bd3228cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "otp_challenges" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "executive_id" uuid NOT NULL, "masked_phone" character varying(24) NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, "user_agent" character varying(255), "ip_address" character varying(45), CONSTRAINT "PK_c34f21df6c8aa51229715452068" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_otp_challenges_executive_id" ON "otp_challenges"  ("executive_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "otp_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "challenge_id" uuid NOT NULL, "code_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "failed_attempts" smallint NOT NULL DEFAULT '0', "consumed_at" TIMESTAMP WITH TIME ZONE, "superseded_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_9d0487965ac1837d57fec4d6a26" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_otp_codes_challenge_created" ON "otp_codes"  ("challenge_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."session_revoke_reason" AS ENUM('sign_out', 'sign_out_all', 'refresh_token_reused', 'account_inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "executive_id" uuid NOT NULL, "refresh_token_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "revoked_reason" "public"."session_revoke_reason", "user_agent" character varying(255), "ip_address" character varying(45), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_executive_id" ON "sessions"  ("executive_id") `,
    );
    await queryRunner.query(`CREATE TYPE "public"."unit_status" AS ENUM('active', 'inactive')`);
    await queryRunner.query(
      `CREATE TABLE "organisational_units" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" character varying(40) NOT NULL, "name" character varying(150) NOT NULL, "parent_id" uuid, "status" "public"."unit_status" NOT NULL DEFAULT 'active', CONSTRAINT "PK_2a5e3a514b58b1a4f68091e2167" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organisational_units_parent_id" ON "organisational_units"  ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "positions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "title" character varying(120) NOT NULL, "unit_type" character varying(40) NOT NULL, "reports_to_position_id" uuid, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appointment_status" AS ENUM('active', 'ended', 'revoked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "member_id" uuid NOT NULL, "position_id" uuid NOT NULL, "unit_id" uuid NOT NULL, "status" "public"."appointment_status" NOT NULL DEFAULT 'active', "effective_from" TIMESTAMP WITH TIME ZONE NOT NULL, "effective_to" TIMESTAMP WITH TIME ZONE, "appointed_by_executive_id" uuid, "ended_by_executive_id" uuid, "end_reason" character varying(255), CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_appointments_unit_id" ON "appointments"  ("unit_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_appointments_member_status" ON "appointments"  ("member_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "permission_grants" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "appointment_id" uuid NOT NULL, "permission" character varying(60) NOT NULL, "granted_by_executive_id" uuid, "revoked_at" TIMESTAMP WITH TIME ZONE, "revoked_by_executive_id" uuid, CONSTRAINT "PK_be6ee1d795d0ac9f29a4e27a000" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_permission_grants_active" ON "permission_grants"  ("appointment_id", "permission") WHERE "revoked_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "executives" ADD CONSTRAINT "FK_eb5b7e202917dbd1531339e1402" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" ADD CONSTRAINT "FK_10e35a7db8afb2e67d1d9aadbe5" FOREIGN KEY ("executive_id") REFERENCES "executives"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_codes" ADD CONSTRAINT "FK_bab79c8874bab1adc5e4cda2140" FOREIGN KEY ("challenge_id") REFERENCES "otp_challenges"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_034b72eaa6eaef9a44fe378c78e" FOREIGN KEY ("executive_id") REFERENCES "executives"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisational_units" ADD CONSTRAINT "FK_75cdc1ae365d3fb56daa642890e" FOREIGN KEY ("parent_id") REFERENCES "organisational_units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ADD CONSTRAINT "FK_3e83545af5e55e42004fcea83d4" FOREIGN KEY ("reports_to_position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_691cff1e6a52b6be4a932289fa6" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_a928a777df00bed5e884ca7ecfb" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_3aacfd6b4df10c526e685ef90db" FOREIGN KEY ("unit_id") REFERENCES "organisational_units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "permission_grants" ADD CONSTRAINT "FK_14487f474a99159d874c8794889" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // Hand-written: audit rows are append-only at the database level, not only by convention.
    await queryRunner.query(
      `CREATE FUNCTION "prevent_audit_event_change"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_events is append-only'; END $$`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "audit_events_append_only" BEFORE UPDATE OR DELETE ON "audit_events" FOR EACH ROW EXECUTE FUNCTION "prevent_audit_event_change"()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "audit_events_append_only" ON "audit_events"`);
    await queryRunner.query(`DROP FUNCTION "prevent_audit_event_change"()`);
    await queryRunner.query(
      `ALTER TABLE "permission_grants" DROP CONSTRAINT "FK_14487f474a99159d874c8794889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_3aacfd6b4df10c526e685ef90db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_a928a777df00bed5e884ca7ecfb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_691cff1e6a52b6be4a932289fa6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" DROP CONSTRAINT "FK_3e83545af5e55e42004fcea83d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organisational_units" DROP CONSTRAINT "FK_75cdc1ae365d3fb56daa642890e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_034b72eaa6eaef9a44fe378c78e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_codes" DROP CONSTRAINT "FK_bab79c8874bab1adc5e4cda2140"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" DROP CONSTRAINT "FK_10e35a7db8afb2e67d1d9aadbe5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "executives" DROP CONSTRAINT "FK_eb5b7e202917dbd1531339e1402"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_permission_grants_active"`);
    await queryRunner.query(`DROP TABLE "permission_grants"`);
    await queryRunner.query(`DROP INDEX "public"."idx_appointments_member_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_appointments_unit_id"`);
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`DROP TYPE "public"."appointment_status"`);
    await queryRunner.query(`DROP TABLE "positions"`);
    await queryRunner.query(`DROP INDEX "public"."idx_organisational_units_parent_id"`);
    await queryRunner.query(`DROP TABLE "organisational_units"`);
    await queryRunner.query(`DROP TYPE "public"."unit_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_sessions_executive_id"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TYPE "public"."session_revoke_reason"`);
    await queryRunner.query(`DROP INDEX "public"."idx_otp_codes_challenge_created"`);
    await queryRunner.query(`DROP TABLE "otp_codes"`);
    await queryRunner.query(`DROP INDEX "public"."idx_otp_challenges_executive_id"`);
    await queryRunner.query(`DROP TABLE "otp_challenges"`);
    await queryRunner.query(`DROP TABLE "executives"`);
    await queryRunner.query(`DROP TYPE "public"."executive_status"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP TABLE "members"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_events_target"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_events_action"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_events_actor_executive_id"`);
    await queryRunner.query(`DROP TABLE "audit_events"`);
    await queryRunner.query(`DROP TYPE "public"."audit_outcome"`);
  }
}
