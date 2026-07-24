import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MoneyMatch, MoneyMatchStatus } from './money-matches.entity';
import { CreateMoneyMatchDto } from './dto/create-money-match.dto';
import { ConfirmMoneyMatchDto } from './dto/confirm-money-match.dto';
import { DisputeMoneyMatchDto } from './dto/dispute-money-match.dto';
import { CompleteMoneyMatchDto } from './dto/complete-money-match.dto';
import { MemoriesService } from '../memories/memories.service';
import { RatingService } from '../users/rating.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScorekeepingService } from '../scorekeeping/scorekeeping.service';
import { RealaiV2Service } from '../realai/v2/realai-v2.service';

export type MoneyMatchFilters = {
  status?: MoneyMatchStatus | string;
  playerId?: string;
  hallId?: string;
};

@Injectable()
export class MoneyMatchesService {
  private readonly logger = new Logger(MoneyMatchesService.name);

  constructor(
    @InjectRepository(MoneyMatch)
    private readonly moneyMatchesRepo: Repository<MoneyMatch>,
    private readonly memoriesService: MemoriesService,
    private readonly ratingService: RatingService,
    private readonly notificationsService: NotificationsService,
    private readonly scorekeeping: ScorekeepingService,
    private readonly realaiV2: RealaiV2Service,
  ) {}

  /**
   * State machine:
   * - PENDING -> ACTIVE (when both sides confirm)
   * - ACTIVE/PENDING -> DISPUTED (when dispute filed)
   * - DISPUTED -> COMPLETED (admin resolution)
   */
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
    });

    return this.moneyMatchesRepo.save(created);
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

    if (match.aConfirmed && match.bConfirmed) {
      match.status = 'ACTIVE';
      await this.notificationsService.create({
        userId: match.playerAId,
        title: 'Money match ACTIVE',
        body: `${match.game} race to ${match.raceTo} is locked in.`,
        kind: 'money',
      });
      await this.notificationsService.create({
        userId: match.playerBId,
        title: 'Money match ACTIVE',
        body: `${match.game} race to ${match.raceTo} is locked in.`,
        kind: 'money',
      });
    }

    return this.moneyMatchesRepo.save(match);
  }

  async dispute(dto: DisputeMoneyMatchDto): Promise<MoneyMatch> {
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
      },
    };

    return this.moneyMatchesRepo.save(match);
  }

  // Admin override hook (intentionally not exposed as an endpoint per your requirements)
  async adminResolve(
    matchId: string,
    resultJson: Record<string, any>,
  ): Promise<MoneyMatch> {
    const match = await this.moneyMatchesRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Money match not found');

    if (match.status !== 'DISPUTED') {
      throw new BadRequestException('Admin resolution requires status=DISPUTED');
    }

    match.status = 'COMPLETED';
    match.resultJson = resultJson;

    const saved = await this.moneyMatchesRepo.save(match);
    await this.createMemoriesIfScored(saved);
    return saved;
  }

  async complete(dto: CompleteMoneyMatchDto & { matchId: string }): Promise<MoneyMatch> {
    const match = await this.moneyMatchesRepo.findOne({ where: { id: dto.matchId } });
    if (!match) throw new NotFoundException('Money match not found');

    if (match.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot complete money match from status=${match.status}`);
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

    match.status = 'COMPLETED';
    match.resultJson = {
      aScore: dto.aScore,
      bScore: dto.bScore,
      reportedBy: dto.reportingPlayerId,
      completedAt: new Date().toISOString(),
    };

    const saved = await this.moneyMatchesRepo.save(match);
    await this.createMemoriesIfScored(saved);

    const aScore = dto.aScore;
    const bScore = dto.bScore;
    const winnerId = aScore > bScore ? saved.playerAId : saved.playerBId;
    await this.scorekeeping.emitScoreUpdate({
      domain: 'money',
      entityId: saved.id,
      matchId: saved.id,
      playerAId: saved.playerAId,
      playerBId: saved.playerBId,
      aScore,
      bScore,
      winnerId,
      hallId: saved.hallId,
    });
    void this.realaiV2
      .submitSummaryJob({
        matchId: saved.id,
        context: `money:${saved.game}`,
      })
      .catch((e) => this.logger.warn(`money summary job: ${e}`));

    return saved;
  }

  private async createMemoriesIfScored(match: MoneyMatch): Promise<void> {
    const aScore = match.resultJson?.aScore;
    const bScore = match.resultJson?.bScore;
    if (typeof aScore !== 'number' || typeof bScore !== 'number' || aScore === bScore) {
      return;
    }

    const aWins = aScore > bScore;
    await this.memoriesService.createForMatchParticipants({
      matchId: match.id,
      matchType: 'MONEY',
      participantAId: match.playerAId,
      participantBId: match.playerBId,
      aIsWinner: aWins,
      bIsWinner: !aWins,
      game: match.game,
      raceTo: match.raceTo,
      stakes: String(match.amountCents),
      scorelineA: { aScore, bScore },
      scorelineB: { aScore, bScore },
    });

    await this.ratingService.applyMatchResult(
      aWins ? match.playerAId : match.playerBId,
      aWins ? match.playerBId : match.playerAId,
    );
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
}
