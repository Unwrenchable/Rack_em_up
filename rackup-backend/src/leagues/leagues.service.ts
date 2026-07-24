import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { League, LeagueStatus } from './leagues.entity';
import { LeagueTeam } from './league_teams.entity';
import { CreateLeagueDto } from './dto/create-league.dto';
import { CreateLeagueTeamDto } from './dto/create-league-team.dto';

@Injectable()
export class LeaguesService {
  constructor(
    @InjectRepository(League)
    private readonly leagueRepo: Repository<League>,

    @InjectRepository(LeagueTeam)
    private readonly leagueTeamRepo: Repository<LeagueTeam>,
  ) {}

  /**
   * controller currently passes (dto, userId)
   * NOTE: League has organizerId + hallId, not ownerId.
   */
  async listLeagues(): Promise<League[]> {
    return this.leagueRepo.find({
      order: { createdAt: 'DESC' },
      take: 40,
    });
  }

  async createLeague(dto: CreateLeagueDto, userId: string): Promise<League> {
    const league = this.leagueRepo.create({
      ...dto,
      organizerId: userId,
      status: 'ACTIVE' satisfies LeagueStatus,
    });

    return this.leagueRepo.save(league);
  }

  async getLeague(id: string): Promise<League | null> {
    return this.leagueRepo.findOne({
      where: { id },
      relations: ['teams'],
    });
  }

  async createTeam(
    leagueId: string,
    dto: CreateLeagueTeamDto,
  ): Promise<LeagueTeam> {
    const team = this.leagueTeamRepo.create({
      ...dto,
      leagueId,
    });

    return this.leagueTeamRepo.save(team);
  }

  async listTeams(leagueId: string): Promise<LeagueTeam[]> {
    return this.leagueTeamRepo.find({
      where: { leagueId },
    });
  }

  async setLeagueStatus(
    leagueId: string,
    status: LeagueStatus,
  ): Promise<League> {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId } });

    if (!league) {
      throw new NotFoundException('League not found');
    }

    league.status = status;
    return this.leagueRepo.save(league);
  }
}
