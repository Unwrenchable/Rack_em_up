import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CreateMatchmakingRequestDto } from './dto/create-matchmaking-request.dto';
import { SearchMatchmakingDto } from './dto/search-matchmaking.dto';
import { MatchmakingRequest } from './matchmaking.entity';
import { MatchesService } from '../matches/matches.service';
import { MatchmakingGateway } from './matchmaking.gateway';

@Injectable()
export class MatchmakingService {
  constructor(
    @InjectRepository(MatchmakingRequest)
    private readonly matchmakingRepo: Repository<MatchmakingRequest>,
    private readonly matchesService: MatchesService,
    private readonly matchmakingGateway: MatchmakingGateway,
  ) {}

  async createRequest(
    dto: CreateMatchmakingRequestDto,
    userId: number,
  ): Promise<MatchmakingRequest> {
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 60 * 1000);

    const existing = await this.matchmakingRepo.findOne({
      where: {
        userId: String(userId),
        expiresAt: LessThan(new Date(now + 30 * 60 * 1000)),
      },
    });

    if (existing) return existing;

    const entity = this.matchmakingRepo.create({
      userId: String(userId),
      lat: dto.lat,
      lon: dto.lon,
      game: dto.game,
      stakes: dto.stakes,
      minRating: dto.min_rating,
      maxRating: dto.max_rating,
      expiresAt,
    });

    const saved = await this.matchmakingRepo.save(entity);

    this.matchmakingGateway.emitRequestCreated(String(userId), saved);

    return saved;
  }

  async cancelRequest(id: string, userId: number) {
    const result = await this.matchmakingRepo.delete({
      id,
      userId: String(userId),
    });

    if (!result.affected) {
      throw new NotFoundException('Matchmaking request not found');
    }

    this.matchmakingGateway.emitRequestCancelled(String(userId), { id });

    return { deleted: true };
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.matchmakingRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  async search(dto: SearchMatchmakingDto) {
    const desiredRatingCenter = this.avg(
      dto.min_rating ?? 0,
      dto.max_rating ?? 1000,
    );

    const qb = this.matchmakingRepo
      .createQueryBuilder('lfm')
      .leftJoinAndSelect('lfm.user', 'user')
      .where('lfm.expires_at > NOW()')
      .andWhere(
        `
        ST_DWithin(
          ST_MakePoint(lfm.lon, lfm.lat)::geography,
          ST_MakePoint(:lon, :lat)::geography,
          :radius
        )
        `,
        {
          lon: dto.lon,
          lat: dto.lat,
          radius: dto.radius,
        },
      )
      .addSelect(
        `
        ST_DistanceSphere(
          ST_MakePoint(lfm.lon, lfm.lat),
          ST_MakePoint(:lon, :lat)
        )
        `,
        'distance_meters',
      )
      .setParameters({
        lon: dto.lon,
        lat: dto.lat,
      });

    if (dto.game) qb.andWhere('lfm.game = :game', { game: dto.game });
    if (dto.stakes) qb.andWhere('lfm.stakes = :stakes', { stakes: dto.stakes });

    if (dto.min_rating !== undefined) {
      qb.andWhere('lfm.maxRating >= :minRatingFilter', {
        minRatingFilter: dto.min_rating,
      });
    }

    if (dto.max_rating !== undefined) {
      qb.andWhere('lfm.minRating <= :maxRatingFilter', {
        maxRatingFilter: dto.max_rating,
      });
    }

    qb.orderBy('distance_meters', 'ASC');

    const { entities, raw } = await qb.getRawAndEntities();

    return entities
      .map((entity, index) => {
        const distanceMeters = Number(raw[index]?.distance_meters ?? 0);

        const candidateRatingCenter = this.avg(
          entity.minRating,
          entity.maxRating,
        );
        const ratingProximity = Math.abs(
          candidateRatingCenter - desiredRatingCenter,
        );

        const stakesWeight =
          dto.stakes && entity.stakes === dto.stakes ? 0 : 1000;

        const rankScore =
          distanceMeters * 0.5 +
          ratingProximity * 0.3 +
          stakesWeight * 0.2;

        return {
          id: entity.id,
          user_id: entity.userId,
          game: entity.game,
          stakes: entity.stakes,
          min_rating: entity.minRating,
          max_rating: entity.maxRating,
          distance_meters: distanceMeters,
          ratingProximity,

          stakes_weight: stakesWeight,
          rank_score: rankScore,
          created_at: entity.createdAt,
          expires_at: entity.expiresAt,
        };
      })
      .sort((a, b) => a.rank_score - b.rank_score);
  }

  async findBestMatch(dto: SearchMatchmakingDto) {
    const results = await this.search(dto);
    return results[0] ?? null;
  }

  async autoCreateMatch(
    requestingUserId: string,
    dto: SearchMatchmakingDto,
    raceTo: number,
    hallId?: string,
  ) {
    const best = await this.findBestMatch(dto);
    if (!best) {
      throw new NotFoundException('No suitable opponent found');
    }

    const match = await this.matchesService.create({
      playerAId: requestingUserId,
      playerBId: best.user_id,
      hallId,

      game: dto.game ?? best.game,
      raceTo,
    });

    this.matchmakingGateway.emitMatchFound(String(requestingUserId), {
      opponent: best,
      match,
    });

    return { opponent: best, match };
  }

  private avg(a: number, b: number): number {
    return (a + b) / 2;
  }
}
