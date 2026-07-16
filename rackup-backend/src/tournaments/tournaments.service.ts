import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { RegisterTournamentDto } from './dto/register-tournament.dto';
import { ReportTournamentMatchDto } from './dto/report-tournament-match.dto';
import { TournamentMatch } from './tournament_matches.entity';
import { Tournament } from './tournaments.entity';
import { MemoriesService } from '../memories/memories.service';
import { RatingService } from '../users/rating.service';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentsRepo: Repository<Tournament>,
    @InjectRepository(TournamentMatch)
    private readonly tournamentMatchesRepo: Repository<TournamentMatch>,
    private readonly memoriesService: MemoriesService,
    private readonly ratingService: RatingService,
  ) {}

  async listTournaments(): Promise<Tournament[]> {
    return this.tournamentsRepo.find({
      order: { startsAt: 'DESC' },
      take: 40,
    });
  }

  async createTournament(dto: CreateTournamentDto): Promise<Tournament> {
    const entrants = Array.from(new Set(dto.entrants));
    if (entrants.length < 2) {
      throw new BadRequestException('At least 2 entrants are required');
    }

    const bracketSeed = this.buildSingleEliminationSeed(entrants);

    const tournament = this.tournamentsRepo.create({
      organizerId: dto.organizer_id,
      hallId: dto.hall_id ?? null,
      name: dto.name,
      format: dto.format,
      game: dto.game,
      startsAt: new Date(dto.starts_at),
      status: 'ACTIVE',
      configJson: {
        raceTo: dto.race_to ?? 7,
        entrants,
        bracket: bracketSeed.map((m) => ({
          round: m.round,
          matchIndex: m.matchIndex,
          nextRound: m.nextRound,
          nextMatchIndex: m.nextMatchIndex,
        })),
      },
    });

    const savedTournament = await this.tournamentsRepo.save(
      tournament as Tournament,
    );

    const matchEntities = bracketSeed.map((m) =>
      this.tournamentMatchesRepo.create({
        tournamentId: savedTournament.id,
        round: m.round,
        matchIndex: m.matchIndex,
        playerAId: m.playerAId,
        playerBId: m.playerBId,
        status: 'PENDING',
        nextMatchId: null,
      }),
    );

    const savedMatches = await this.tournamentMatchesRepo.save(matchEntities);

    const roundMap = new Map<string, TournamentMatch>();
    for (const match of savedMatches) {
      roundMap.set(`${match.round}-${match.matchIndex}`, match);
    }

    for (const match of savedMatches) {
      const seed = bracketSeed.find(
        (m) => m.round === match.round && m.matchIndex === match.matchIndex,
      );
      if (!seed || seed.nextRound === null || seed.nextMatchIndex === null) continue;

      const next = roundMap.get(`${seed.nextRound}-${seed.nextMatchIndex}`);
      if (next) {
        match.nextMatchId = next.id;
      }
    }

    await this.tournamentMatchesRepo.save(savedMatches);
    await this.tournamentMatchesRepo.save(savedMatches);
    return savedTournament;
  }

  async getTournament(id: string): Promise<{
    tournament: Tournament;
    matches: TournamentMatch[];
  }> {
    const tournament = await this.tournamentsRepo.findOne({ where: { id } });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const matches = await this.tournamentMatchesRepo.find({
      where: { tournamentId: id },
      order: { round: 'ASC', matchIndex: 'ASC' },
    });

    return { tournament, matches };
  }

  async registerToTournament(
    id: string,
    dto: RegisterTournamentDto,
  ): Promise<Tournament> {
    const tournament = await this.tournamentsRepo.findOne({ where: { id } });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const entrants = Array.from(new Set([...(tournament.configJson?.entrants ?? []), dto.user_id]));
    tournament.configJson = { ...(tournament.configJson ?? {}), entrants };

    return this.tournamentsRepo.save(tournament as Tournament);
  }

  async reportTournamentMatch(
    tournamentId: string,
    dto: ReportTournamentMatchDto,
  ): Promise<{
    updatedMatch: TournamentMatch;
    nextMatch?: TournamentMatch | null;
    tournamentStatus: Tournament['status'];
  }> {
    const tournament = await this.tournamentsRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const match = await this.tournamentMatchesRepo.findOne({
      where: { id: dto.match_id, tournamentId },
    });
    if (!match) {
      throw new NotFoundException('Tournament match not found');
    }

    if (dto.a_score === dto.b_score) {
      throw new BadRequestException('Tie scores are not allowed');
    }

    match.aScore = dto.a_score;
    match.bScore = dto.b_score;
    match.status = 'COMPLETED';
    const updatedMatch = await this.tournamentMatchesRepo.save(match);

    if (match.playerAId && match.playerBId) {
      const aWins = dto.a_score > dto.b_score;
      await this.memoriesService.createForMatchParticipants({
        matchId: match.id,
        matchType: 'TOURNAMENT',
        participantAId: match.playerAId,
        participantBId: match.playerBId,
        aIsWinner: aWins,
        bIsWinner: !aWins,
        game: tournament.game,
        raceTo: tournament.configJson?.raceTo ?? null,
        scorelineA: { a: dto.a_score, b: dto.b_score },
        scorelineB: { a: dto.a_score, b: dto.b_score },
      });
      await this.ratingService.applyMatchResult(
        aWins ? match.playerAId : match.playerBId,
        aWins ? match.playerBId : match.playerAId,
      );
    }

    const winnerId = dto.a_score > dto.b_score ? match.playerAId : match.playerBId;
    let nextMatch: TournamentMatch | null = null;

    if (winnerId && match.nextMatchId) {
      nextMatch = await this.tournamentMatchesRepo.findOne({ where: { id: match.nextMatchId } });
      if (nextMatch) {
        if (!nextMatch.playerAId) {
          nextMatch.playerAId = winnerId;
        } else if (!nextMatch.playerBId) {
          nextMatch.playerBId = winnerId;
        }
        nextMatch = await this.tournamentMatchesRepo.save(nextMatch);
      }
    }

    const remaining = await this.tournamentMatchesRepo.count({
      where: { tournamentId, status: In(['PENDING']) },
    });

    if (remaining === 0) {
      tournament.status = 'COMPLETED';
      await this.tournamentsRepo.save(tournament);
    }

    return {
      updatedMatch,
      nextMatch,
      tournamentStatus: tournament.status,
    };
  }

  private buildSingleEliminationSeed(entrants: string[]): Array<{
    round: number;
    matchIndex: number;
    playerAId: string | null;
    playerBId: string | null;
    nextRound: number | null;
    nextMatchIndex: number | null;
  }> {
    const size = this.nextPowerOfTwo(entrants.length);
    const seeded = [...entrants, ...new Array(size - entrants.length).fill(null)];
    const rounds = Math.log2(size);

    const output: Array<{
      round: number;
      matchIndex: number;
      playerAId: string | null;
      playerBId: string | null;
      nextRound: number | null;
      nextMatchIndex: number | null;
    }> = [];

    let currentRoundParticipants = seeded;
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = currentRoundParticipants.length / 2;
      for (let i = 0; i < matchesInRound; i++) {
        const playerAId = round === 1 ? currentRoundParticipants[i * 2] : null;
        const playerBId = round === 1 ? currentRoundParticipants[i * 2 + 1] : null;

        output.push({
          round,
          matchIndex: i + 1,
          playerAId,
          playerBId,
          nextRound: round < rounds ? round + 1 : null,
          nextMatchIndex: round < rounds ? Math.floor(i / 2) + 1 : null,
        });
      }
      currentRoundParticipants = new Array(matchesInRound).fill(null);
    }

    return output;
  }

  private nextPowerOfTwo(value: number): number {
    let p = 1;
    while (p < value) p <<= 1;
    return p;
  }
}
