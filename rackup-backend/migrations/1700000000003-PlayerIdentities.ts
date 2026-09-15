import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlayerIdentities1700000000003 implements MigrationInterface {
  name = 'PlayerIdentities1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "player_identities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NULL,
        "display_name" text NOT NULL,
        "name_normalized" text NOT NULL,
        "fargo_id" varchar(64) NULL,
        "fargo_readable_id" varchar(32) NULL,
        "apa_member_id" varchar(64) NULL,
        "bca_id" varchar(64) NULL,
        "tap_id" varchar(64) NULL,
        "fargo_rating" double precision NULL,
        "fargo_robustness" double precision NULL,
        "fargo_effective_rating" double precision NULL,
        "fargo_fetched_at" timestamptz NULL,
        "apa_sl" double precision NULL,
        "bca_elo" double precision NULL,
        "tap_stats" jsonb NULL,
        "shadow_rating" double precision NULL,
        "shadow_robustness" double precision NULL,
        "shadow_provisional" boolean NOT NULL DEFAULT true,
        "shadow_confidence_low" double precision NULL,
        "shadow_confidence_high" double precision NULL,
        "shadow_computed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_player_identities_user_id"
      ON "player_identities" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_player_identities_name_normalized"
      ON "player_identities" ("name_normalized")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_player_identities_fargo_id"
      ON "player_identities" ("fargo_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_player_identities_fargo_readable_id"
      ON "player_identities" ("fargo_readable_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_player_identities_apa_member_id"
      ON "player_identities" ("apa_member_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "player_identities"`);
  }
}
