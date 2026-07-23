import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const ormConfig: TypeOrmModuleOptions = {
  type: 'postgres',

  // Prefer full connection string if available (Render / Railway style)
  url: process.env.DATABASE_URL,

  // Fallback for individual env vars (local + some hosts)
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'rackup',

  autoLoadEntities: true,

  // Important for production
  synchronize: process.env.NODE_ENV !== 'production', // false in production
  logging: process.env.NODE_ENV === 'development',
  logger: 'advanced-console',                         // ← fixed

  // Required for most hosted Postgres (Render, Railway, etc.)
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,

  extra: {
    max: 20, // connection pool
  },
};
