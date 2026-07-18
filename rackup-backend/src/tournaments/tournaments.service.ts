import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './tournament.entity';
import { TournamentMatch } from './tournament-match.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { RegisterTournamentDto } from './dto/register-tournament.dto';
import { ReportMatchDto } from './dto/report-match.dto';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,

    @InjectRepository(TournamentMatch)
    private matchRepo: Repository<TournamentMatch>,
  ) {}

  // -------------------------------------------------------
  // CREATE TOURNAMENT
  // -------------------------------------------------------
  async createTournament(dto: CreateTournamentDto) {
    const tournament = this.tournamentRepo.create({
      name: dto.name,
      game: dto.game,
      format: 'single-elimination',
      configJson: {
        entrants: dto.entrants,
      },
    });

    await this.tournamentRepo.save(tournament);

    await this.seedSingleElimination(tournament);

    return tournament;
  }

  // -------------------------------------------------------
  // SEED SINGLE ELIMINATION BRACKET
  // -------------------------------------------------------
  private async seedSingleElimination(tournament: Tournament) {
    const entrants = tournament.configJson.entrants;
    const size = this.nextPowerOfTwo(entrants.length);
    const seeded = [...entrants, ...new Array(size - entrants.length).fill(null)];

    const matches = [];

    for (let i = 0; i < seeded.length; i += 2) {
      const match = this.matchRepo.create({
        tournamentId: tournament.id,
        round: 1,
        matchIndex: i / 2 + 1,
        playerAId: seeded[i],
        playerBId: seeded[i + 1],
        status: 'ACTIVE',
        bracket: 'WINNERS',
        aScore: null,
        bScore: null,
      });

      matches.push(await this.matchRepo.save(match));
    }

    return matches;
  }

  private nextPowerOfTwo(n: number) {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  // -------------------------------------------------------
  // REGISTER PLAYER
  // -------------------------------------------------------
  async register(dto: RegisterTournamentDto) {
    const tournament = await this.tournamentRepo.findOneBy({
      id: dto.tournament_id,
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    tournament.configJson.entrants.push(dto.user_id);

    await this.tournamentRepo.save(tournament);

    return { success: true };
  }

  // -------------------------------------------------------
  // GET BRACKET
  // -------------------------------------------------------
  async getBracket(id: string) {
    const tournament = await this.tournamentRepo.findOneBy({ id });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const matches = await this.matchRepo.find({
      where: { tournamentId: id },
      order: { round: 'ASC', matchIndex: 'ASC' },
    });

    return {
      tournament,
      matches,
    };
  }

  // -------------------------------------------------------
  // REPORT MATCH RESULT
  // -------------------------------------------------------
  async reportMatch(dto: ReportMatchDto) {
    const match = await this.matchRepo.findOneBy({ id: dto.match_id });
    if (!match) throw new NotFoundException('Match not found');

    match.aScore = dto.a_score;
    match.bScore = dto.b_score;
    match.status = 'COMPLETED';

    await this.matchRepo.save(match);

    return { success: true };
  }

  // -------------------------------------------------------
  // ADVANCE ROUND
  // -------------------------------------------------------
  async advanceRound(tournamentId: string) {
    const matches = await this.matchRepo.find({
      where: { tournamentId },
      order: { round: 'ASC', matchIndex: 'ASC' },
    });

    const lastRound = Math.max(...matches.map((m) => m.round));
    const completed = matches.filter((m) => m.round === lastRound);

    if (completed.some((m) => m.status !== 'COMPLETED')) {
      throw new BadRequestException('Not all matches completed');
    }

    const winners = completed.map((m) =>
      m.aScore > m.bScore ? m.playerAId : m.playerBId,
    );

    const nextRound = lastRound + 1;

    for (let i = 0; i < winners.length; i += 2) {
      const match = this.matchRepo.create({
        tournamentId,
        round: nextRound,
        matchIndex: i / 2 + 1,
        playerAId: winners[i],
        playerBId: winners[i + 1] ?? null,
        status: 'ACTIVE',
        bracket: 'WINNERS',
        aScore: null,
        bScore: null,
      });

      await this.matchRepo.save(match);
    }

    return { success: true };
  }
}
