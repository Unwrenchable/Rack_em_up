import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Dev/test safety net for a missing users table. Production never calls
 * synchronize — NODE_ENV=production forces it off and migrationsRun applies
 * pending migrations during DataSource init (before this runs).
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

  if (process.env.NODE_ENV === 'production') {
    const detail = `have=${cols.size} missing=${missing.join(',') || 'entire table'}`;
    logger.error(
      `users schema incomplete (${detail}). Refusing TypeORM synchronize in production.`,
    );
    throw new Error(
      `users schema incomplete in production (${detail}). synchronize is disabled; migrations must create the schema.`,
    );
  }

  logger.warn(
    `users schema incomplete (have=${cols.size} missing=${missing.join(',') || 'entire table'}). Running TypeORM synchronize once.`,
  );
  await dataSource.synchronize();
  logger.log('TypeORM synchronize finished — signup/auth tables should exist now');
}
