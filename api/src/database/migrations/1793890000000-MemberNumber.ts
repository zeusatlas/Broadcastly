import type { MigrationInterface, QueryRunner } from 'typeorm';

// "Party ID" becomes the general "member ID" (schools, churches, unions, businesses too):
// members.party_id → member_number, in imports as well, including stored row values and errors.
export class MemberNumber1793890000000 implements MigrationInterface {
  name = 'MemberNumber1793890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`ALTER TABLE "members" RENAME COLUMN "party_id" TO "member_number"`);
    await q(
      `ALTER INDEX "uq_members_organisation_party_id" RENAME TO "uq_members_organisation_member_number"`,
    );
    await q(`ALTER TABLE "member_import_rows" RENAME COLUMN "party_id" TO "member_number"`);
    await q(
      `ALTER TYPE "public"."member_import_duplicate_match" RENAME VALUE 'party_id' TO 'member_number'`,
    );
    for (const column of ['raw_values', 'errors']) {
      await q(
        `UPDATE "member_import_rows"
            SET "${column}" = ("${column}" - 'partyId') || jsonb_build_object('memberNumber', "${column}" -> 'partyId')
          WHERE "${column}" ? 'partyId'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    for (const column of ['raw_values', 'errors']) {
      await q(
        `UPDATE "member_import_rows"
            SET "${column}" = ("${column}" - 'memberNumber') || jsonb_build_object('partyId', "${column}" -> 'memberNumber')
          WHERE "${column}" ? 'memberNumber'`,
      );
    }
    await q(
      `ALTER TYPE "public"."member_import_duplicate_match" RENAME VALUE 'member_number' TO 'party_id'`,
    );
    await q(`ALTER TABLE "member_import_rows" RENAME COLUMN "member_number" TO "party_id"`);
    await q(
      `ALTER INDEX "uq_members_organisation_member_number" RENAME TO "uq_members_organisation_party_id"`,
    );
    await q(`ALTER TABLE "members" RENAME COLUMN "member_number" TO "party_id"`);
  }
}
