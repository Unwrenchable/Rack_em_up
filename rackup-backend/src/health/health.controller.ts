import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { getRedisClient } from '../config/redis.config';
import { getRealAiStatus } from '../ai/realai.client';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{
    status: string;
    db: string;
    database: string;
    redis: string;
    realai: { reachable: boolean; baseUrl: string; model: string };
  }> {
    let db = 'down';
    let database = 'Database disconnected';
    let redis = 'down';

    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
      database = 'Database connected';
    } catch {
      db = 'down';
      database = 'Database disconnected';
    }

    try {
      const client = await getRedisClient();
      const pong = await client.ping();
      redis = pong === 'PONG' ? 'up' : 'down';
    } catch {
      redis = 'down';
    }

    const realai = await getRealAiStatus();
    const status = db === 'up' && redis === 'up' ? 'ok' : 'degraded';
    return {
      status,
      db,
      database,
      redis,
      realai: {
        reachable: realai.reachable,
        baseUrl: realai.baseUrl,
        model: realai.model,
      },
    };
  }
}
