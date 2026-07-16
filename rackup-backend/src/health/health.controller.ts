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
    redis: string;
    realai: { reachable: boolean; baseUrl: string; model: string };
  }> {
    let db = 'down';
    let redis = 'down';

    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
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
      redis,
      realai: {
        reachable: realai.reachable,
        baseUrl: realai.baseUrl,
        model: realai.model,
      },
    };
  }
}