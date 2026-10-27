import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './ormconfig';

/**
 * CLI DataSource for typeorm migration:* scripts.
 * Schema changes are migration files only (synchronize is always off here).
 * Nest boot uses ormConfig, which sets migrationsRun in production.
 */
const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
