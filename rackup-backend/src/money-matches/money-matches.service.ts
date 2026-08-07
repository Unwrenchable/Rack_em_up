import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MoneyMatch, MoneyMatchStatus } from './money-matches.entity';
import { CreateMoneyMatchDto } from './dto/create-money-match.dto';
import { ConfirmMoneyMatchDto } from './dto/confirm-money-match.dto';
import { DisputeMoneyMatchDto } from './dto/dispute-money-match.dto';
import { CompleteMoneyMatchDto } from './dto/complete-money-match.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ScorekeepingServiceV2 } from '../scorekeeping/scorekeeping-v2.service';
import { EscrowService } from './escrow.service';
import { MoneyAuditService } from './money-audit.service';
import { User } from '../users/users.entity';
import { PushService } from '../notifications/push.service';

export type MoneyMatchFilters = {
  status?: MoneyMatchStatus | string;
  playerId?: string;
  hallId?: string;
};

type PendingResult = {
  aScore: number;
  bScore: number;
  confirmedBy: string[];
  proposedAt: string;
  proposedBy: string;
};

const ARBITER_ROLES = new Set(['ADMIN', 'HALL_OWNER', 'ORGANIZER']);

/**
 * State machine:
 * - PENDING -> ACTIVE (both stake confirms) + escrow hold
 * - ACTIVE: dual result confirm -> COMPLETED + escrow release + processReport
 * - PENDING/ACTIVE -> DISPUTED; arbiter resolve -> COMPLETED or refund
 */
@Injectable()
export class MoneyMatchesService {
  private readonly logger = new Logger(MoneyMatchesService.name);

  constructor(
    @InjectRepository(MoneyMatch)
    private readonly moneyMatchesRepo: Repository<MoneyMatch>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly scorekeepingV2: ScorekeepingServiceV2,
    private readonly escrow: EscrowService,
    private readonly audit: MoneyAuditService,
    @Optional() private readonly push?: PushService,
  ) {}

  async create(dto: CreateMoneyMatchDto): Promise<MoneyMatch> {
    const created = this.moneyMatchesRepo.create({
      playerAId: dto.playerAId,
      playerBId: dto.playerBId,
      hallId: dto.hallId,
      game: dto.game,
      raceTo: dto.raceTo,
      amountCents: dto.amountCents,
      livestreamUrl: dto.livestreamUrl ?? null,
      status: 'PENDING' as MoneyMatchStatus,
      resultJson: null,
      aConfirmed: false,
      bConfirmed: false,
      escrowStatus: 'NONE',
      escrowProvider: this.escrow.provider(),
      escrowExternalId: null,
      escrowJson: null,
    });

    const saved = await this.moneyMatchesRepo.save(created);
    await this.audit.record({
      matchId: saved.id,
      action: 'created',
      actorId: dto.playerAId,
      payload: {
        playerAId: saved.playerAId,
        playerBId: saved.playerBId,
        amountCents: Number(saved.amountCents),
        escrowProvider: saved.escrowProvider,
      },
    });
    return saved;
  }

