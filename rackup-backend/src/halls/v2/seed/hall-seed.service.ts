import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
    let updatedCount = 0;

    for (const hall of (vegasHalls as any).halls) {
      const existing = await this.hallsRepo.findOne({
        where: { name: hall.name },
      });

      if (existing) {
        // Update location + address on existing hall
        existing.lat = hall.location?.lat ?? existing.lat;
        existing.lon = hall.location?.lng ?? existing.lon;
        existing.address = hall.address ?? existing.address;
        existing.tableCount = hall.tables ?? existing.tableCount;
        existing.placeKey = hall.id ?? existing.placeKey;
        existing.isVerified = true;

        await this.hallsRepo.save(existing);
        updatedCount++;
        continue;
      }

      // Create new hall
      const newHall = this.hallsRepo.create({
        name: hall.name,
        lat: hall.location?.lat ?? 36.17,
        lon: hall.location?.lng ?? -115.14,
        address: hall.address ?? null,
        tableCount: hall.tables ?? null,
        placeKey: hall.id ?? null,
        isVerified: true,
      });

      const savedHall = await this.hallsRepo.save(newHall);
      createdCount++;

      // Create events (optional)
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
    }

    return {
      seeded: true,
      region,
      // @ts-ignore
      created: createdCount,
      // @ts-ignore
      updated: updatedCount,
    };
  }
}
