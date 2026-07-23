import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TournamentV2, TournamentV2Status } from './entities/tournament-v2.entity';
import { TournamentMatchV2, TournamentMatchStatus } from './entities/tournament-match-v2.entity';
import { BracketRound } from './entities/bracket-round.entity';
import { BracketNode } from './entities/bracket-node.entity';

import { CreateTournamentV2Dto } from './dto/create-tournament-v2.dto';
import { RegisterTournamentV2Dto } from './dto/register-tournament-v2.dto';
import { StartTournamentV2Dto } from './dto/start-tournament-v2.dto';
import { ReportMatchV2Dto } from './dto/report-match-v2.dto';

import { BracketGenerationService } from './bracket-generation.service';

@Injectable()
export class TournamentsV2Service {
  constructor(
    @InjectRepository(TournamentV2)
    private readonly tournamentRepo: Repository<TournamentV2>,

    @InjectRepository(TournamentMatchV2)
    private readonly matchRepo: Repository<TournamentMatchV2>,

    @InjectRepository(BracketRound)
    private readonly roundRepo: Repository<BracketRound>,

    @InjectRepository(BracketNode)
    private readonly nodeRepo: Repository<BracketNode>,

    private readonly bracketGeneration: BracketGenerationService,
  ) {}

  async create(userId: string, dto: CreateTournamentV2Dto): Promise<TournamentV2> {
    const tournament = this.tournamentRepo.create({
      organizerId: userId,
      name: dto.name,
      game: dto.game,
      mode: dto.mode,
      formatConfigJson: dto.format_config ?? {},
      status: TournamentV2Status.DRAFT,
    });

    const saved = await this.tournamentRepo.save(tournament);
    // Seeding happens on start() to keep create idempotent.
    return saved;
  }

  async register(userId: string, dto: RegisterTournamentV2Dto): Promise<{ success: true }> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: dto.tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== TournamentV2Status.DRAFT) {
      throw new BadRequestException('Tournament is not in draft state');
    }

    const entrants = new Set<string>(tournament.entrants ?? []);
    entrants.add(userId);
    tournament.entrants = Array.from(entrants);
    await this.tournamentRepo.save(tournament);

    return { success: true };
  }

  async start(userId: string, dto: StartTournamentV2Dto): Promise<{ success: true }> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: dto.tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.organizerId !== userId) throw new BadRequestException('Not tournament organizer');
    if (tournament.status !== TournamentV2Status.DRAFT) throw new BadRequestException('Tournament already started');

    if ((tournament.entrants?.length ?? 0) < 2) {
      throw new BadRequestException('Need at least 2 entrants');
    }

    // Clear any accidental previous seeding
    await this.matchRepo.delete({ tournamentId: tournament.id });
    await this.roundRepo.delete({ tournamentId: tournament.id });
    await this.nodeRepo.delete({ tournamentId: tournament.id });

    await this.bracketGeneration.generateForTournament(tournament);

    tournament.status = TournamentV2Status.ACTIVE;
    await this.tournamentRepo.save(tournament);

    return { success: true };
  }

  async reportMatch(userId: string, dto: ReportMatchV2Dto): Promise<{ success: true }> {
    const match = await this.matchRepo.findOne({ where: { id: dto.matchId, tournamentId: dto.tournamentId } });
    if (!match) throw new NotFoundException('Match not found');

    // Basic access: entrants can report, organizer can always.
    const tournament = await this.tournamentRepo.findOne({ where: { id: dto.tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const isEntrant = (tournament.entrants ?? []).includes(userId);
    const isOrganizer = tournament.organizerId === userId;
    if (!isEntrant && !isOrganizer) throw new BadRequestException('Not allowed to report match');

    match.aScore = dto.aScore;
    match.bScore = dto.bScore;
    match.status = TournamentMatchStatus.COMPLETED;
    match.winnerId = dto.winnerId ?? (dto.aScore > dto.bScore ? match.playerAId : dto.bScore > dto.aScore ? match.playerBId : null);

    await this.matchRepo.save(match);

    return { success: true };
  }

  async getBracket(tournamentId: string) {
    // Minimal bracket response (rounds+nodes+matches) - can be expanded.
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const rounds = await this.roundRepo.find({ where: { tournamentId }, order: { roundNumber: 'ASC' } });
    const matches = await this.matchRepo.find({ where: { tournamentId }, order: { round: 'ASC', matchIndex: 'ASC' } });
    const nodes = await this.nodeRepo.find({ where: { tournamentId } });

    return { tournament, rounds, matches, nodes };
  }

  async getRounds(tournamentId: string) {
    const rounds = await this.roundRepo.find({ where: { tournamentId }, order: { roundNumber: 'ASC' } });
    if (!rounds.length) throw new NotFoundException('No rounds found');
    return { tournamentId, rounds };
  }

  async getStandings(tournamentId: string) {
    // Simple standings: completed matches determine win counts for bracket-like modes.
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const entrants = tournament.entrants ?? [];
    const winCounts: Record<string, number> = Object.fromEntries(entrants.map((e) => [e, 0]));

    const matches = await this.matchRepo.find({
      where: { tournamentId, status: TournamentMatchStatus.COMPLETED },
    });

    for (const m of matches) {
      if (m.winnerId && winCounts[m.winnerId] != null) winCounts[m.winnerId] += 1;
    }

    const standings = entrants
      .map((playerId) => ({ playerId, wins: winCounts[playerId] ?? 0 }))
      .sort((a, b) => b.wins - a.wins);

    return { tournamentId, standings };
  }
}

