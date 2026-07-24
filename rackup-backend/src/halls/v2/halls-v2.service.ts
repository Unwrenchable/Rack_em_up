import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getRedisClient } from '../../config/redis.config';
import { keyForHallV2 } from '../../common/redis-keys';

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
import { ShotsService } from '../../shots/shots.service';
import { HallPhotoStorageService } from './hall-photo-storage.service';

@Injectable()
export class HallsV2Service {
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
    private readonly shotsService: ShotsService,
    private readonly photoStorage: HallPhotoStorageService,
  ) {}

  private feedKey(hallId: string) {
    return keyForHallV2(hallId, 'feed');
  }

  private leaderboardKey(hallId: string) {
    return keyForHallV2(hallId, 'leaderboard');
  }

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
    await redis.del(`${this.feedKey(hallId)}`);

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
    await redis.del(`${this.feedKey(hallId)}`);

    return { hallId, userId, checkedOutAt: open.checkedOutAt };
  }

  async feed(hallId: string) {
    const redis = await getRedisClient();
    const cacheKey = `${this.feedKey(hallId)}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const events = await this.eventsRepo.find({ where: { hallId }, order: { createdAt: 'DESC' }, take: 50 });
    const photos = await this.photosRepo.find({ where: { hallId }, order: { createdAt: 'DESC' }, take: 50 });

    let shotOfTheDay: unknown = null;
    try {
      shotOfTheDay = this.shotsService.getToday();
    } catch {
      shotOfTheDay = null;
    }

    const response = {
      hallId,
      events,
      photos,
      shotOfTheDay,
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
    await redis.del(`${this.feedKey(hallId)}`);
    await redis.del(this.leaderboardKey(hallId));

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
    await redis.del(`${this.feedKey(hallId)}`);

    return saved;
  }

  async uploadPhoto(userId: string, dto: UploadHallPhotoDto) {
    const { hallId } = dto;

    const isAdmin = await this.adminsRepo.count({ where: { userId, hallId } });
    if (!isAdmin) throw new BadRequestException('Not authorized for this hall');

    let photoUrl: string;
    try {
      photoUrl = await this.photoStorage.resolvePhotoUrl({
        hallId,
        photoUrl: dto.photoUrl,
        photoBase64: dto.photoBase64,
      });
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid photo');
    }

    const photo = this.photosRepo.create({
      hallId,
      userId,
      photoUrl,
      caption: dto.caption ?? null,
    });

    const saved = await this.photosRepo.save(photo);

    const redis = await getRedisClient();
    await redis.del(this.feedKey(hallId));

    return saved;
  }

  async listPhotos(hallId: string) {
    return this.photosRepo.find({
      where: { hallId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async leaderboard(hallId: string) {
    const redis = await getRedisClient();
    const cacheKey = this.leaderboardKey(hallId);

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

