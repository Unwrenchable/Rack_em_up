import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CreateMatchmakingRequestDto } from './dto/create-matchmaking-request.dto';
import { SearchMatchmakingDto } from './dto/search-matchmaking.dto';
import { ChallengePlayerDto } from './dto/challenge-player.dto';
import { MatchmakingRequest } from './matchmaking.entity';
import { MatchmakingRequestV2 } from './v2/entities/matchmaking-request-v2.entity';
import { MatchesService } from '../matches/matches.service';
import { MatchmakingGateway } from './matchmaking.gateway';
import { ChatService } from '../chat/chat.service';
import { UsersService } from '../users/users.service';
import {
  LOOKING_TTL_MS,
  LookingBoardRow,
  mergeLookingByUser,
  rankLookingCandidate,
} from './looking-board.util';

@Injectable()
export class MatchmakingService {
  constructor(
    @InjectRepository(MatchmakingRequest)
    private readonly matchmakingRepo: Repository<MatchmakingRequest>,
    @InjectRepository(MatchmakingRequestV2)
    private readonly v2RequestsRepo: Repository<MatchmakingRequestV2>,
    private readonly matchesService: MatchesService,
    private readonly matchmakingGateway: MatchmakingGateway,
    private readonly chat: ChatService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Upsert the caller's V1 looking row and refresh expiry.
   * Repeat POSTs from smoke / Go live used to return a stale expired row
   * (`expiresAt < now+30m` matched everything), which then vanished from search.
   */
  async createRequest(
    dto: CreateMatchmakingRequestDto,
    userId: string,
  ): Promise<MatchmakingRequest> {
    const now = Date.now();
    const expiresAt = new Date(now + LOOKING_TTL_MS);
    const uid = String(userId);

    const existing = await this.matchmakingRepo.findOne({
      where: { userId: uid },
      order: { createdAt: 'DESC' },
    });

    if (existing) {
      existing.lat = dto.lat;
      existing.lon = dto.lon;
      existing.game = dto.game;
      existing.stakes = dto.stakes;
      existing.minRating = dto.min_rating;
      existing.maxRating = dto.max_rating;
      existing.expiresAt = expiresAt;
      const saved = await this.matchmakingRepo.save(existing);
      this.matchmakingGateway.emitRequestCreated(uid, saved);
      return saved;
    }

    const entity = this.matchmakingRepo.create({
      userId: uid,
      lat: dto.lat,
      lon: dto.lon,
      game: dto.game,
      stakes: dto.stakes,
      minRating: dto.min_rating,
      maxRating: dto.max_rating,
      expiresAt,
    });

    const saved = await this.matchmakingRepo.save(entity);
    this.matchmakingGateway.emitRequestCreated(uid, saved);
    return saved;
  }

  async cancelRequest(id: string, userId: string) {
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

  async search(dto: SearchMatchmakingDto): Promise<LookingBoardRow[]> {
    const v1 = await this.searchV1(dto);
    const v2 = await this.searchV2Pending(dto);
    return mergeLookingByUser([...v1, ...v2]);
  }

  private async searchV1(dto: SearchMatchmakingDto): Promise<LookingBoardRow[]> {
    const qb = this.matchmakingRepo
      .createQueryBuilder('lfm')
      .leftJoinAndSelect('lfm.user', 'user')
      .where('lfm.expires_at > NOW()');

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

    const entities = await qb.getMany();
    const radius = Number(dto.radius) || 0;

    return entities
      .map((entity) => this.toBoardRow(dto, {
        id: entity.id,
        userId: entity.userId,
        lat: Number(entity.lat),
        lon: Number(entity.lon),
        game: entity.game,
        stakes: entity.stakes,
        minRating: entity.minRating,
        maxRating: entity.maxRating,
        createdAt: entity.createdAt,
        expiresAt: entity.expiresAt,
        source: 'v1',
      }))
      .filter((row) => radius <= 0 || row.distance_meters <= radius);
  }

  /**
   * V2 enqueue is the Find "Go live" primary path. Those rows live in
   * matchmaking_request_v2 — without this union the Available now board stays empty.
   */
  private async searchV2Pending(dto: SearchMatchmakingDto): Promise<LookingBoardRow[]> {
    const qb = this.v2RequestsRepo
      .createQueryBuilder('v2')
      .where('v2.expires_at > NOW()')
      .andWhere('v2.status = :status', { status: 'PENDING' });

    if (dto.game) qb.andWhere('v2.game = :game', { game: dto.game });
    if (dto.stakes) qb.andWhere('v2.stakes = :stakes', { stakes: dto.stakes });

    if (dto.min_rating !== undefined) {
      qb.andWhere('v2.maxRating >= :minRatingFilter', {
        minRatingFilter: dto.min_rating,
      });
    }

    if (dto.max_rating !== undefined) {
      qb.andWhere('v2.minRating <= :maxRatingFilter', {
        maxRatingFilter: dto.max_rating,
      });
    }

    const entities = await qb.getMany();
    const radius = Number(dto.radius) || 0;

    return entities
      .map((entity) => this.toBoardRow(dto, {
        id: entity.id,
        userId: entity.userId,
        lat: Number(entity.lat),
        lon: Number(entity.lon),
        game: entity.game,
        stakes: entity.stakes,
        minRating: entity.minRating,
        maxRating: entity.maxRating,
        createdAt: entity.createdAt,
        expiresAt: entity.expiresAt,
        source: 'v2',
      }))
      .filter((row) => radius <= 0 || row.distance_meters <= radius);
  }

  private toBoardRow(
    dto: SearchMatchmakingDto,
    entity: {
      id: string;
      userId: string;
      lat: number;
      lon: number;
      game: string;
      stakes: string;
      minRating: number;
      maxRating: number;
      createdAt: Date;
      expiresAt: Date;
      source: 'v1' | 'v2';
    },
  ): LookingBoardRow {
    const ranked = rankLookingCandidate({
      searchLat: dto.lat,
      searchLon: dto.lon,
      entityLat: entity.lat,
      entityLon: entity.lon,
      minRating: entity.minRating,
      maxRating: entity.maxRating,
      stakes: entity.stakes,
      desiredStakes: dto.stakes,
      desiredMinRating: dto.min_rating,
      desiredMaxRating: dto.max_rating,
    });

    return {
      id: entity.id,
      user_id: entity.userId,
      game: entity.game,
      stakes: entity.stakes,
      min_rating: entity.minRating,
      max_rating: entity.maxRating,
      distance_meters: ranked.distanceMeters,
      ratingProximity: ranked.ratingProximity,
      stakes_weight: ranked.stakesWeight,
      rank_score: ranked.rankScore,
      created_at: entity.createdAt,
      expires_at: entity.expiresAt,
      source: entity.source,
    };
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

  /**
   * Direct challenge: create a PENDING pool match and drop a MATCH_INVITE in DM.
   * Friendship is not required for the invite path (Find strangers can challenge).
   */
  async challenge(userId: string, dto: ChallengePlayerDto) {
    if (userId === dto.opponentId) {
      throw new BadRequestException('Cannot challenge yourself');
    }

    const opponent = await this.usersService.findById(dto.opponentId);
    if (!opponent) {
      throw new NotFoundException('Opponent not found');
    }

    const game = dto.game ?? '9-ball';
    const raceTo = dto.raceTo ?? 5;
    const stakes = dto.stakes ?? 'casual';

    const match = await this.matchesService.create({
      playerAId: userId,
      playerBId: dto.opponentId,
      game,
      raceTo,
    });

    let threadId: string | null = null;
    try {
      const thread = await this.chat.getOrCreateDm(userId, dto.opponentId, {
        allowNonFriends: true,
      });
      await this.chat.send(
        userId,
        thread.id,
        'MATCH_INVITE',
        `Challenge: ${game} race to ${raceTo} (${stakes})`,
        {
          matchId: match.id,
          game,
          stakes,
          raceTo,
          opponentId: dto.opponentId,
        },
      );
      threadId = thread.id;
    } catch {
      /* match still stands if DM is blocked */
    }

    this.matchmakingGateway.emitMatchFound(String(userId), {
      opponent: { user_id: dto.opponentId, displayName: opponent.displayName },
      match,
    });

    return {
      matchId: match.id,
      threadId,
      opponentId: dto.opponentId,
      opponentName: opponent.displayName,
      game,
      stakes,
      raceTo,
      status: match.status,
    };
  }
}
