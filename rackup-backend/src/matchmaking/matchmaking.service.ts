import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMatchmakingRequestDto } from './dto/create-matchmaking-request.dto';
import { SearchMatchmakingDto } from './dto/search-matchmaking.dto';
import { MatchmakingRequest } from './matchmaking.entity';

@Injectable()
export class MatchmakingService {
  constructor(
    @InjectRepository(MatchmakingRequest)
    private readonly matchmakingRepo: Repository<MatchmakingRequest>,
  ) {}

  async createRequest(
    dto: CreateMatchmakingRequestDto,
    userId: number,
  ): Promise<MatchmakingRequest> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // MatchmakingRequest.userId is stored as UUID, so cast the caller ID to string.
    // (If your JWT user.id is already UUID, keep it as-is; otherwise adjust to your actual schema.)
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

    return this.matchmakingRepo.save(entity);
  }

  async cancelRequest(
    id: string,
    userId: number,
  ): Promise<{ deleted: boolean }> {
    const result = await this.matchmakingRepo.delete({
      id,
      userId: String(userId),
    });

    if (!result.affected) {
      throw new NotFoundException('Matchmaking request not found');
    }

    return { deleted: true };
  }

  async search(
    dto: SearchMatchmakingDto,
  ): Promise<
    Array<{
      id: string;
      user_id: string;
      game: string;
      stakes: string;
      min_rating: number;
      max_rating: number;
      distance_meters: number;
      rating_proximity: number;
      rank_score: number;
      created_at: Date;
      expires_at: Date;
    }>
  > {
    const desiredRatingCenter = this.avg(
      dto.min_rating ?? 0,
      dto.max_rating ?? 1000,
    );

    const qb = this.matchmakingRepo
      .createQueryBuilder('lfm')
      .leftJoinAndSelect('lfm.user', 'user')
      .where('lfm.expiresAt > NOW()')
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

    if (dto.game) {
      qb.andWhere('lfm.game = :game', { game: dto.game });
    }

    if (dto.stakes) {
      qb.andWhere('lfm.stakes = :stakes', { stakes: dto.stakes });
    }

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

        const rankScore = distanceMeters * 0.7 + ratingProximity * 0.3;

        return {
          id: entity.id,
          user_id: entity.userId,
          game: entity.game,
          stakes: entity.stakes,
          min_rating: entity.minRating,
          max_rating: entity.maxRating,
          distance_meters: distanceMeters,
          rating_proximity: ratingProximity,
          rank_score: rankScore,
          created_at: entity.createdAt,
          expires_at: entity.expiresAt,
        };
      })
      .sort((a, b) => a.rank_score - b.rank_score);
  }

  private avg(a: number, b: number): number {
    return (a + b) / 2;
  }
}
