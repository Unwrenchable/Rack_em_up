import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

const isProd = process.env.NODE_ENV === 'production';

const synchronize =
  process.env.TYPEORM_SYNC === 'true' ||
  (!isProd && process.env.TYPEORM_SYNC !== 'false');

const rawUrl = (process.env.DATABASE_URL ?? '').trim();
const useUrl = /^postgres(ql)?:\/\//i.test(rawUrl);

if (isProd && !useUrl) {
  throw new Error(
    'DATABASE_URL must be a full postgres:// connection string on Render. ' +
      'Do not set DB_HOST=base. Use the Internal Database URL from the Postgres service.',
  );
}

const ssl = isProd ? { rejectUnauthorized: false } : false;

const connection = useUrl
  ? { url: rawUrl, ssl }
  : {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'rackup',
      ssl,
    };

export const ormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  ...connection,
  autoLoadEntities: true,
  synchronize,
  logging: process.env.NODE_ENV === 'development',
  logger: 'advanced-console',
  extra: {
    max: 20,
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
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