  async confirm(dto: ConfirmMoneyMatchDto): Promise<MoneyMatch> {
    const match = await this.moneyMatchesRepo.findOne({ where: { id: dto.matchId } });
    if (!match) throw new NotFoundException('Money match not found');

    if (match.status !== 'PENDING' && match.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot confirm money match from status=${match.status}`);
    }

    if (dto.confirmingSide === 'A') {
      if (dto.confirmingPlayerId !== match.playerAId) {
        throw new BadRequestException('confirmingPlayerId does not match player A');
      }
      match.aConfirmed = true;
    } else {
      if (dto.confirmingPlayerId !== match.playerBId) {
        throw new BadRequestException('confirmingPlayerId does not match player B');
      }
      match.bConfirmed = true;
    }

    if (match.aConfirmed && match.bConfirmed && match.status === 'PENDING') {
      match.status = 'ACTIVE';

      // Hold escrow when stakes lock
      try {
        const hold = await this.escrow.hold({
          matchId: match.id,
          amountCents: Number(match.amountCents),
          playerAId: match.playerAId,
          playerBId: match.playerBId,
        });
        match.escrowStatus = hold.status;
        match.escrowProvider = hold.provider;
        match.escrowExternalId = hold.externalId;
        match.escrowJson = {
          hold,
          heldAt: hold.heldAt,
        };
        await this.audit.record({
          matchId: match.id,
          action: 'escrow_held',
          actorId: dto.confirmingPlayerId,
          payload: {
            provider: hold.provider,
            externalId: hold.externalId,
            amountCents: hold.amountCents,
          },
        });
      } catch (e) {
        match.escrowStatus = 'FAILED';
        this.logger.warn(`escrow hold failed: ${e instanceof Error ? e.message : e}`);
        await this.audit.record({
          matchId: match.id,
          action: 'escrow_hold_failed',
          actorId: dto.confirmingPlayerId,
          payload: { error: e instanceof Error ? e.message : String(e) },
        });
      }

      const activeBody = `${match.game} race to ${match.raceTo} is locked in. Escrow: ${match.escrowStatus}.`;
      if (this.push) {
        await this.push.notify({
          userId: match.playerAId,
          title: 'Money match ACTIVE',
          body: activeBody,
          kind: 'money',
        });
        await this.push.notify({
          userId: match.playerBId,
          title: 'Money match ACTIVE',
          body: activeBody,
          kind: 'money',
        });
      } else {
        await this.notificationsService.create({
          userId: match.playerAId,
          title: 'Money match ACTIVE',
          body: activeBody,
          kind: 'money',
        });
        await this.notificationsService.create({
          userId: match.playerBId,
          title: 'Money match ACTIVE',
          body: activeBody,
          kind: 'money',
        });
      }
    }

    const saved = await this.moneyMatchesRepo.save(match);
    await this.audit.record({
      matchId: saved.id,
      action: 'stake_confirm',
      actorId: dto.confirmingPlayerId,
      payload: {
        side: dto.confirmingSide,
        status: saved.status,
        aConfirmed: saved.aConfirmed,
        bConfirmed: saved.bConfirmed,
        escrowStatus: saved.escrowStatus,
      },
    });
    return saved;
  }

  async dispute(dto: DisputeMoneyMatchDto & { filedBy?: string }): Promise<MoneyMatch> {
    const match = await this.moneyMatchesRepo.findOne({ where: { id: dto.matchId } });
    if (!match) throw new NotFoundException('Money match not found');

    if (match.status !== 'PENDING' && match.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot dispute money match from status=${match.status}`);
    }

    match.status = 'DISPUTED';
    match.resultJson = {
      ...(match.resultJson ?? {}),
      dispute: {
        reason: dto.reason,
        details: dto.details ?? null,
        filedAt: new Date().toISOString(),
        filedBy: dto.filedBy ?? null,
      },
    };

    const saved = await this.moneyMatchesRepo.save(match);
    await this.audit.record({
      matchId: saved.id,
      action: 'disputed',
      actorId: dto.filedBy ?? null,
      payload: { reason: dto.reason, details: dto.details ?? null },
    });

    // Notify both players + leave trail for arbiters
    for (const uid of [match.playerAId, match.playerBId]) {
      await this.notificationsService.create({
        userId: uid,
        title: 'Money match DISPUTED',
        body: dto.reason,
        kind: 'money',
      });
    }

