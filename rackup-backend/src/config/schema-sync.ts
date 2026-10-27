import * as path from 'path';

/**
 * Whether TypeORM may create or alter tables from entities.
 *
 * Production always returns false, including when TYPEORM_SYNC=true.
 * Dev and test stay synchronized unless TYPEORM_SYNC is exactly "false".
 */
export function resolveSynchronize(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') {
    return false;
  }
  return env.TYPEORM_SYNC !== 'false';
}

/** Apply pending migrations during DataSource init only in production. */
export function resolveMigrationsRun(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Glob for compiled migrations when this file is loaded from dist (`*.js`),
 * and for TypeScript sources when the CLI loads `src` via ts-node (`*.ts`).
 */
export function migrationGlob(dirname: string, filename: string): string {
  const ext = filename.endsWith('.js') ? 'js' : 'ts';
  return path.join(dirname, '..', 'migrations', `*.${ext}`);
}

/** Glob for entity files next to the compiled or TypeScript config. */
export function entityGlob(dirname: string, filename: string): string {
  const ext = filename.endsWith('.js') ? 'js' : 'ts';
  return path.join(dirname, '..', '**', `*.entity.${ext}`);
}
