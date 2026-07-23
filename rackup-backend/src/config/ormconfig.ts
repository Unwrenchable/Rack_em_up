import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const ormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'rackup',

  // ✅ Much better than listing every entity manually
  autoLoadEntities: true,

  synchronize: true,        // Great for development
  logging: true,            // ← Shows connection + queries
  logger: 'advanced',       // ← Detailed logs

  // Optional but recommended
  extra: {
    max: 20,                // Connection pool size
  },
};