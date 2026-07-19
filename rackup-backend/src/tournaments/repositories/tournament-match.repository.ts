import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TournamentMatch } from '../tournament_matches.entity';

@Injectable()
export class TournamentMatchRepository {
  constructor(
    @InjectRepository(TournamentMatch)
    private readonly repo: Repository<TournamentMatch>,
  ) {}

  async findByTournamentId(tournamentId: string): Promise<TournamentMatch[]> {
    return this.repo.find({
      where: { tournamentId },
      order: { round: 'ASC', matchIndex: 'ASC' },
    });
  }

  async findByRound(tournamentId: string, round: number): Promise<TournamentMatch[]> {
    return this.repo.find({
      where: { tournamentId, round },
      order: { matchIndex: 'ASC' },
    });
  }

  async findByPlayerId(tournamentId: string, playerId: string): Promise<TournamentMatch[]> {
    return this.repo
      .createQueryBuilder('m')
      .where('m.tournamentId = :tournamentId', { tournamentId })
      .andWhere('(m.playerAId = :playerId OR m.playerBId = :playerId)', { playerId })
      .orderBy('m.round', 'ASC')
      .addOrderBy('m.matchIndex', 'ASC')
      .getMany();
  }

  async findNextMatch(tournamentId: string, nextMatchId: string): Promise<TournamentMatch | null> {
    return this.repo.findOne({
      where: { tournamentId, id: nextMatchId },
    });
  }

  async createMatch(partial: Partial<TournamentMatch>): Promise<TournamentMatch> {
    const entity = this.repo.create(partial);
    return this.repo.save(entity);
  }

  async updateMatchStatus(matchId: string, status: string): Promise<TournamentMatch> {
    const match = await this.repo.findOneByOrFail({ id: matchId });
    match.status = status as any;
    return this.repo.save(match);
  }
}

