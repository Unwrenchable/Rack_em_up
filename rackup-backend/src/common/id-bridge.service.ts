import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRedisClient } from '../config/redis.config';
import { keyForIdBridgeV2 } from './redis-keys';
import { IdBridge, IdBridgeKind } from './id-bridge.entity';

@Injectable()
export class IdBridgeService {
  private readonly logger = new Logger(IdBridgeService.name);

  constructor(
    @InjectRepository(IdBridge)
    private readonly repo: Repository<IdBridge>,
  ) {}

  async link(
    kind: IdBridgeKind,
    v1Id: string,
    v2Id: string,
    meta?: Record<string, unknown>,
  ): Promise<IdBridge> {
    if (!v1Id || !v2Id) throw new BadRequestException('v1Id and v2Id required');
    if (v1Id === v2Id) {
      // Allow identity map for gradual migration
    }

    let row = await this.repo.findOne({ where: { kind, v1Id } });
    if (row) {
      row.v2Id = v2Id;
      row.meta = meta ?? row.meta ?? null;
    } else {
      row = this.repo.create({ kind, v1Id, v2Id, meta: meta ?? null });
    }
    const saved = await this.repo.save(row);
    await this.cache(saved);
    return saved;
  }

  async resolveV2(kind: IdBridgeKind, v1Id: string): Promise<string | null> {
    const cached = await this.cacheGet(kind, 'v1', v1Id);
    if (cached) return cached;

    const row = await this.repo.findOne({ where: { kind, v1Id } });
    if (!row) return null;
    await this.cache(row);
    return row.v2Id;
  }

  async resolveV1(kind: IdBridgeKind, v2Id: string): Promise<string | null> {
    const cached = await this.cacheGet(kind, 'v2', v2Id);
    if (cached) return cached;

    const row = await this.repo.findOne({ where: { kind, v2Id } });
    if (!row) return null;
    await this.cache(row);
    return row.v1Id;
  }

  /** Resolve V2 id, falling back to the input id if no bridge exists (identity). */
  async resolveV2OrSelf(kind: IdBridgeKind, id: string): Promise<string> {
    return (await this.resolveV2(kind, id)) ?? id;
  }

  async requireV2(kind: IdBridgeKind, v1Id: string): Promise<string> {
    const v2 = await this.resolveV2(kind, v1Id);
    if (!v2) {
      throw new NotFoundException(
        `No ${kind} V1→V2 bridge for ${v1Id}. Link via IdBridgeService.link first.`,
      );
    }
    return v2;
  }

  async list(kind?: IdBridgeKind): Promise<IdBridge[]> {
    if (kind) return this.repo.find({ where: { kind }, order: { createdAt: 'DESC' } });
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  private async cache(row: IdBridge): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.set(keyForIdBridgeV2(row.kind, 'v1', row.v1Id), row.v2Id, {
        EX: 60 * 60 * 24 * 7,
      });
      await redis.set(keyForIdBridgeV2(row.kind, 'v2', row.v2Id), row.v1Id, {
        EX: 60 * 60 * 24 * 7,
      });
    } catch (e) {
      this.logger.warn(`id-bridge cache failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  private async cacheGet(
    kind: IdBridgeKind,
    side: 'v1' | 'v2',
    id: string,
  ): Promise<string | null> {
    try {
      const redis = await getRedisClient();
      return (await redis.get(keyForIdBridgeV2(kind, side, id))) ?? null;
    } catch {
      return null;
    }
  }
}
