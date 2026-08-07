import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { TournamentV2, TournamentV2Mode, TournamentV2Status } from './entities/tournament-v2.entity';
import {
  TournamentMatchV2,
  TournamentMatchStatus,
  TournamentBracketSide,
} from './entities/tournament-match-v2.entity';
import { BracketRound } from './entities/bracket-round.entity';
import { BracketNode } from './entities/bracket-node.entity';
import { User } from '../../users/users.entity';

import { CreateTournamentV2Dto } from './dto/create-tournament-v2.dto';
import { RegisterTournamentV2Dto } from './dto/register-tournament-v2.dto';
import { StartTournamentV2Dto } from './dto/start-tournament-v2.dto';
import { ReportMatchV2Dto } from './dto/report-match-v2.dto';
import {
  AdminReseedDto,
  AdminSwapPlayersDto,
  AdminUpdateMatchScoreDto,
} from './dto/admin-bracket.dto';

import { BracketGenerationService } from './bracket-generation.service';
import { ScorekeepingServiceV2 } from '../../scorekeeping/scorekeeping-v2.service';
import { IdBridgeService } from '../../common/id-bridge.service';
import { applySeedStrategy, parseSeedStrategy } from './seed-strategy';
import { TvModeGateway } from './tv-mode.gateway';

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

    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    private readonly bracketGeneration: BracketGenerationService,
    private readonly scorekeepingV2: ScorekeepingServiceV2,
    private readonly idBridge: IdBridgeService,
    @Optional() private readonly tvGateway?: TvModeGateway,
  ) {}

  /** Resolve V1 tournament id → V2 when UI still mixes ids. */
  private async resolveTournamentId(id: string): Promise<string> {
    return this.idBridge.resolveV2OrSelf('tournament', id);
  }

  async list(limit = 40): Promise<TournamentV2[]> {
    return this.tournamentRepo.find({
      order: { name: 'ASC' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }

  async create(userId: string, dto: CreateTournamentV2Dto): Promise<TournamentV2> {
    const formatConfig = {
      ...(dto.format_config ?? {}),
      ...(dto.seed_strategy ? { seedStrategy: dto.seed_strategy } : {}),
    };
    const tournament = this.tournamentRepo.create({
      organizerId: userId,
      name: dto.name,
      game: dto.game,
      mode: dto.mode,
      formatConfigJson: formatConfig,
      status: TournamentV2Status.DRAFT,
      entrants: [],
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

    if (dto.seed_strategy) {
      tournament.formatConfigJson = {
        ...(tournament.formatConfigJson ?? {}),
        seedStrategy: dto.seed_strategy,
      };
    }

    await this.regenerateBracket(tournament);

    tournament.status = TournamentV2Status.ACTIVE;
    await this.tournamentRepo.save(tournament);
    await this.broadcastTv(tournament.id);

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

    if (match.winnerId && tournament.mode !== TournamentV2Mode.SWISS) {
      await this.advanceWinner(match);
    }

    // Single report entry point: Elo + Redis + RealAI + socket
    await this.scorekeepingV2.processReport({
      domain: 'tournament_v2',
      matchId: match.id,
      entityId: tournament.id,
      playerAId: match.playerAId ?? '',
      playerBId: match.playerBId ?? '',
      aScore: match.aScore ?? 0,
      bScore: match.bScore ?? 0,
      winnerId: match.winnerId ?? null,
      gameType: tournament.game,
      skipMemories: true,
      reportingPlayerId: userId,
    });

    await this.broadcastTv(tournament.id);
    return { success: true };
  }

  /**
   * Advance winner within their bracket; if winners bracket, drop loser into losers.
   * Odd matchIndex → player A slot; even → player B slot of ceil(index/2).
   */
  private async advanceWinner(match: TournamentMatchV2): Promise<void> {
    if (!match.winnerId) return;

    const tournament = await this.tournamentRepo.findOne({
      where: { id: match.tournamentId },
    });
    const bracket = match.bracket ?? TournamentBracketSide.WINNERS;

    // Grand final: winners-side win ends tournament; losers-side win may force reset
    if (bracket === TournamentBracketSide.GRAND_FINAL) {
      await this.handleGrandFinalResult(match, tournament);
      return;
    }

    await this.placePlayerInNextMatch(
      match.tournamentId,
      match.round,
      match.matchIndex,
      match.winnerId,
      bracket,
    );

    if (bracket === TournamentBracketSide.WINNERS) {
      const loserId =
        match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
      if (loserId) {
        await this.placeLoserIntoLosers(
          match.tournamentId,
          match.round,
          match.matchIndex,
          loserId,
        );
      }
    }

    if (tournament?.mode === TournamentV2Mode.DOUBLE_ELIMINATION) {
      await this.maybeScheduleGrandFinal(match.tournamentId);
    }

    this.logger.log(
      `advanced winner=${match.winnerId} from ${bracket} R${match.round} M${match.matchIndex}`,
    );
  }

  /**
   * When both winners-final and losers-final have champions, create GRAND_FINAL.
   * Player A = winners bracket champ, Player B = losers bracket champ.
   */
  private async maybeScheduleGrandFinal(tournamentId: string): Promise<void> {
    const existingGf = await this.matchRepo.findOne({
      where: { tournamentId, bracket: TournamentBracketSide.GRAND_FINAL },
    });
    if (existingGf) return;

    const winnersChamp = await this.findBracketChampion(
      tournamentId,
      TournamentBracketSide.WINNERS,
    );
    const losersChamp = await this.findBracketChampion(
      tournamentId,
      TournamentBracketSide.LOSERS,
    );
    if (!winnersChamp || !losersChamp || winnersChamp === losersChamp) return;

    // Require no open non-GF matches still needing play (all completed or BYE-ish)
    const open = await this.matchRepo.count({
      where: {
        tournamentId,
        status: TournamentMatchStatus.ACTIVE,
      },
    });
    // Allow open empty slots; block if any active match still has both players and no scores
    const activeBoth = await this.matchRepo
      .createQueryBuilder('m')
      .where('m.tournamentId = :tournamentId', { tournamentId })
      .andWhere('m.status = :st', { st: TournamentMatchStatus.ACTIVE })
      .andWhere('m.playerAId IS NOT NULL')
      .andWhere('m.playerBId IS NOT NULL')
      .andWhere('m.bracket != :gf', { gf: TournamentBracketSide.GRAND_FINAL })
      .getCount();
    if (activeBoth > 0) return;

    await this.ensureRound(tournamentId, 100);
    const gf = this.matchRepo.create({
      tournamentId,
      round: 100,
      matchIndex: 1,
      playerAId: winnersChamp,
      playerBId: losersChamp,
      status: TournamentMatchStatus.ACTIVE,
      bracket: TournamentBracketSide.GRAND_FINAL,
    });
    await this.matchRepo.save(gf);
    this.logger.log(
      `grand final scheduled tournament=${tournamentId} W=${winnersChamp} L=${losersChamp}`,
    );
    void open; // silence if unused in some TS configs
  }

  private async findBracketChampion(
    tournamentId: string,
    side: TournamentBracketSide,
  ): Promise<string | null> {
    const matches = await this.matchRepo.find({
      where: { tournamentId, bracket: side, status: TournamentMatchStatus.COMPLETED },
      order: { round: 'DESC', matchIndex: 'ASC' },
    });
    if (!matches.length) return null;
    const maxRound = matches[0].round;
    const finals = matches.filter((m) => m.round === maxRound);
    // Single final match at max round preferred
    if (finals.length === 1 && finals[0].winnerId) return finals[0].winnerId;
    // Multiple: only champion if exactly one match at max with winner and no pending
    if (finals.length === 1) return finals[0].winnerId ?? null;
    return null;
  }

  private async handleGrandFinalResult(
    match: TournamentMatchV2,
    tournament: TournamentV2 | null,
  ): Promise<void> {
    if (!match.winnerId || !tournament) return;

    const winnersSidePlayer = match.playerAId; // convention: A = undefeated winners champ
    const allowReset =
      tournament.formatConfigJson?.grandFinalReset !== false &&
      tournament.mode === TournamentV2Mode.DOUBLE_ELIMINATION;

    // If losers-side (B) wins game 1, schedule reset game 2 (both now have 1 loss path)
    if (
      allowReset &&
      match.matchIndex === 1 &&
      match.winnerId !== winnersSidePlayer &&
      match.playerBId
    ) {
      const resetExists = await this.matchRepo.findOne({
        where: {
          tournamentId: match.tournamentId,
          bracket: TournamentBracketSide.GRAND_FINAL,
          matchIndex: 2,
        },
      });
      if (!resetExists) {
        const reset = this.matchRepo.create({
          tournamentId: match.tournamentId,
          round: 100,
          matchIndex: 2,
          playerAId: match.playerAId,
          playerBId: match.playerBId,
          status: TournamentMatchStatus.ACTIVE,
          bracket: TournamentBracketSide.GRAND_FINAL,
        });
        await this.matchRepo.save(reset);
        this.logger.log(`grand final RESET scheduled tournament=${match.tournamentId}`);
        return;
      }
    }

    tournament.status = TournamentV2Status.COMPLETED;
    tournament.formatConfigJson = {
      ...(tournament.formatConfigJson ?? {}),
      championId: match.winnerId,
      completedAt: new Date().toISOString(),
    };
    await this.tournamentRepo.save(tournament);
    this.logger.log(`tournament COMPLETED champion=${match.winnerId}`);
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
    const resolved = await this.resolveTournamentId(tournamentId);
    const tournament = await this.tournamentRepo.findOne({ where: { id: resolved } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const rounds = await this.roundRepo.find({ where: { tournamentId: resolved }, order: { roundNumber: 'ASC' } });
    const matches = await this.matchRepo.find({
      where: { tournamentId: resolved },
      order: { round: 'ASC', matchIndex: 'ASC' },
    });
    const nodes = await this.nodeRepo.find({ where: { tournamentId: resolved } });

    return {
      tournament,
      rounds,
      matches,
      nodes,
      ...(resolved !== tournamentId ? { resolvedFrom: tournamentId } : {}),
    };
  }

  async getRounds(tournamentId: string) {
    const resolved = await this.resolveTournamentId(tournamentId);
    const rounds = await this.roundRepo.find({
      where: { tournamentId: resolved },
      order: { roundNumber: 'ASC' },
    });
    if (!rounds.length) throw new NotFoundException('No rounds found');
    return {
      tournamentId: resolved,
      rounds,
      ...(resolved !== tournamentId ? { resolvedFrom: tournamentId } : {}),
    };
  }

  async getStandings(tournamentId: string) {
    const resolved = await this.resolveTournamentId(tournamentId);
    const tournament = await this.tournamentRepo.findOne({ where: { id: resolved } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const entrants = tournament.entrants ?? [];
    const winCounts: Record<string, number> = Object.fromEntries(entrants.map((e) => [e, 0]));

    const matches = await this.matchRepo.find({
      where: { tournamentId: resolved, status: TournamentMatchStatus.COMPLETED },
    });

    for (const m of matches) {
      if (m.winnerId && winCounts[m.winnerId] != null) winCounts[m.winnerId] += 1;
    }

    const standings = entrants
      .map((playerId) => ({ playerId, wins: winCounts[playerId] ?? 0 }))
      .sort((a, b) => b.wins - a.wins);

    return {
      tournamentId: resolved,
      standings,
      ...(resolved !== tournamentId ? { resolvedFrom: tournamentId } : {}),
    };
  }

  /** Public TV / spectator JSON (display-optimized). */
  async getTvPayload(tournamentId: string) {
    const bracket = await this.getBracket(tournamentId);
    const standings = await this.getStandings(tournamentId);
    const t = bracket.tournament as TournamentV2;
    const matches = (bracket.matches as TournamentMatchV2[]).map((m) => ({
      id: m.id,
      round: m.round,
      matchIndex: m.matchIndex,
      playerAId: m.playerAId,
      playerBId: m.playerBId,
      aScore: m.aScore,
      bScore: m.bScore,
      status: m.status,
      bracket: m.bracket,
      winnerId: m.winnerId,
    }));

    return {
      type: 'tournament_tv',
      generatedAt: new Date().toISOString(),
      tournament: {
        id: t.id,
        name: t.name,
        game: t.game,
        mode: t.mode,
        status: t.status,
        entrantCount: t.entrants?.length ?? 0,
      },
      matches,
      standings: standings.standings,
      activeMatches: matches.filter((m) => m.status === 'ACTIVE' && m.playerAId && m.playerBId),
      completedCount: matches.filter((m) => m.status === 'COMPLETED').length,
    };
  }

  // --- Admin bracket tools (organizer only) ---

  async adminUpdateMatchScore(userId: string, dto: AdminUpdateMatchScoreDto) {
    const tournament = await this.requireOrganizer(userId, dto.tournamentId);
    const match = await this.matchRepo.findOne({
      where: { id: dto.matchId, tournamentId: tournament.id },
    });
    if (!match) throw new NotFoundException('Match not found');

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

    if (match.winnerId && tournament.mode !== TournamentV2Mode.SWISS) {
      await this.advanceWinner(match);
    }

    await this.scorekeepingV2.processReport({
      domain: 'tournament_v2',
      matchId: match.id,
      entityId: tournament.id,
      playerAId: match.playerAId ?? '',
      playerBId: match.playerBId ?? '',
      aScore: match.aScore ?? 0,
      bScore: match.bScore ?? 0,
      winnerId: match.winnerId ?? null,
      gameType: tournament.game,
      skipMemories: true,
      reportingPlayerId: userId,
    });

    await this.broadcastTv(tournament.id);
    return { success: true, match };
  }

  async adminSwapPlayers(userId: string, dto: AdminSwapPlayersDto) {
    const tournament = await this.requireOrganizer(userId, dto.tournamentId);
    const match = await this.matchRepo.findOne({
      where: { id: dto.matchId, tournamentId: tournament.id },
    });
    if (!match) throw new NotFoundException('Match not found');
    if (match.status === TournamentMatchStatus.COMPLETED) {
      throw new BadRequestException('Cannot swap players on a completed match');
    }

    if (dto.playerId && dto.slot) {
      if (dto.slot === 'A') match.playerAId = dto.playerId;
      else match.playerBId = dto.playerId;
    } else {
      const tmp = match.playerAId;
      match.playerAId = match.playerBId;
      match.playerBId = tmp;
    }

    await this.matchRepo.save(match);
    await this.broadcastTv(tournament.id);
    return { success: true, match };
  }

  async adminReseed(userId: string, dto: AdminReseedDto) {
    const tournament = await this.requireOrganizer(userId, dto.tournamentId);
    if (tournament.status === TournamentV2Status.ACTIVE && !dto.force) {
      throw new BadRequestException('Tournament is ACTIVE — pass force=true to reseed');
    }
    if ((tournament.entrants?.length ?? 0) < 2) {
      throw new BadRequestException('Need at least 2 entrants');
    }

    if (dto.seedStrategy) {
      tournament.formatConfigJson = {
        ...(tournament.formatConfigJson ?? {}),
        seedStrategy: dto.seedStrategy,
      };
    }

    await this.regenerateBracket(tournament);
    if (tournament.status === TournamentV2Status.DRAFT) {
      // leave draft until start
    } else {
      tournament.status = TournamentV2Status.ACTIVE;
    }
    await this.tournamentRepo.save(tournament);
    await this.broadcastTv(tournament.id);
    return { success: true, seedStrategy: tournament.formatConfigJson?.seedStrategy ?? 'manual' };
  }

  /**
   * Swiss: after current round fully completed, pair by wins (adjacent).
   */
  async advanceSwissRound(userId: string, tournamentId: string) {
    const tournament = await this.requireOrganizer(userId, tournamentId);
    if (tournament.mode !== TournamentV2Mode.SWISS) {
      throw new BadRequestException('Tournament is not SWISS format');
    }

    const matches = await this.matchRepo.find({
      where: { tournamentId: tournament.id },
      order: { round: 'ASC' },
    });
    if (!matches.length) throw new BadRequestException('No matches');

    const lastRound = Math.max(...matches.map((m) => m.round));
    const roundMatches = matches.filter((m) => m.round === lastRound);
    if (roundMatches.some((m) => m.status !== TournamentMatchStatus.COMPLETED)) {
      throw new BadRequestException('Not all matches in current round are completed');
    }

    const standings = await this.getStandings(tournament.id);
    const ordered = standings.standings.map((s) => s.playerId);
    // Include entrants with 0 wins that may not appear if empty entrants list edge
    for (const e of tournament.entrants ?? []) {
      if (!ordered.includes(e)) ordered.push(e);
    }

    await this.bracketGeneration.generateSwissRound(tournament, ordered, lastRound + 1);
    await this.broadcastTv(tournament.id);
    return { success: true, nextRound: lastRound + 1 };
  }

  private async requireOrganizer(userId: string, tournamentId: string): Promise<TournamentV2> {
    const resolved = await this.resolveTournamentId(tournamentId);
    const tournament = await this.tournamentRepo.findOne({ where: { id: resolved } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.organizerId !== userId) throw new BadRequestException('Not tournament organizer');
    return tournament;
  }

  private async regenerateBracket(tournament: TournamentV2): Promise<void> {
    await this.matchRepo.delete({ tournamentId: tournament.id });
    await this.roundRepo.delete({ tournamentId: tournament.id });
    await this.nodeRepo.delete({ tournamentId: tournament.id });

    const strategy = parseSeedStrategy(tournament.formatConfigJson?.seedStrategy);
    const ratings = await this.loadRatings(tournament.entrants ?? []);
    const ordered = applySeedStrategy(tournament.entrants ?? [], strategy, ratings);
    tournament.formatConfigJson = {
      ...(tournament.formatConfigJson ?? {}),
      seedStrategy: strategy,
      lastSeedOrder: ordered,
    };
    await this.tournamentRepo.save(tournament);
    await this.bracketGeneration.generateForTournament(tournament, ordered);
  }

  private async loadRatings(playerIds: string[]): Promise<Record<string, number>> {
    if (!playerIds.length) return {};
    const users = await this.usersRepo.find({ where: { id: In(playerIds) } });
    const map: Record<string, number> = {};
    for (const u of users) map[u.id] = u.rating ?? 0;
    return map;
  }

  private async broadcastTv(tournamentId: string): Promise<void> {
    try {
      const payload = await this.getTvPayload(tournamentId);
      this.tvGateway?.emitTvSnapshot(tournamentId, payload);
    } catch (e) {
      this.logger.warn(`TV broadcast failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}
