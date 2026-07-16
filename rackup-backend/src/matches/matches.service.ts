import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoolMatch } from './pool-match.entity';
import { CreatePoolMatchDto } from './dto/create-pool-match.dto';
import { ReportPoolMatchDto } from './dto/report-pool-match.dto';
import { MemoriesService } from '../memories/memories.service';
import { RatingService } from '../users/rating.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(PoolMatch)
    private readonly matchesRepo: Repository<PoolMatch>,
    private readonly memoriesService: MemoriesService,
    private readonly ratingService: RatingService,
  ) {}

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

    return this.matchesRepo.save(created);
  }

  async findOne(id: string): Promise<PoolMatch> {
    const match = await this.matchesRepo.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  async reportResult(id: string, dto: ReportPoolMatchDto): Promise<PoolMatch> {
    const match = await this.findOne(id);

    if (match.status === 'COMPLETED' || match.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot report result for status=${match.status}`);
    }

    if (dto.aScore === dto.bScore) {
      throw new BadRequestException('Tie scores are not allowed');
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

    return saved;
  }
}