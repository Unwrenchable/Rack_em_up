import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getRedisClient } from '../../config/redis.config';

import { HallCheckIn } from './entities/hall-checkin.entity';
import { HallEvent } from './entities/hall-event.entity';
import { HallPhoto } from './entities/hall-photo.entity';
import { HallAdmin } from './entities/hall-admin.entity';
import { HallLeaderboardEntry } from './entities/hall-leaderboard-entry.entity';

import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CreateHallEventDto } from './dto/events/create-hall-event.dto';
import { UpdateHallEventDto } from './dto/events/update-hall-event.dto';
import { UploadHallPhotoDto } from './dto/photos/upload-hall-photo.dto';
import { CreateVegasSeedDto } from './dto/seed/create-vegas-seed.dto';
import { SeedResultDto } from './dto/seed/seed-result.dto';
import { HallSeedService } from './seed/hall-seed.service';

@Injectable()
export class HallsV2Service {
  private readonly feedKeyPrefix = 'halls:v2:feed';
  private readonly leaderboardKeyPrefix = 'halls:v2:leaderboard';

  constructor(
    @InjectRepository(HallCheckIn)
    private readonly checkinsRepo: Repository<HallCheckIn>,

    @InjectRepository(HallEvent)
    private readonly eventsRepo: Repository<HallEvent>,

    @InjectRepository(HallPhoto)
    private readonly photosRepo: Repository<HallPhoto>,

    @InjectRepository(HallAdmin)
    private readonly adminsRepo: Repository<HallAdmin>,

    @InjectRepository(HallLeaderboardEntry)
    private readonly leaderboardRepo: Repository<HallLeaderboardEntry>,

    private readonly seedService: HallSeedService,
  ) {}

  async seedVegas(dto: CreateVegasSeedDto): Promise<SeedResultDto> {
    return this.seedService.seedVegas(dto);
  }

  async checkIn(userId: string, dto: CheckInDto) {
    const hallId = dto.hallId;

    const now = new Date();

    const existingOpen = await this.checkinsRepo
      .createQueryBuilder('ci')
      .where('ci.userId = :userId', { userId })
      .andWhere('ci.hallId = :hallId', { hallId })
      .andWhere('ci.checkedOutAt IS NULL')
      .orderBy('ci.checkedInAt', 'DESC')
      .getOne();






    if (existingOpen) {
      return { hallId, userId, checkedInAt: existingOpen.checkedInAt, alreadyCheckedIn: true };
    }

    const entity = this.checkinsRepo.create({
      userId,
      hallId,
      checkedInAt: now,
      checkedOutAt: null,
    });

    const saved = await this.checkinsRepo.save(entity);

    const redis = await getRedisClient();
    // Best-effort cache invalidation
    await redis.del(`${this.feedKeyPrefix}:${hallId}`);

    return { hallId, userId, checkedInAt: saved.checkedInAt, alreadyCheckedIn: false };
  }

  async checkOut(userId: string, dto: CheckOutDto) {
    const { hallId } = dto;
    const now = new Date();

    const open = await this.checkinsRepo
      .createQueryBuilder('ci')
      .where('ci.userId = :userId', { userId })
      .andWhere('ci.hallId = :hallId', { hallId })
      .andWhere('ci.checkedOutAt IS NULL')
      .orderBy('ci.checkedInAt', 'DESC')
      .getOne();





    if (!open) throw new BadRequestException('No active check-in found');

    open.checkedOutAt = now;
    await this.checkinsRepo.save(open);

    const redis = await getRedisClient();
    await redis.del(`${this.feedKeyPrefix}:${hallId}`);

    return { hallId, userId, checkedOutAt: open.checkedOutAt };
  }

  async feed(hallId: string) {
    const redis = await getRedisClient();
    const cacheKey = `${this.feedKeyPrefix}:${hallId}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const events = await this.eventsRepo.find({ where: { hallId }, order: { createdAt: 'DESC' }, take: 50 });
    const photos = await this.photosRepo.find({ where: { hallId }, order: { createdAt: 'DESC' }, take: 50 });

    // Placeholder: shot-of-the-day integration will be plugged in later (without touching v1).
    const response = {
      hallId,
      events,
      photos,
      shotOfTheDay: null,
    };

    await redis.set(cacheKey, JSON.stringify(response), { EX: 60 });
    return response;
  }

  async createEvent(userId: string, dto: CreateHallEventDto) {
    const { hallId } = dto;

    const isAdmin = await this.adminsRepo.count({ where: { userId, hallId } });
    if (!isAdmin) throw new BadRequestException('Not authorized for this hall');

    const entity = this.eventsRepo.create(dto);
    entity.createdByUserId = userId;

    const saved = await this.eventsRepo.save(entity as HallEvent);



    const redis = await getRedisClient();
    await redis.del(`${this.feedKeyPrefix}:${hallId}`);
    await redis.del(`${this.leaderboardKeyPrefix}:${hallId}`);

    return saved;
  }

  async updateEvent(userId: string, dto: UpdateHallEventDto) {
    const { hallId, eventId } = dto;

    const isAdmin = await this.adminsRepo.count({ where: { userId, hallId } });
    if (!isAdmin) throw new BadRequestException('Not authorized for this hall');

    const event = await this.eventsRepo.findOne({ where: { id: eventId, hallId } });
    if (!event) throw new BadRequestException('Event not found');

    Object.assign(event, dto);
    (event as any).updatedByUserId = userId;

    const saved = await this.eventsRepo.save(event);

    const redis = await getRedisClient();
    await redis.del(`${this.feedKeyPrefix}:${hallId}`);

    return saved;
  }

  async uploadPhoto(userId: string, dto: UploadHallPhotoDto) {
    const { hallId } = dto;

    // For now, allow hall admin to upload; later can support any authenticated user.
    const isAdmin = await this.adminsRepo.count({ where: { userId, hallId } });
    if (!isAdmin) throw new BadRequestException('Not authorized for this hall');

    const photo = this.photosRepo.create({
      hallId,
      userId,
      photoUrl: dto.photoUrl,
      caption: dto.caption ?? null,
    });

    const saved = await this.photosRepo.save(photo);

    const redis = await getRedisClient();
    await redis.del(`${this.feedKeyPrefix}:${hallId}`);

    return saved;
  }

  async leaderboard(hallId: string) {
    const redis = await getRedisClient();
    const cacheKey = `${this.leaderboardKeyPrefix}:${hallId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Minimal viable leaderboard: order by ELO desc then activity desc.
    const entries = await this.leaderboardRepo.find({
      where: { hallId },
      order: { elo: 'DESC', activityScore: 'DESC' },
      take: 50,
    });

    const response = { hallId, entries };
    await redis.set(cacheKey, JSON.stringify(response), { EX: 60 });
    return response;
  }
}

