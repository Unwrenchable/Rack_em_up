import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Hall } from '../../hall.entity';
import { HallAdmin } from '../entities/hall-admin.entity';
import { HallEvent } from '../entities/hall-event.entity';
import { HallLeaderboardEntry } from '../entities/hall-leaderboard-entry.entity';

import { CreateVegasSeedDto } from '../dto/seed/create-vegas-seed.dto';
import { SeedResultDto } from '../dto/seed/seed-result.dto';

import vegasHalls from './las-vegas-halls.json';

@Injectable()
export class HallSeedService {
  constructor(
    @InjectRepository(Hall)
    private readonly hallsRepo: Repository<Hall>,

    @InjectRepository(HallAdmin)
    private readonly adminsRepo: Repository<HallAdmin>,

    @InjectRepository(HallEvent)
    private readonly eventsRepo: Repository<HallEvent>,

    @InjectRepository(HallLeaderboardEntry)
    private readonly leaderboardRepo: Repository<HallLeaderboardEntry>,
  ) {}

  async seedVegas(dto: CreateVegasSeedDto): Promise<SeedResultDto> {
    const region = dto.region ?? 'vegas';
    let createdCount = 0;

    for (const hall of (vegasHalls as any).halls) {
      // Check if a hall with this name already exists (idempotent)
      const existing = await this.hallsRepo.findOne({
        where: { name: hall.name },
      });

      if (existing) {
        continue; // already seeded
      }

      // Create the real Hall record with a proper UUID
      const newHall = this.hallsRepo.create({
        name: hall.name,
        lat: hall.location?.lat ?? 36.17,
        lon: hall.location?.lng ?? -115.14,
        address: hall.address ?? null,
        tableCount: hall.tables ?? null,
        placeKey: hall.id ?? null, // keep the old string id for reference
        isVerified: true,
      });

      const savedHall = await this.hallsRepo.save(newHall);
      createdCount++;

      // Create events (these don't require real users)
      if (Array.isArray(hall.events)) {
        for (const ev of hall.events) {
          await this.eventsRepo.save(
            this.eventsRepo.create({
              hallId: savedHall.id,
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

      // Note: We skip admins and leaderboard for now because they require real user UUIDs.
      // We can add them later once real users exist.
    }

    return {
      seeded: true,
      region,
      // @ts-ignore - extra info is fine
      created: createdCount,
    };
  }
}
