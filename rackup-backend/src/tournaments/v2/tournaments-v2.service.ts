import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TournamentV2, TournamentV2Status } from './entities/tournament-v2.entity';
import {
  TournamentMatchV2,
  TournamentMatchStatus,
  TournamentBracketSide,
} from './entities/tournament-match-v2.entity';
import { BracketRound } from './entities/bracket-round.entity';
import { BracketNode } from './entities/bracket-node.entity';

import { CreateTournamentV2Dto } from './dto/create-tournament-v2.dto';
import { RegisterTournamentV2Dto } from './dto/register-tournament-v2.dto';
import { StartTournamentV2Dto } from './dto/start-tournament-v2.dto';
import { ReportMatchV2Dto } from './dto/report-match-v2.dto';

import { BracketGenerationService } from './bracket-generation.service';
import { ScorekeepingService } from '../../scorekeeping/scorekeeping.service';
import { RealaiV2Service } from '../../realai/v2/realai-v2.service';
import { RatingService } from '../../users/rating.service';

@Injectable()
export class TournamentsV2Service {
  private readonly logger = new Logger(TournamentsV2Service.name);

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
    private readonly scorekeeping: ScorekeepingService,
    private readonly realaiV2: RealaiV2Service,
    private readonly ratingService: RatingService,
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

    const tournament = await this.tournamentRepo.findOne({ where: { id: dto.tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const isEntrant = (tournament.entrants ?? []).includes(userId);
    const isOrganizer = tournament.organizerId === userId;
    if (!isEntrant && !isOrganizer) throw new BadRequestException('Not allowed to report match');

    if (match.status === TournamentMatchStatus.COMPLETED) {
      throw new BadRequestException('Match already reported');
    }

    match.aScore = dto.aScore;
    match.bScore = dto.bScore;
    match.status = TournamentMatchStatus.COMPLETED;
    match.winnerId =
      dto.winnerId ??
      (dto.aScore > dto.bScore
        ? match.playerAId
        : dto.bScore > dto.aScore
          ? match.playerBId
          : null);

    await this.matchRepo.save(match);

    if (match.winnerId) {
      await this.advanceWinner(match);
      if (match.playerAId && match.playerBId && match.aScore !== match.bScore) {
        const winnerId = match.winnerId;
        const loserId = winnerId === match.playerAId ? match.playerBId : match.playerAId;
        if (loserId) {
          await this.ratingService.applyMatchResult(winnerId, loserId).catch((e) =>
            this.logger.warn(`rating apply failed: ${e}`),
          );
        }
      }
    }

    await this.scorekeeping.emitScoreUpdate({
      domain: 'tournament_v2',
      entityId: tournament.id,
      matchId: match.id,
      playerAId: match.playerAId ?? '',
      playerBId: match.playerBId ?? '',
      aScore: match.aScore ?? 0,
      bScore: match.bScore ?? 0,
      winnerId: match.winnerId ?? null,
    });

    void this.realaiV2
      .submitSummaryJob({
        matchId: match.id,
        context: `tournament_v2:${tournament.id} round=${match.round}`,
        keyShots: [],
      })
      .catch((e) => this.logger.warn(`summary job failed: ${e}`));

    return { success: true };
  }

  /**
   * Advance winner within their bracket; if winners bracket, drop loser into losers.
   * Odd matchIndex → player A slot; even → player B slot of ceil(index/2).
   */
  private async advanceWinner(match: TournamentMatchV2): Promise<void> {
    if (!match.winnerId) return;

    const bracket = match.bracket ?? TournamentBracketSide.WINNERS;
    await this.placePlayerInNextMatch(match.tournamentId, match.round, match.matchIndex, match.winnerId, bracket);

    if (bracket === TournamentBracketSide.WINNERS) {
      const loserId =
        match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
      if (loserId) {
        // Drop into losers: same round index maps into losers R1 pairing bucket
        await this.placeLoserIntoLosers(match.tournamentId, match.round, match.matchIndex, loserId);
      }
    }

    this.logger.log(
      `advanced winner=${match.winnerId} from ${bracket} R${match.round} M${match.matchIndex}`,
    );
  }

  private async placeLoserIntoLosers(
    tournamentId: string,
    winnersRound: number,
    winnersMatchIndex: number,
    loserId: string,
  ): Promise<void> {
    // Losers round tracks winners round; slot = ceil(matchIndex/2), A/B by odd/even
    const losersRound = winnersRound;
    const losersMatchIndex = Math.ceil(winnersMatchIndex / 2);
    const asPlayerA = winnersMatchIndex % 2 === 1;
    await this.ensureRound(tournamentId, losersRound);

    let next = await this.matchRepo.findOne({
      where: {
        tournamentId,
        round: losersRound,
        matchIndex: losersMatchIndex,
        bracket: TournamentBracketSide.LOSERS,
      },
    });

    if (!next) {
      next = this.matchRepo.create({
        tournamentId,
        round: losersRound,
        matchIndex: losersMatchIndex,
        playerAId: null,
        playerBId: null,
        status: TournamentMatchStatus.ACTIVE,
        bracket: TournamentBracketSide.LOSERS,
      });
    }

    if (asPlayerA) next.playerAId = loserId;
    else next.playerBId = loserId;
    if (next.playerAId && next.playerBId) next.status = TournamentMatchStatus.ACTIVE;
    await this.matchRepo.save(next);
  }

  private async placePlayerInNextMatch(
    tournamentId: string,
    round: number,
    matchIndex: number,
    playerId: string,
    bracket: TournamentBracketSide,
  ): Promise<void> {
    const nextRound = round + 1;
    const nextMatchIndex = Math.ceil(matchIndex / 2);
    const asPlayerA = matchIndex % 2 === 1;
    await this.ensureRound(tournamentId, nextRound);

    let next = await this.matchRepo.findOne({
      where: {
        tournamentId,
        round: nextRound,
        matchIndex: nextMatchIndex,
        bracket,
      },
    });

    if (!next) {
      next = this.matchRepo.create({
        tournamentId,
        round: nextRound,
        matchIndex: nextMatchIndex,
        playerAId: null,
        playerBId: null,
        status: TournamentMatchStatus.ACTIVE,
        bracket,
      });
    }

    if (asPlayerA) next.playerAId = playerId;
    else next.playerBId = playerId;
    if (next.playerAId && next.playerBId) next.status = TournamentMatchStatus.ACTIVE;
    await this.matchRepo.save(next);
  }

  private async ensureRound(tournamentId: string, roundNumber: number) {
    let round = await this.roundRepo.findOne({ where: { tournamentId, roundNumber } });
    if (!round) {
      await this.roundRepo.save(this.roundRepo.create({ tournamentId, roundNumber }));
    }
  }

  async getBracket(tournamentId: string) {
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
