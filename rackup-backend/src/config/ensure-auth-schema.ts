import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Production DBs were created with synchronize off and migrations never wired
 * (migrations: [] / migrationsRun: false). Signup then 500s on missing
 * users/auth columns. If the core users table is missing or incomplete,
 * run a one-shot TypeORM synchronize so entities can create/alter safely.
 */
export async function ensureAuthSchema(dataSource: DataSource): Promise<void> {
  const logger = new Logger('EnsureAuthSchema');

  const rows: Array<{ column_name: string }> = await dataSource.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users'`,
  );
  const cols = new Set(rows.map((r) => r.column_name));
  const required = [
    'id',
    'email',
    'password_hash',
    'display_name',
    'rating',
    'rd',
    'volatility',
    'matches',
    'premium_tier',
  ];
  const missing = required.filter((c) => !cols.has(c));

  if (cols.size > 0 && missing.length === 0) {
    logger.log('users table schema looks complete');
    return;
  }

  logger.warn(
    `users schema incomplete (have=${cols.size} missing=${missing.join(',') || 'entire table'}). Running TypeORM synchronize once.`,
  );
  await dataSource.synchronize();
  logger.log('TypeORM synchronize finished — signup/auth tables should exist now');
}
