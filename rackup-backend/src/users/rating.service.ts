import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';

/** Simple Elo (K=24) for pool matches. */
@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async applyMatchResult(winnerId: string, loserId: string): Promise<void> {
    if (!winnerId || !loserId || winnerId === loserId) return;

    const [winner, loser] = await Promise.all([
      this.usersRepo.findOne({ where: { id: winnerId } }),
      this.usersRepo.findOne({ where: { id: loserId } }),
    ]);
    if (!winner || !loser) return;

    const K = 24;
    const expectedW =
      1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const expectedL = 1 - expectedW;

    winner.rating = Math.round(winner.rating + K * (1 - expectedW));
    loser.rating = Math.max(100, Math.round(loser.rating + K * (0 - expectedL)));

    // Light reputation nudge for completing a verified result
    winner.reputation = Math.min(100, (winner.reputation ?? 0) + 1);

    await this.usersRepo.save([winner, loser]);
  }
}