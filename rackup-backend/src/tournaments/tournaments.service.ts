import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { RegisterTournamentDto } from "./dto/register-tournament.dto";
import { ReportTournamentMatchDto } from "./dto/report-tournament-match.dto";
import {
  Tournament,
  TournamentFormat,
  TournamentStatus,
} from "./tournaments.entity";
import {
  TournamentMatch,
  TournamentBracketSide,
  TournamentMatchStatus,
} from "./tournament_matches.entity";

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,

    @InjectRepository(TournamentMatch)
    private matchRepo: Repository<TournamentMatch>,
  ) {}

  async listTournaments() {
    return this.tournamentRepo.find({ order: { startsAt: 'DESC' } });
  }

  async getTournament(id: string) {
    return this.tournamentRepo.findOneOrFail({ where: { id } });
  }

  async createTournament(dto: CreateTournamentDto) {
    const tournament = this.tournamentRepo.create({
      organizerId: dto.organizer_id,
      hallId: dto.hall_id ?? null,
      name: dto.name,
      game: dto.game,
      format: (dto.format as TournamentFormat) ?? TournamentFormat.SINGLE_ELIM,
      startsAt: new Date(dto.starts_at),
      status: TournamentStatus.DRAFT,
      configJson: {
        raceTo: dto.race_to,
        entrants: dto.entrants ?? [],
        bracket: undefined,
      },
    });


    await this.tournamentRepo.save(tournament);

    if (tournament.format === TournamentFormat.SINGLE_ELIM) {
      await this.seedSingleElimination(tournament);
    } else if (tournament.format === TournamentFormat.DOUBLE_ELIM) {
      await this.seedDoubleElimination(tournament);
} else if (tournament.format === TournamentFormat.SWISS) {
      await this.seedSwiss(tournament, 4);
    }


    return tournament;
  }

  async registerToTournament(tournamentId: string, dto: RegisterTournamentDto) {
    const tournament = await this.tournamentRepo.findOneBy({ id: tournamentId });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const entrants = tournament.configJson.entrants ?? [];
    if (!entrants.includes(dto.user_id)) {
      entrants.push(dto.user_id);
      tournament.configJson = { ...tournament.configJson, entrants };
      await this.tournamentRepo.save(tournament);
    }

    return { success: true };
  }

  async generateBracket(tournamentId: string) {
    const tournament = await this.tournamentRepo.findOneOrFail({ where: { id: tournamentId } });
    const matches = await this.matchRepo.find({
      where: { tournamentId },
      order: { round: 'ASC', matchIndex: 'ASC' },
    });

    return { tournament, matches };
  }

  async reportTournamentMatch(tournamentId: string, dto: ReportTournamentMatchDto) {
    const match = await this.matchRepo.findOneBy({
      id: dto.match_id,
      tournamentId,
    });

    if (!match) throw new NotFoundException('Match not found');

    match.aScore = dto.a_score;
    match.bScore = dto.b_score;
    match.status = TournamentMatchStatus.COMPLETED;

    await this.matchRepo.save(match);

    return { success: true };
  }

  async advanceRound(tournamentId: string, _round: number) {
    const matches = await this.matchRepo.find({
      where: { tournamentId },
      order: { round: 'ASC', matchIndex: 'ASC' },
    });

    if (matches.length === 0) throw new BadRequestException('No matches to advance');

    const lastRound = Math.max(...matches.map((m) => m.round));
    const completed = matches.filter((m) => m.round === lastRound);

    if (completed.some((m) => m.status !== TournamentMatchStatus.COMPLETED)) {
      throw new BadRequestException('Not all matches completed');
    }

    const winners = completed
      .map((m) => {
        if (m.aScore == null || m.bScore == null) return null;
        return m.aScore > m.bScore ? m.playerAId : m.playerBId;
      })
      .filter((id): id is string => !!id);

    const nextRound = lastRound + 1;

    for (let i = 0; i < winners.length; i += 2) {
      const match = this.matchRepo.create({
        tournamentId,
        round: nextRound,
        matchIndex: i / 2 + 1,
        playerAId: winners[i] ?? null,
        playerBId: winners[i + 1] ?? null,
        aScore: null,
        bScore: null,
        status: TournamentMatchStatus.ACTIVE,
        bracket: TournamentBracketSide.WINNERS,
        nextMatchId: null,
        nextMatch: null,
      });

      await this.matchRepo.save(match);
    }

    return { success: true };
  }

  async advanceSwissRound(tournamentId: string, round: number) {
    const tournament = await this.tournamentRepo.findOneBy({ id: tournamentId });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const players = tournament.configJson.entrants ?? [];
    const matches = await this.matchRepo.find({ where: { tournamentId, round } });

    if (matches.some((m) => m.status !== TournamentMatchStatus.COMPLETED)) {
      throw new BadRequestException('Not all matches completed');
    }

    const wins: Record<string, number> = {};
    for (const p of players) wins[p] = 0;

    for (const m of matches) {
      const winner = m.winnerId;
      if (winner) wins[winner] = (wins[winner] ?? 0) + 1;
    }

    const sorted = [...players].sort((a, b) => (wins[b] ?? 0) - (wins[a] ?? 0));

    const nextRound = round + 1;
    let matchIndex = 1;

    for (let i = 0; i < sorted.length; i += 2) {
      const match = this.matchRepo.create({
        tournamentId,
        round: nextRound,
        matchIndex,
        playerAId: sorted[i] ?? null,
        playerBId: sorted[i + 1] ?? null,
        aScore: null,
        bScore: null,
        status: TournamentMatchStatus.ACTIVE,
        bracket: TournamentBracketSide.WINNERS,
        nextMatchId: null,
        nextMatch: null,
      });

      await this.matchRepo.save(match);
      matchIndex++;
    }

    return { success: true };
  }

  private nextPowerOfTwo(n: number) {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  private async seedSingleElimination(tournament: Tournament) {
    const entrants = tournament.configJson.entrants ?? [];
    const size = this.nextPowerOfTwo(entrants.length || 1);
    const seeded = [...entrants, ...new Array(size - entrants.length).fill(null)];

    for (let i = 0; i < seeded.length; i += 2) {
      const match = this.matchRepo.create({
        tournamentId: tournament.id,
        round: 1,
        matchIndex: i / 2 + 1,
        playerAId: seeded[i],
        playerBId: seeded[i + 1],
        aScore: null,
        bScore: null,
        status: TournamentMatchStatus.ACTIVE,
        bracket: TournamentBracketSide.WINNERS,
        nextMatchId: null,
        nextMatch: null,
      });

      await this.matchRepo.save(match);
    }
  }

  private async seedDoubleElimination(tournament: Tournament) {
    await this.seedSingleElimination(tournament);
  }

  private async seedSwiss(tournament: Tournament, _rounds: number) {
    const entrants = tournament.configJson.entrants ?? [];

    let matchIndex = 1;
    for (let i = 0; i < entrants.length; i += 2) {
      const match = this.matchRepo.create({
        tournamentId: tournament.id,
        round: 1,
        matchIndex,
        playerAId: entrants[i] ?? null,
        playerBId: entrants[i + 1] ?? null,
        aScore: null,
        bScore: null,
        status: TournamentMatchStatus.ACTIVE,
        bracket: TournamentBracketSide.WINNERS,
        nextMatchId: null,
        nextMatch: null,
      });

      await this.matchRepo.save(match);
      matchIndex++;
    }

    tournament.configJson = { ...tournament.configJson, bracket: [] };
    await this.tournamentRepo.save(tournament);
  }
}

