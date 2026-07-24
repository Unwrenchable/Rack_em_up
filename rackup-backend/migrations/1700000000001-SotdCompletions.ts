import { MigrationInterface, QueryRunner } from 'typeorm';

/** User SOTD completions for streak tracking. */
export class SotdCompletions1700000000001 implements MigrationInterface {
  name = 'SotdCompletions1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sotd_completions"`);
  }
}