    return saved;
  }

  /**
   * Arbiter path: ADMIN | HALL_OWNER | ORGANIZER (or platform role).
   * complete → scores + Elo + release escrow to winner
   * refund / no_contest → refund escrow, no Elo
   */
  async resolveDispute(
    matchId: string,
    dto: ResolveDisputeDto,
    actorRole?: string,
  ): Promise<MoneyMatch> {
    await this.assertArbiter(dto.arbiterId, actorRole);

    const match = await this.moneyMatchesRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Money match not found');
    if (match.status !== 'DISPUTED') {
      throw new BadRequestException('Resolution requires status=DISPUTED');
    }

    if (dto.resolution === 'refund' || dto.resolution === 'no_contest') {
      if (match.escrowExternalId && match.escrowStatus === 'HELD') {
        const ref = await this.escrow.refund({
          matchId: match.id,
          externalId: match.escrowExternalId,
          amountCents: Number(match.amountCents),
        });
        match.escrowStatus = ref.status;
        match.escrowJson = { ...(match.escrowJson ?? {}), refund: ref };
      }
      match.status = 'COMPLETED';
      match.resultJson = {
        ...(match.resultJson ?? {}),
        resolution: dto.resolution,
        resolvedBy: dto.arbiterId,
        notes: dto.notes ?? null,
        completedAt: new Date().toISOString(),
        dualConfirmed: false,
        noElo: true,
      };
      const saved = await this.moneyMatchesRepo.save(match);
      await this.audit.record({
        matchId: saved.id,
        action: `arbiter_${dto.resolution}`,
        actorId: dto.arbiterId,
        payload: { notes: dto.notes, escrowStatus: saved.escrowStatus },
      });
      return saved;
    }

    // complete with scores
    const aScore = Number(dto.aScore);
    const bScore = Number(dto.bScore);
    if (!Number.isFinite(aScore) || !Number.isFinite(bScore) || aScore === bScore) {
      throw new BadRequestException('Arbiter complete requires non-tie aScore/bScore');
    }
    const winnerId =
      dto.winnerId ?? (aScore > bScore ? match.playerAId : match.playerBId);

    match.status = 'COMPLETED';
    match.resultJson = {
      aScore,
      bScore,
      dualConfirmed: true,
      resolvedBy: dto.arbiterId,
      resolution: 'complete',
      notes: dto.notes ?? null,
      completedAt: new Date().toISOString(),
      winnerId,
    };

    await this.releaseEscrowToWinner(match, winnerId);

    const saved = await this.moneyMatchesRepo.save(match);
    await this.audit.record({
      matchId: saved.id,
      action: 'arbiter_complete',
      actorId: dto.arbiterId,
      payload: { aScore, bScore, winnerId, notes: dto.notes },
    });
    await this.finalizeViaScorekeeping(saved, aScore, bScore, dto.arbiterId);
    return saved;
  }

  /** @deprecated use resolveDispute */
  async adminResolve(
    matchId: string,
    resultJson: Record<string, any>,
  ): Promise<MoneyMatch> {
    return this.resolveDispute(matchId, {
      arbiterId: resultJson.arbiterId ?? resultJson.resolvedBy ?? '00000000-0000-0000-0000-000000000000',
      resolution: 'complete',
      aScore: resultJson.aScore,
      bScore: resultJson.bScore,
      winnerId: resultJson.winnerId,
      notes: resultJson.notes,
    }, 'ADMIN');
  }

  async complete(dto: CompleteMoneyMatchDto & { matchId: string }): Promise<MoneyMatch> {
    const match = await this.moneyMatchesRepo.findOne({ where: { id: dto.matchId } });
    if (!match) throw new NotFoundException('Money match not found');

    if (match.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot complete money match from status=${match.status}`);
    }

    if (!match.aConfirmed || !match.bConfirmed) {
      throw new BadRequestException(
        'Both players must confirm stakes before reporting a result',
      );
    }

    if (dto.aScore === dto.bScore) {
      throw new BadRequestException('Tie scores are not allowed');
    }

    const isParticipant =
      dto.reportingPlayerId === match.playerAId ||
      dto.reportingPlayerId === match.playerBId;
    if (!isParticipant) {
      throw new BadRequestException('Only participants can report completion');
    }

    const pending = (match.resultJson?.pendingResult ?? null) as PendingResult | null;

    if (!pending) {
      const next: PendingResult = {
        aScore: dto.aScore,
        bScore: dto.bScore,
        confirmedBy: [dto.reportingPlayerId],
        proposedAt: new Date().toISOString(),
        proposedBy: dto.reportingPlayerId,
      };
      match.resultJson = {
        ...(match.resultJson ?? {}),
        pendingResult: next,
      };
      const saved = await this.moneyMatchesRepo.save(match);
      await this.audit.record({
        matchId: saved.id,
        action: 'result_proposed',
        actorId: dto.reportingPlayerId,
        payload: { aScore: dto.aScore, bScore: dto.bScore, confirmedBy: next.confirmedBy },
      });
      return saved;
    }

    if (pending.aScore !== dto.aScore || pending.bScore !== dto.bScore) {
      match.resultJson = {
        ...(match.resultJson ?? {}),
        pendingResult: {
          aScore: dto.aScore,
          bScore: dto.bScore,
          confirmedBy: [dto.reportingPlayerId],
          proposedAt: new Date().toISOString(),
          proposedBy: dto.reportingPlayerId,
        },
        lastConflict: {
          previous: pending,
          at: new Date().toISOString(),
        },
      };
      const saved = await this.moneyMatchesRepo.save(match);
      await this.audit.record({
        matchId: saved.id,
        action: 'result_conflict_reset',
        actorId: dto.reportingPlayerId,
        payload: { aScore: dto.aScore, bScore: dto.bScore },
      });
      return saved;
    }

    const confirmed = new Set(pending.confirmedBy ?? []);
    confirmed.add(dto.reportingPlayerId);

    if (!confirmed.has(match.playerAId) || !confirmed.has(match.playerBId)) {
      match.resultJson = {
        ...(match.resultJson ?? {}),
        pendingResult: {
          ...pending,
          confirmedBy: Array.from(confirmed),
        },
      };
      const saved = await this.moneyMatchesRepo.save(match);
      await this.audit.record({
        matchId: saved.id,
        action: 'result_confirm_partial',
        actorId: dto.reportingPlayerId,
        payload: { confirmedBy: Array.from(confirmed) },
      });
      return saved;
    }

    // Dual result confirmation achieved
    const winnerId = dto.aScore > dto.bScore ? match.playerAId : match.playerBId;
    match.status = 'COMPLETED';
    match.resultJson = {
      aScore: dto.aScore,
      bScore: dto.bScore,
      reportedBy: dto.reportingPlayerId,
      dualConfirmed: true,
      confirmedBy: Array.from(confirmed),
      completedAt: new Date().toISOString(),
      winnerId,
    };

    await this.releaseEscrowToWinner(match, winnerId);

    const saved = await this.moneyMatchesRepo.save(match);
    await this.audit.record({
      matchId: saved.id,
      action: 'result_dual_confirmed',
      actorId: dto.reportingPlayerId,
      payload: {
        aScore: dto.aScore,
        bScore: dto.bScore,
        confirmedBy: Array.from(confirmed),
        escrowStatus: saved.escrowStatus,
      },
    });

    await this.finalizeViaScorekeeping(saved, dto.aScore, dto.bScore, dto.reportingPlayerId);
    return saved;
  }

  async getAudit(matchId: string) {
    await this.findOne(matchId);
    return this.audit.listForMatch(matchId);
  }

  async exportAudit(filters?: { matchId?: string; action?: string; limit?: number }) {
    return this.audit.export(filters);
  }

  async findOne(id: string): Promise<MoneyMatch> {
    const match = await this.moneyMatchesRepo.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Money match not found');
    return match;
  }

  async findAll(filters?: MoneyMatchFilters): Promise<MoneyMatch[]> {
    const qb = this.moneyMatchesRepo.createQueryBuilder('m');

    if (filters?.status) qb.andWhere('m.status = :status', { status: filters.status });
    if (filters?.hallId) qb.andWhere('m.hallId = :hallId', { hallId: filters.hallId });

    if (filters?.playerId) {
      qb.andWhere('(m.playerAId = :playerId OR m.playerBId = :playerId)', {
        playerId: filters.playerId,
      });
    }

    qb.orderBy('m.createdAt', 'DESC');
    return qb.getMany();
  }

  private async releaseEscrowToWinner(match: MoneyMatch, winnerId: string): Promise<void> {
    if (match.escrowStatus !== 'HELD' || !match.escrowExternalId) {
      return;
    }
    try {
      const rel = await this.escrow.release({
        matchId: match.id,
        externalId: match.escrowExternalId,
        winnerId,
        amountCents: Number(match.amountCents),
      });
      match.escrowStatus = rel.status;
      match.escrowJson = { ...(match.escrowJson ?? {}), release: rel };
      await this.audit.record({
        matchId: match.id,
        action: 'escrow_released',
        actorId: winnerId,
        payload: { externalId: rel.externalId, winnerId },
      });
    } catch (e) {
      match.escrowStatus = 'FAILED';
      this.logger.warn(`escrow release failed: ${e instanceof Error ? e.message : e}`);
      await this.audit.record({
        matchId: match.id,
        action: 'escrow_release_failed',
        payload: { error: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  private async assertArbiter(arbiterId: string, actorRole?: string): Promise<void> {
    if (actorRole && ARBITER_ROLES.has(actorRole)) return;
    const user = await this.usersRepo.findOne({ where: { id: arbiterId } });
    if (!user || !ARBITER_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Arbiter must have role ADMIN, HALL_OWNER, or ORGANIZER',
      );
    }
  }

  private async finalizeViaScorekeeping(
    match: MoneyMatch,
    aScore: number,
    bScore: number,
    reportingPlayerId?: string,
  ): Promise<void> {
    const winnerId = aScore > bScore ? match.playerAId : match.playerBId;
    await this.scorekeepingV2.processReport({
      domain: 'money',
      matchId: match.id,
      entityId: match.id,
      playerAId: match.playerAId,
      playerBId: match.playerBId,
      aScore,
      bScore,
      winnerId,
      gameType: match.game,
      hallId: match.hallId,
      raceTo: match.raceTo,
      stakes: String(match.amountCents),
      reportingPlayerId,
    });
  }
}
