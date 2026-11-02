import type { MigrationInterface, QueryRunner } from 'typeorm';

// Platform admins are Broadcastly operators, not party members: they move out of executives and
// members into their own table. Sessions and sign-in challenges now belong to one or the other.
export class SeparatePlatformAdmins1793627715617 implements MigrationInterface {
  name = 'SeparatePlatformAdmins1793627715617';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."platform_admin_status" AS ENUM('active', 'suspended')`,
    );
    await queryRunner.query(
      `CREATE TABLE "platform_admins" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "email" character varying(254) NOT NULL, "phone" character varying(16) NOT NULL, "status" "public"."platform_admin_status" NOT NULL DEFAULT 'active', "failed_sign_in_attempts" smallint NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, "last_sign_in_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_7ddfa7abfaf477f671ccc566c83" UNIQUE ("email"), CONSTRAINT "PK_faecb3398d1962507b44c76e4f0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "audit_events" ADD "actor_platform_admin_id" uuid`);
    await queryRunner.query(`ALTER TABLE "otp_challenges" ADD "platform_admin_id" uuid`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "platform_admin_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" ALTER COLUMN "executive_id" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "executive_id" DROP NOT NULL`);

    // Hand-written: existing admin executives keep their id, sessions and sign-ins; their member
    // rows go (admins hold no appointments). Audit history is append-only and stays as recorded.
    await queryRunner.query(
      `INSERT INTO "platform_admins" ("id", "created_at", "updated_at", "first_name", "last_name", "email", "phone", "status", "failed_sign_in_attempts", "locked_until", "last_sign_in_at")
       SELECT e."id", e."created_at", e."updated_at", m."first_name", m."last_name", e."email", m."phone",
              CASE WHEN e."status" = 'active' THEN 'active' ELSE 'suspended' END::"public"."platform_admin_status",
              e."failed_sign_in_attempts", e."locked_until", e."last_sign_in_at"
         FROM "executives" e JOIN "members" m ON m."id" = e."member_id"
        WHERE e."role" = 'platform_admin' AND m."phone" IS NOT NULL`,
    );
    for (const table of ['sessions', 'otp_challenges']) {
      await queryRunner.query(
        `UPDATE "${table}" SET "platform_admin_id" = "executive_id", "executive_id" = NULL
          WHERE "executive_id" IN (SELECT "id" FROM "platform_admins")`,
      );
    }
    await queryRunner.query(
      `WITH moved AS (DELETE FROM "executives" WHERE "role" = 'platform_admin' RETURNING "member_id")
       DELETE FROM "members" m USING moved
        WHERE m."id" = moved."member_id"
          AND NOT EXISTS (SELECT 1 FROM "appointments" a WHERE a."member_id" = m."id")`,
    );

    await queryRunner.query(`ALTER TYPE "public"."user_role" RENAME TO "user_role_old"`);
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('constituency_chairman', 'constituency_executive', 'area_executive', 'polling_station_executive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "executives" ALTER COLUMN "role" TYPE "public"."user_role" USING "role"::"text"::"public"."user_role"`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role_old"`);

    await queryRunner.query(
      `CREATE INDEX "idx_audit_events_actor_platform_admin_id" ON "audit_events"  ("actor_platform_admin_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_otp_challenges_platform_admin_id" ON "otp_challenges"  ("platform_admin_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_platform_admin_id" ON "sessions"  ("platform_admin_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" ADD CONSTRAINT "chk_otp_challenges_one_account" CHECK (num_nonnulls("executive_id", "platform_admin_id") = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "chk_sessions_one_account" CHECK (num_nonnulls("executive_id", "platform_admin_id") = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" ADD CONSTRAINT "FK_d8e0da27f0ec120fc6fa77809cf" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_31f56c8a2cecdce723348e71c91" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Refuses rather than silently dropping admin accounts; move them back by hand first.
    const [row] = (await queryRunner.query(
      `SELECT count(*)::int AS n FROM "platform_admins"`,
    )) as Array<{ n: number }>;
    if (row && row.n > 0) {
      throw new Error('platform_admins is not empty; move those accounts out before reverting.');
    }

    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_31f56c8a2cecdce723348e71c91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" DROP CONSTRAINT "FK_d8e0da27f0ec120fc6fa77809cf"`,
    );
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "chk_sessions_one_account"`);
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" DROP CONSTRAINT "chk_otp_challenges_one_account"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_sessions_platform_admin_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_otp_challenges_platform_admin_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_events_actor_platform_admin_id"`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "executive_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "otp_challenges" ALTER COLUMN "executive_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_old" AS ENUM('platform_admin', 'constituency_chairman', 'constituency_executive', 'area_executive', 'polling_station_executive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "executives" ALTER COLUMN "role" TYPE "public"."user_role_old" USING "role"::"text"::"public"."user_role_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`ALTER TYPE "public"."user_role_old" RENAME TO "user_role"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "platform_admin_id"`);
    await queryRunner.query(`ALTER TABLE "otp_challenges" DROP COLUMN "platform_admin_id"`);
    await queryRunner.query(`ALTER TABLE "audit_events" DROP COLUMN "actor_platform_admin_id"`);
    await queryRunner.query(`DROP TABLE "platform_admins"`);
    await queryRunner.query(`DROP TYPE "public"."platform_admin_status"`);
  }
}
