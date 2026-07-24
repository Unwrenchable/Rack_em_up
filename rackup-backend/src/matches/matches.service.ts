import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoolMatch } from './pool-match.entity';
import { CreatePoolMatchDto } from './dto/create-pool-match.dto';
import { ReportPoolMatchDto } from './dto/report-pool-match.dto';
import { MemoriesService } from '../memories/memories.service';
import { RatingService } from '../users/rating.service';
import { MatchesGateway } from './matches.gateway';
import { ScorekeepingService } from '../scorekeeping/scorekeeping.service';
import { RealaiV2Service } from '../realai/v2/realai-v2.service';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectRepository(PoolMatch)
    private readonly matchesRepo: Repository<PoolMatch>,
    private readonly memoriesService: MemoriesService,
    private readonly ratingService: RatingService,
    private readonly matchesGateway: MatchesGateway,
    private readonly scorekeeping: ScorekeepingService,
    private readonly realaiV2: RealaiV2Service,
  ) {}

  // Create a new match (from matchmaking or manual)
  async create(dto: CreatePoolMatchDto): Promise<PoolMatch> {
    if (dto.playerAId === dto.playerBId) {
      throw new BadRequestException('Players must be different');
    }

    const created = this.matchesRepo.create({
      playerAId: dto.playerAId,
      playerBId: dto.playerBId,
      hallId: dto.hallId ?? null,
      game: dto.game,
      raceTo: dto.raceTo,
      status: 'PENDING',
      aScore: null,
      bScore: null,
    });

    const saved = await this.matchesRepo.save(created);

    this.matchesGateway.emitMatchCreated(saved);

    return saved;
  }

  async findOne(id: string): Promise<PoolMatch> {
    const match = await this.matchesRepo.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  // Player accepts match → once both accept, match becomes ACTIVE
  async acceptMatch(id: string, userId: string): Promise<PoolMatch> {
    const match = await this.findOne(id);

    if (match.status !== 'PENDING') {
      throw new BadRequestException('Match is not pending');
    }

    if (match.playerAId !== userId && match.playerBId !== userId) {
      throw new BadRequestException('You are not part of this match');
    }

    // Track acceptance without schema changes
    (match as any).accepted = (match as any).accepted || {};
    (match as any).accepted[userId] = true;

    const aAccepted = (match as any).accepted[match.playerAId];
    const bAccepted = (match as any).accepted[match.playerBId];

    if (aAccepted && bAccepted) {
      match.status = 'ACTIVE';
      const saved = await this.matchesRepo.save(match);
      this.matchesGateway.emitMatchStarted(saved);
      return saved;
    }

    return this.matchesRepo.save(match);
  }

  // Cancel match
  async cancelMatch(id: string, userId: string): Promise<PoolMatch> {
    const match = await this.findOne(id);

    if (match.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed match');
    }

    if (match.playerAId !== userId && match.playerBId !== userId) {
      throw new BadRequestException('You are not part of this match');
    }

    match.status = 'CANCELLED';
    const saved = await this.matchesRepo.save(match);

    this.matchesGateway.emitMatchCancelled(saved);

    return saved;
  }

  // Report final score
  async reportResult(id: string, dto: ReportPoolMatchDto): Promise<PoolMatch> {
    const match = await this.findOne(id);

    if (match.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot report result for status=${match.status}`,
      );
    }

    if (dto.aScore === dto.bScore) {
      throw new BadRequestException('Tie scores are not allowed');
    }

    if (dto.aScore > match.raceTo || dto.bScore > match.raceTo) {
      throw new BadRequestException('Score exceeds race limit');
    }

    match.aScore = dto.aScore;
    match.bScore = dto.bScore;
    match.status = 'COMPLETED';

    const saved = await this.matchesRepo.save(match);

    const aWins = saved.aScore! > saved.bScore!;

    await this.memoriesService.createForMatchParticipants({
      matchId: saved.id,
      matchType: 'STANDARD',
      participantAId: saved.playerAId,
      participantBId: saved.playerBId,
      aIsWinner: aWins,
      bIsWinner: !aWins,
      game: saved.game,
      raceTo: saved.raceTo,
      scorelineA: { score: saved.aScore, opponentScore: saved.bScore },
      scorelineB: { score: saved.bScore, opponentScore: saved.aScore },
    });

    await this.ratingService.applyMatchResult(
      aWins ? saved.playerAId : saved.playerBId,
      aWins ? saved.playerBId : saved.playerAId,
    );

    await this.scorekeeping.emitScoreUpdate({
      domain: 'standard',
      entityId: saved.id,
      matchId: saved.id,
      playerAId: saved.playerAId,
      playerBId: saved.playerBId,
      aScore: saved.aScore ?? 0,
      bScore: saved.bScore ?? 0,
      winnerId: aWins ? saved.playerAId : saved.playerBId,
      hallId: saved.hallId,
    });

    void this.realaiV2
      .submitSummaryJob({
        matchId: saved.id,
        context: `standard:${saved.game}`,
      })
      .catch((e) => this.logger.warn(`summary job: ${e}`));

    this.matchesGateway.emitMatchCompleted(saved);

    return saved;
  }

  // List matches for a user
  async listForUser(userId: string): Promise<PoolMatch[]> {
    return this.matchesRepo.find({
      where: [{ playerAId: userId }, { playerBId: userId }],
      order: { createdAt: 'DESC' },
    });
  }
}
