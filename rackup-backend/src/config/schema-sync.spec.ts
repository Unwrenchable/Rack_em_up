import * as path from 'path';
import {
  entityGlob,
  migrationGlob,
  resolveMigrationsRun,
  resolveSynchronize,
} from './schema-sync';

describe('resolveSynchronize', () => {
  it('is false in production even when TYPEORM_SYNC=true', () => {
    expect(resolveSynchronize({ NODE_ENV: 'production', TYPEORM_SYNC: 'true' })).toBe(false);
    expect(resolveSynchronize({ NODE_ENV: 'production' })).toBe(false);
    expect(resolveSynchronize({ NODE_ENV: 'production', TYPEORM_SYNC: 'false' })).toBe(false);
  });

  it('stays true for dev and test unless TYPEORM_SYNC=false', () => {
    expect(resolveSynchronize({ NODE_ENV: 'development', TYPEORM_SYNC: 'true' })).toBe(true);
    expect(resolveSynchronize({ NODE_ENV: 'test' })).toBe(true);
    expect(resolveSynchronize({})).toBe(true);
    expect(resolveSynchronize({ NODE_ENV: 'development', TYPEORM_SYNC: 'false' })).toBe(false);
    expect(resolveSynchronize({ NODE_ENV: 'test', TYPEORM_SYNC: 'false' })).toBe(false);
  });
});

describe('resolveMigrationsRun', () => {
  it('runs pending migrations on boot only in production', () => {
    expect(resolveMigrationsRun({ NODE_ENV: 'production' })).toBe(true);
    expect(resolveMigrationsRun({ NODE_ENV: 'development' })).toBe(false);
    expect(resolveMigrationsRun({ NODE_ENV: 'test' })).toBe(false);
    expect(resolveMigrationsRun({})).toBe(false);
  });
});

describe('migration and entity globs', () => {
  it('loads migrations from the compiled dist path', () => {
    const glob = migrationGlob('/srv/app/dist/config', '/srv/app/dist/config/ormconfig.js');
    expect(glob).toBe(path.join('/srv/app/dist/migrations', '*.js'));
  });

  it('loads migrations from src when the CLI runs TypeScript', () => {
    const glob = migrationGlob(
      '/srv/app/src/config',
      '/srv/app/src/config/data-source.ts',
    );
    expect(glob).toBe(path.join('/srv/app/src/migrations', '*.ts'));
  });

  it('loads entities from dist or src to match the config file', () => {
    expect(entityGlob('/srv/app/dist/config', '/srv/app/dist/config/ormconfig.js')).toBe(
      path.join('/srv/app/dist', '**', '*.entity.js'),
    );
    expect(entityGlob('/srv/app/src/config', '/srv/app/src/config/data-source.ts')).toBe(
      path.join('/srv/app/src', '**', '*.entity.ts'),
    );
  });
});
