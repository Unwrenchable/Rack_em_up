import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tournament } from '../tournaments.entity';

@Injectable()
export class TournamentRepository {
  constructor(
    @InjectRepository(Tournament)
    private readonly repo: Repository<Tournament>,
    private readonly dataSource: DataSource,
  ) {}

  async findByTournamentId(tournamentId: string): Promise<Tournament | null> {
    return this.repo.findOneBy({ id: tournamentId });
  }

  async findByRound(round: number): Promise<Tournament[]> {
    return this.repo
      .createQueryBuilder('t')
      .innerJoin('t.matches', 'm')
      .where('m.round = :round', { round })
      .getMany();
  }

  async findByPlayerId(playerId: string): Promise<Tournament[]> {
    return this.repo
      .createQueryBuilder('t')
      .innerJoin('t.matches', 'm')
      .where('m.playerAId = :playerId OR m.playerBId = :playerId', { playerId })
      .getMany();
  }

  async createTournament(partial: Partial<Tournament>): Promise<Tournament> {
    const entity = this.repo.create(partial);
    return this.repo.save(entity);
  }
}

