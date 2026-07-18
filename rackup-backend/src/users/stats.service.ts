import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoolMatch } from '../matches/pool-match.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(PoolMatch)
    private readonly matchesRepo: Repository<PoolMatch>,
  ) {}

  async getPlayerStats(userId: string) {
    const matches = await this.matchesRepo.find({
      where: [{ playerAId: userId }, { playerBId: userId }],
    });

    const completed = matches.filter(m => m.status === 'COMPLETED');
    const wins = completed.filter(m =>
      m.playerAId === userId ? m.aScore! > m.bScore! : m.bScore! > m.aScore!,
    ).length;

    const losses = completed.length - wins;

    const avgMargin =
      completed.reduce((sum, m) => {
        const diff =
          m.playerAId === userId
            ? m.aScore! - m.bScore!
            : m.bScore! - m.aScore!;
        return sum + diff;
      }, 0) / (completed.length || 1);

    return {
      total_matches: matches.length,
      completed_matches: completed.length,
      wins,
      losses,
      win_rate: completed.length ? wins / completed.length : 0,
      avg_margin: avgMargin,
    };
  }
}
