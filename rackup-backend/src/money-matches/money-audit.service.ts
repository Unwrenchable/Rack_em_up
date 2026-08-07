import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MoneyMatchAudit } from './money-match-audit.entity';
import { ScorekeepingServiceV2 } from '../scorekeeping/scorekeeping-v2.service';

@Injectable()
export class MoneyAuditService {
  private readonly logger = new Logger(MoneyAuditService.name);

  constructor(
    @InjectRepository(MoneyMatchAudit)
    private readonly auditRepo: Repository<MoneyMatchAudit>,
    private readonly scorekeepingV2: ScorekeepingServiceV2,
  ) {}

  async record(input: {
    matchId: string;
    action: string;
    actorId?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<MoneyMatchAudit> {
    const row = this.auditRepo.create({
      matchId: input.matchId,
      action: input.action,
      actorId: input.actorId ?? null,
      payload: input.payload ?? {},
    });
    const saved = await this.auditRepo.save(row);

    // Keep Redis audit in sync for live ops
    void this.scorekeepingV2
      .writeMoneyAudit({
        matchId: input.matchId,
        action: input.action,
        actorId: input.actorId,
        ...(input.payload ?? {}),
      })
      .catch((e) =>
        this.logger.warn(`redis money audit: ${e instanceof Error ? e.message : e}`),
      );

    return saved;
  }

  async listForMatch(matchId: string, limit = 100): Promise<MoneyMatchAudit[]> {
    return this.auditRepo.find({
      where: { matchId },
      order: { createdAt: 'DESC' },
      take: Math.min(500, Math.max(1, limit)),
    });
  }

  async export(filters?: {
    matchId?: string;
    action?: string;
    since?: Date;
    limit?: number;
  }): Promise<MoneyMatchAudit[]> {
    const qb = this.auditRepo.createQueryBuilder('a').orderBy('a.created_at', 'DESC');
    if (filters?.matchId) qb.andWhere('a.match_id = :matchId', { matchId: filters.matchId });
    if (filters?.action) qb.andWhere('a.action = :action', { action: filters.action });
    if (filters?.since) qb.andWhere('a.created_at >= :since', { since: filters.since });
    qb.take(Math.min(1000, filters?.limit ?? 200));
    return qb.getMany();
  }
}
