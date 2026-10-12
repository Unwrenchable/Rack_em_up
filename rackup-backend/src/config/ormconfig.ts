import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

const isProd = process.env.NODE_ENV === 'production';

const synchronize =
  process.env.TYPEORM_SYNC === 'true' ||
  (!isProd && process.env.TYPEORM_SYNC !== 'false');

type PgConnection =
  | { url: string; ssl: false | { rejectUnauthorized: false } }
  | {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
      ssl: false | { rejectUnauthorized: false };
    };

function redactDatabaseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.username ? '***@' : ''}${u.host}${u.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

function buildConnection(): PgConnection {
  const rawUrl = (process.env.DATABASE_URL ?? '').trim();
  const useUrl = /^postgres(ql)?:\/\//i.test(rawUrl);

  if (isProd && !useUrl) {
    throw new Error(
      'DATABASE_URL must be a full postgres:// connection string in production. ' +
        'Do not set DB_HOST=base. Set it on rackup-backend -> Environment in Render.',
    );
  }

  const ssl: false | { rejectUnauthorized: false } = isProd
    ? { rejectUnauthorized: false }
    : false;

  if (!useUrl) {
    const host = process.env.DB_HOST ?? 'localhost';
    if (host === 'base') {
      throw new Error(
        'DB_HOST=base is invalid. Unset DB_HOST and set DATABASE_URL to the full postgres:// URL.',
      );
    }
    return {
      host,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'rackup',
      ssl,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(
      `DATABASE_URL is not a valid URL (${redactDatabaseUrl(rawUrl)}). ` +
        'Use the full postgres:// URL from your database provider.',
    );
  }

  if (!parsed.hostname || parsed.hostname === 'base') {
    throw new Error(
      `DATABASE_URL hostname is invalid (${parsed.hostname || 'empty'}). ` +
        'Replace it with the full postgres:// URL from your database provider.',
    );
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, '')).split('/')[0];
  if (!database) {
    throw new Error(
      'DATABASE_URL is missing a database name in the path. ' +
        'Use the full postgres:// URL from your database provider.',
    );
  }

  // Discrete fields + ssl object are more reliable on Render than passing `url`
  // (avoids sslmode / pg URL parse quirks that surface as "Connection terminated unexpectedly").
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432', 10),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl,
  };
}

const connection = buildConnection();

if (isProd) {
  // Safe diagnostics only — never log credentials.
  const host =
    'host' in connection
      ? `${connection.host}:${connection.port}/${connection.database}`
      : redactDatabaseUrl(connection.url);
  // eslint-disable-next-line no-console
  console.log(`[ormconfig] postgres target ${host} ssl=on`);
}

export const ormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  ...connection,
  autoLoadEntities: true,
  synchronize,
  logging: process.env.NODE_ENV === 'development',
  logger: 'advanced-console',
  retryAttempts: 10,
  retryDelay: 3000,
  extra: {
    max: 20,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    // Prefer IPv4 on some Render paths where IPv6 terminates oddly.
    family: 4,
  },
  migrations: [],
  migrationsRun: false,
};

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...connection,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [],
  synchronize: false,
  extra: {
    max: 20,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    family: 4,
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
