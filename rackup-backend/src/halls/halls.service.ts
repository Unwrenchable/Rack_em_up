import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { Hall } from './hall.entity';
import { HallCheckin } from './hall-checkin.entity';
import { CheckInDto } from './dto/check-in.dto';
import { ClaimHallDto } from './dto/claim-hall.dto';
import { User } from '../users/users.entity';
import { MoneyMatch } from '../money-matches/money-matches.entity';
import { PoolMatch } from '../matches/pool-match.entity';
import { getRedisClient } from '../config/redis.config';

const CHECKIN_TTL_MS = 4 * 60 * 60 * 1000;
const LIVE_CACHE_KEY = 'halls:live:v1';
const LIVE_CACHE_TTL_SEC = 20;

export type PulseStatus = 'BUSY' | 'MODERATE' | 'QUIET';

export type LiveHallRow = {
  hallId: string;
  name: string;
  lat: number;
  lon: number;
  activePlayerCount: number;
  averageRating: number | null;
  gameTypes: string[];
  activeMatchCount: number;
  pulseStatus: PulseStatus;
};

@Injectable()
export class HallsService {
  constructor(
    @InjectRepository(Hall)
    private readonly hallsRepo: Repository<Hall>,
    @InjectRepository(HallCheckin)
    private readonly checkinsRepo: Repository<HallCheckin>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(MoneyMatch)
    private readonly moneyMatchesRepo: Repository<MoneyMatch>,
    @InjectRepository(PoolMatch)
    private readonly poolMatchesRepo: Repository<PoolMatch>,
  ) {}

  private placeKey(lat: number, lon: number): string {
    return `${lat.toFixed(4)}:${lon.toFixed(4)}`;
  }

  private pulseStatus(playerCount: number, activeMatches: number): PulseStatus {
    if (playerCount >= 8 || activeMatches >= 3) return 'BUSY';
    if (playerCount >= 3) return 'MODERATE';
    return 'QUIET';
  }

  async findAll(): Promise<Hall[]> {
    return this.hallsRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Hall> {
    const hall = await this.hallsRepo.findOne({ where: { id } });
    if (!hall) throw new NotFoundException('Hall not found');
    return hall;
  }

  async checkIn(userId: string, dto: CheckInDto): Promise<{ hall: Hall; checkin: HallCheckin }> {
    let hall: Hall | null = null;

    if (dto.hallId) {
      hall = await this.hallsRepo.findOne({ where: { id: dto.hallId } });
      if (!hall) throw new NotFoundException('Hall not found');
    } else {
      const key = this.placeKey(dto.lat, dto.lon);
      hall = await this.hallsRepo.findOne({ where: { placeKey: key } });
      if (!hall) {
        hall = await this.hallsRepo.save(
          this.hallsRepo.create({
            name: dto.name,
            lat: dto.lat,
            lon: dto.lon,
            placeKey: key,
            address: null,
            tableCount: null,
            ownerUserId: null,
            isVerified: false,
          }),
        );
      }
    }

    const expiresAt = new Date(Date.now() + CHECKIN_TTL_MS);

    await this.checkinsRepo.delete({ hallId: hall.id, userId });

    const checkin = await this.checkinsRepo.save(
      this.checkinsRepo.create({
        hallId: hall.id,
        userId,
        game: dto.game ?? null,
        expiresAt,
      }),
    );

    try {
      const redis = await getRedisClient();
      await redis.del(LIVE_CACHE_KEY);
    } catch {
      // cache invalidation is best-effort
    }

    return { hall, checkin };
  }

  async claimHall(hallId: string, ownerUserId: string, dto: ClaimHallDto): Promise<Hall> {
    const hall = await this.findOne(hallId);
    hall.ownerUserId = ownerUserId;
    if (dto.address !== undefined) hall.address = dto.address;
    if (dto.tableCount !== undefined) hall.tableCount = dto.tableCount;
    return this.hallsRepo.save(hall);
  }

  async getLiveActivity(): Promise<LiveHallRow[]> {
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(LIVE_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as LiveHallRow[];
      }
    } catch {
      // fall through to DB
    }

    const now = new Date();
    const checkins = await this.checkinsRepo.find({
      where: { expiresAt: MoreThan(now) },
    });

    if (checkins.length === 0) {
      return [];
    }

    const byHall = new Map<string, HallCheckin[]>();
    for (const c of checkins) {
      const list = byHall.get(c.hallId) ?? [];
      list.push(c);
      byHall.set(c.hallId, list);
    }

    const hallIds = [...byHall.keys()];
    const halls = await this.hallsRepo.find({ where: { id: In(hallIds) } });
    const hallById = new Map(halls.map((h) => [h.id, h]));

    const allUserIds = [...new Set(checkins.map((c) => c.userId))];
    const users = await this.usersRepo.find({ where: { id: In(allUserIds) } });
    const ratingByUser = new Map(users.map((u) => [u.id, u.rating]));

    const rows: LiveHallRow[] = [];

    for (const hallId of hallIds) {
      const hall = hallById.get(hallId);
      if (!hall) continue;

      const hallCheckins = byHall.get(hallId) ?? [];
      const userIds = [...new Set(hallCheckins.map((c) => c.userId))];
      const ratings = userIds
        .map((id) => ratingByUser.get(id))
        .filter((r): r is number => typeof r === 'number');
      const averageRating =
        ratings.length > 0
          ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
          : null;

      const gameTypes = [
        ...new Set(
          hallCheckins.map((c) => c.game).filter((g): g is string => !!g && g.length > 0),
        ),
      ];

      const [moneyActive, poolActive] = await Promise.all([
        this.moneyMatchesRepo.count({ where: { hallId, status: 'ACTIVE' } }),
        this.poolMatchesRepo.count({
          where: { hallId, status: In(['PENDING', 'ACTIVE']) },
        }),
      ]);
      const activeMatchCount = moneyActive + poolActive;
      const activePlayerCount = userIds.length;

      rows.push({
        hallId: hall.id,
        name: hall.name,
        lat: hall.lat,
        lon: hall.lon,
        activePlayerCount,
        averageRating,
        gameTypes,
        activeMatchCount,
        pulseStatus: this.pulseStatus(activePlayerCount, activeMatchCount),
      });
    }

    rows.sort((a, b) => b.activePlayerCount - a.activePlayerCount);

    try {
      const redis = await getRedisClient();
      await redis.setEx(LIVE_CACHE_KEY, LIVE_CACHE_TTL_SEC, JSON.stringify(rows));
    } catch {
      // ignore
    }

    return rows;
  }
}