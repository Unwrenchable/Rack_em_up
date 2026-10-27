import { MigrationInterface, QueryRunner } from 'typeorm';

export class MatchmakingRadius1700000000002 implements MigrationInterface {
  name = 'MatchmakingRadius1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'matchmaking_request_v2'
         AND column_name = 'radius_meters'`,
    );
    // Baseline or synchronize already added the column. Do not ALTER.
    if (existing.length > 0) {
      return;
    }
    await queryRunner.query(`
      ALTER TABLE "matchmaking_request_v2"
      ADD COLUMN IF NOT EXISTS "radius_meters" int NOT NULL DEFAULT 20000
    `);
  }

  public async down(): Promise<void> {
    // Non-destructive. radius_meters may already be populated. Revert only
    // unrecords this migration and does not drop the column.
  }
}
