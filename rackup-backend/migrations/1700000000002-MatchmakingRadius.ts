import { MigrationInterface, QueryRunner } from 'typeorm';

export class MatchmakingRadius1700000000002 implements MigrationInterface {
  name = 'MatchmakingRadius1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "matchmaking_request_v2"
      ADD COLUMN IF NOT EXISTS "radius_meters" int NOT NULL DEFAULT 20000
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "matchmaking_request_v2"
      DROP COLUMN IF EXISTS "radius_meters"
    `);
  }
}
