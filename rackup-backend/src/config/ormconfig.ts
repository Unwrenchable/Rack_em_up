import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

const isProd = process.env.NODE_ENV === 'production';

/** Explicit opt-in for synchronize; default off in production. Dev defaults on unless TYPEORM_SYNC=false. */
const synchronize =
  process.env.TYPEORM_SYNC === 'true' ||
  (!isProd && process.env.TYPEORM_SYNC !== 'false');

export const ormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'rackup',
  autoLoadEntities: true,
  synchronize,
  logging: process.env.NODE_ENV === 'development',
  logger: 'advanced-console',
  ssl: isProd ? { rejectUnauthorized: false } : false,
  extra: {
    max: 20,
  },

  /** 🔥 DROP-IN FIX: Disable migrations during boot */
  migrations: [],
  migrationsRun: false,
};

/** CLI DataSource for typeorm migration:run */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'rackup',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  /** 🔥 DROP-IN FIX: Disable migrations for CLI too */
  migrations: [],
  synchronize: false,

  ssl: isProd ? { rejectUnauthorized: false } : false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
