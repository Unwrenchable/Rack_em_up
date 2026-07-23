import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HallAdmin } from '../entities/hall-admin.entity';
import { HallEvent } from '../entities/hall-event.entity';
import { HallLeaderboardEntry } from '../entities/hall-leaderboard-entry.entity';

import { CreateVegasSeedDto } from '../dto/seed/create-vegas-seed.dto';
import { SeedResultDto } from '../dto/seed/seed-result.dto';

import vegasHalls from './las-vegas-halls.json';



@Injectable()
export class HallSeedService {
  constructor(
    @InjectRepository(HallAdmin)
    private readonly adminsRepo: Repository<HallAdmin>,

    @InjectRepository(HallEvent)
    private readonly eventsRepo: Repository<HallEvent>,

    @InjectRepository(HallLeaderboardEntry)
    private readonly leaderboardRepo: Repository<HallLeaderboardEntry>,
  ) {}

  async seedVegas(dto: CreateVegasSeedDto): Promise<SeedResultDto> {
    // Idempotent strategy: upsert by hallId+userId for admins and hallId+title for events.
    // For now, this is a lightweight seed; future skill will expand to tournaments/events mapping.
    const region = dto.region ?? 'vegas';

    for (const hall of (vegasHalls as any).halls) {
      const hallId = hall.id;

      // Admins
      if (Array.isArray(hall.admins)) {
        for (const admin of hall.admins) {
          const existing = await this.adminsRepo.findOne({ where: { hallId, userId: admin.userId } });
          if (!existing) {
            await this.adminsRepo.save(this.adminsRepo.create({ hallId, userId: admin.userId }));
          }
        }
      }

      // Events
      if (Array.isArray(hall.events)) {
        for (const ev of hall.events) {
          const existing = await this.eventsRepo.findOne({ where: { hallId, title: ev.title } });
          if (!existing) {
            await this.eventsRepo.save(
              this.eventsRepo.create({
                hallId,
                title: ev.title,
                startsAt: ev.startsAt ? new Date(ev.startsAt) : null,
                endsAt: ev.endsAt ? new Date(ev.endsAt) : null,
                description: ev.description ?? null,
                createdByUserId: null,
                updatedByUserId: null,
              }),
            );
          }
        }
      }

      // Leaderboard entries (optional)
      if (Array.isArray(hall.leaderboard)) {
        for (const entry of hall.leaderboard) {
          const existing = await this.leaderboardRepo.findOne({ where: { hallId, userId: entry.userId } });
          if (!existing) {
            await this.leaderboardRepo.save(
              this.leaderboardRepo.create({
                hallId,
                userId: entry.userId,
                elo: typeof entry.elo === 'number' ? entry.elo : 1500,
                wins: entry.wins ?? 0,
                activityScore: entry.activityScore ?? 0,
              }),
            );
          }
        }
      }
    }

    return { seeded: true, region };
  }
}

