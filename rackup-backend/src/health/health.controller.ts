import { Controller, Get, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { getRedisClient } from '../config/redis.config';
import { getRealAiStatus } from '../ai/realai.client';
import { ScorekeepingServiceV2 } from '../scorekeeping/scorekeeping-v2.service';
import { migrateLegacyRedisKeysIfPresent } from '../common/redis-migrate.util';

@Controller('health')
export class HealthController implements OnModuleInit {
  private readonly logger = new Logger('Health');
  private legacyMigrationRan = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly scorekeepingV2: ScorekeepingServiceV2,
  ) {}

  async onModuleInit(): Promise<void> {
    // Explicit boot log so ops can see DB handshake (not only GET /health)
    try {
      await this.dataSource.query('SELECT 1');
      this.logger.log('Database connected');
    } catch (e) {
      this.logger.error(
        `Database connection failed: ${e instanceof Error ? e.message : e}`,
      );
    }
    try {
      const redis = await getRedisClient();
      const pong = await redis.ping();
      this.logger.log(pong === 'PONG' ? 'Redis connected' : `Redis ping=${pong}`);
    } catch (e) {
      this.logger.warn(`Redis not reachable at boot: ${e instanceof Error ? e.message : e}`);
    }

    // Best-effort one-shot legacy Redis key migration on boot
    if (!this.legacyMigrationRan) {
      this.legacyMigrationRan = true;
      await migrateLegacyRedisKeysIfPresent();
    }
  }

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

  /**
   * Scorekeeping observability: last report processed + pending RealAI jobs.
   * GET /api/v1/health/scorekeeping
   */
  @Get('scorekeeping')
  async scorekeepingHealth() {
    const snapshot = await this.scorekeepingV2.getHealthSnapshot();
    return {
      status: 'ok',
      lastReport: snapshot.lastReport,
      pendingRealAiJobs: snapshot.pendingRealAiJobs,
      recentEventCount: snapshot.recentEventCount,
      entryPoint: 'ScorekeepingServiceV2.processReport',
    };
  }
}
