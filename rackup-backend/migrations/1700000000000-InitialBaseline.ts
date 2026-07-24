import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration marker.
 *
 * Existing environments that already used TypeORM `synchronize: true` already have tables.
 * This migration records that the schema is under migration control going forward.
 *
 * For a greenfield DB: set TYPEORM_SYNC=true once to create tables from entities,
 * then run migrations. New schema changes should be additive migration files.
 */
export class InitialBaseline1700000000000 implements MigrationInterface {
  name = 'InitialBaseline1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rackup_schema_meta" (
        "key" varchar(64) PRIMARY KEY,
        "value" text NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      INSERT INTO "rackup_schema_meta" ("key", "value")
      VALUES ('baseline', '1700000000000')
      ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rackup_schema_meta"`);
  }
}
