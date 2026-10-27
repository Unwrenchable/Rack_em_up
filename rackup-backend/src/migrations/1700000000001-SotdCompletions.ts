import { MigrationInterface, QueryRunner } from 'typeorm';

/** User SOTD completions for streak tracking. */
export class SotdCompletions1700000000001 implements MigrationInterface {
  name = 'SotdCompletions1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing: Array<{ reg: string | null }> = await queryRunner.query(
      `SELECT to_regclass('public.sotd_completions') AS reg`,
    );
    // Baseline (or synchronize) already created this table with the entity's
    // index and unique constraint names. Adding the hand-written index here
    // would leave an extra index TypeORM does not expect.
    if (existing[0]?.reg) {
      return;
    }
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sotd_completions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "shot_id" varchar(64) NOT NULL,
        "completed_on" date NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("user_id", "completed_on")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sotd_completions_user"
      ON "sotd_completions" ("user_id")
    `);
  }

  public async down(): Promise<void> {
    // Non-destructive. sotd_completions may have been created by synchronize
    // or the baseline and may hold data. Revert only unrecords this migration.
  }
}
