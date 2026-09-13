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
import {
  classifyMatchSlots,
  dropsLoserToLosers,
  feederMatchIndices,
  isEliminationMode,
  isSingleElimFinal,
} from './bracket-advance';
import {
  CHIP_FORMULA_ID,
  CHIP_MATCH_POT,
  chipTransferAmount,
  isChipBySkillEnabled,
  startingChipsForSkill,
} from './chip-by-skill';

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

  async list(limit = 40) {
    const rows = await this.tournamentRepo.find({
      order: { name: 'ASC' },
      take: Math.min(100, Math.max(1, limit)),
    });
    return rows.map((t) => this.serializeTournament(t));
  }

  async create(userId: string, dto: CreateTournamentV2Dto) {
    const chipBySkill = isChipBySkillEnabled(dto.mode, {
      ...(dto.format_config ?? {}),
      ...(dto.chipBySkill != null ? { chipBySkill: dto.chipBySkill } : {}),
    });
    const formatConfig = {
      ...(dto.format_config ?? {}),
      ...(dto.seed_strategy ? { seedStrategy: dto.seed_strategy } : {}),
      ...(dto.chipBySkill != null ? { chipBySkill: dto.chipBySkill } : {}),
      ...(chipBySkill
        ? {
            chipBySkill: true,
            chipFormula: CHIP_FORMULA_ID,
            chipPot: Number(dto.format_config?.chipPot) || CHIP_MATCH_POT,
            chipStacks: {},
            chipMeta: {},
          }
        : {}),
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
    return this.serializeTournament(saved);
  }

  async register(
    userId: string,
    dto: RegisterTournamentV2Dto,
  ): Promise<{
    success: true;
    chipBySkill?: boolean;
    chips?: number;
    ratingBand?: string;
    formula?: string;
  }> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: dto.tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status !== TournamentV2Status.DRAFT) {
      throw new BadRequestException('Tournament is not in draft state');
    }

    const entrants = new Set<string>(tournament.entrants ?? []);
    entrants.add(userId);
    tournament.entrants = Array.from(entrants);

    let chips: number | undefined;
    let ratingBand: string | undefined;
    if (isChipBySkillEnabled(tournament.mode, tournament.formatConfigJson)) {
      const assigned = await this.assignChipsForPlayers(tournament, [userId]);
      chips = assigned[userId]?.chips;
      ratingBand = assigned[userId]?.band;
    }

    await this.tournamentRepo.save(tournament);

    return {
      success: true,
      ...(chips != null
        ? {
            chipBySkill: true,
            chips,
            ratingBand,
            formula: CHIP_FORMULA_ID,
          }
        : {}),
    };
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

    if (isChipBySkillEnabled(tournament.mode, tournament.formatConfigJson)) {
      await this.assignChipsForPlayers(tournament, tournament.entrants ?? []);
    }

    await this.regenerateBracket(tournament);

    tournament.status = TournamentV2Status.ACTIVE;
    await this.tournamentRepo.save(tournament);
    await this.resolveOpeningByes(tournament);
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

    if (match.winnerId && isEliminationMode(tournament.mode)) {
      await this.advanceWinner(match);
    }

    if (isChipBySkillEnabled(tournament.mode, tournament.formatConfigJson)) {
      await this.applyChipTransfer(tournament, match);
      await this.maybeCompleteChipRace(tournament);
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
   * Advance winner within their bracket.
   * Losers-bracket drop is DOUBLE_ELIMINATION only — single elim never spawns LOSERS.
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

    if (
      tournament &&
      isSingleElimFinal(
        tournament.mode,
        bracket,
        match.round,
        tournament.entrants?.length ?? 0,
      )
    ) {
      await this.completeTournament(tournament, match.winnerId);
      return;
    }

    await this.placePlayerInNextMatch(
      match.tournamentId,
      match.round,
      match.matchIndex,
      match.winnerId,
      bracket,
    );

    if (
      bracket === TournamentBracketSide.WINNERS &&
      tournament &&
      dropsLoserToLosers(tournament.mode)
    ) {
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

    if (tournament) {
      await this.resolveOpeningByes(tournament);
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

    await this.completeTournament(tournament, match.winnerId);
  }

  private async placeLoserIntoLosers(
    tournamentId: string,
    winnersRound: number,
    winnersMatchIndex: number,
    loserId: string,
  ): Promise<void> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament || !dropsLoserToLosers(tournament.mode)) return;

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
      tournament: this.serializeTournament(tournament),
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

    const stacks = (tournament.formatConfigJson?.chipStacks ?? {}) as Record<string, number>;
    const meta = (tournament.formatConfigJson?.chipMeta ?? {}) as Record<
      string,
      { band?: string; rating?: number; chips?: number }
    >;
    const chipBySkill = isChipBySkillEnabled(tournament.mode, tournament.formatConfigJson);

    const standings = entrants
      .map((playerId) => ({
        playerId,
        wins: winCounts[playerId] ?? 0,
        ...(chipBySkill
          ? {
              chips: Number(stacks[playerId] ?? 0),
              startingChips: meta[playerId]?.chips,
              ratingBand: meta[playerId]?.band,
              rating: meta[playerId]?.rating,
            }
          : {}),
      }))
      .sort((a, b) => {
        if (chipBySkill) {
          const ca = Number((a as { chips?: number }).chips ?? 0);
          const cb = Number((b as { chips?: number }).chips ?? 0);
          if (cb !== ca) return cb - ca;
        }
        return b.wins - a.wins;
      });

    return {
      tournamentId: resolved,
      standings,
      chipBySkill,
      chipFormula: chipBySkill
        ? (tournament.formatConfigJson?.chipFormula ?? CHIP_FORMULA_ID)
        : undefined,
      ...(resolved !== tournamentId ? { resolvedFrom: tournamentId } : {}),
    };
  }

  /** Public TV / spectator JSON (display-optimized). */
  async getTvPayload(tournamentId: string) {
    const bracket = await this.getBracket(tournamentId);
    const standings = await this.getStandings(tournamentId);
    const t = bracket.tournament as ReturnType<TournamentsV2Service['serializeTournament']>;
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
        chipBySkill: t.chipBySkill,
        chipFormula: t.chipFormula,
        championId: t.championId,
      },
      matches,
      standings: standings.standings,
      chipStacks: t.chipStacks,
      chipBySkill: t.chipBySkill,
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

    if (match.winnerId && isEliminationMode(tournament.mode)) {
      await this.advanceWinner(match);
    }

    if (isChipBySkillEnabled(tournament.mode, tournament.formatConfigJson)) {
      await this.applyChipTransfer(tournament, match);
      await this.maybeCompleteChipRace(tournament);
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
    if (tournament.status === TournamentV2Status.ACTIVE) {
      await this.resolveOpeningByes(tournament);
    }
    await this.broadcastTv(tournament.id);
    return { success: true, seedStrategy: tournament.formatConfigJson?.seedStrategy ?? 'manual' };
  }

  /**
   * Swiss / chip-race: after current round fully completed, pair by wins (or chips).
   */
  async advanceSwissRound(userId: string, tournamentId: string) {
    const tournament = await this.requireOrganizer(userId, tournamentId);
    if (
      tournament.mode !== TournamentV2Mode.SWISS &&
      tournament.mode !== TournamentV2Mode.CHIP_RACE
    ) {
      throw new BadRequestException('Tournament is not SWISS or CHIP_RACE format');
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
    const stacks = (tournament.formatConfigJson?.chipStacks ?? {}) as Record<string, number>;
    const chipEvent = isChipBySkillEnabled(tournament.mode, tournament.formatConfigJson);
    const ordered = standings.standings
      .map((s) => s.playerId)
      .filter((id) => !chipEvent || Number(stacks[id] ?? 0) > 0);
    for (const e of tournament.entrants ?? []) {
      if (!ordered.includes(e) && (!chipEvent || Number(stacks[e] ?? 0) > 0)) {
        ordered.push(e);
      }
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

  private serializeTournament(t: TournamentV2) {
    const chipBySkill = isChipBySkillEnabled(t.mode, t.formatConfigJson);
    return {
      id: t.id,
      organizerId: t.organizerId,
      name: t.name,
      game: t.game,
      mode: t.mode,
      status: t.status,
      entrants: t.entrants ?? [],
      formatConfigJson: t.formatConfigJson ?? {},
      format_config: t.formatConfigJson ?? {},
      chipBySkill,
      chipStacks: chipBySkill
        ? ((t.formatConfigJson?.chipStacks ?? {}) as Record<string, number>)
        : undefined,
      chipFormula: chipBySkill
        ? ((t.formatConfigJson?.chipFormula as string | undefined) ?? CHIP_FORMULA_ID)
        : undefined,
      championId: t.formatConfigJson?.championId as string | undefined,
    };
  }

  private async assignChipsForPlayers(
    tournament: TournamentV2,
    playerIds: string[],
  ): Promise<Record<string, { chips: number; band: string }>> {
    const unique = [...new Set(playerIds.filter(Boolean))];
    const users = unique.length
      ? await this.usersRepo.find({ where: { id: In(unique) } })
      : [];
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const stacks = {
      ...((tournament.formatConfigJson?.chipStacks ?? {}) as Record<string, number>),
    };
    const meta = {
      ...((tournament.formatConfigJson?.chipMeta ?? {}) as Record<
        string,
        { band?: string; rating?: number; chips?: number }
      >),
    };
    const assigned: Record<string, { chips: number; band: string }> = {};
    for (const id of unique) {
      if (stacks[id] != null) {
        assigned[id] = { chips: Number(stacks[id]), band: String(meta[id]?.band ?? '') };
        continue;
      }
      const u = byId[id];
      const start = startingChipsForSkill({
        rating: u?.rating,
        ratingBand: u?.ratingBand,
      });
      stacks[id] = start.chips;
      meta[id] = { rating: start.rating, band: start.band, chips: start.chips };
      assigned[id] = { chips: start.chips, band: start.band };
    }
    tournament.formatConfigJson = {
      ...(tournament.formatConfigJson ?? {}),
      chipBySkill: true,
      chipFormula: CHIP_FORMULA_ID,
      chipPot: Number(tournament.formatConfigJson?.chipPot) || CHIP_MATCH_POT,
      chipStacks: stacks,
      chipMeta: meta,
    };
    return assigned;
  }

  private async applyChipTransfer(
    tournament: TournamentV2,
    match: TournamentMatchV2,
  ): Promise<void> {
    if (!match.winnerId) return;
    const loserId =
      match.winnerId === match.playerAId ? match.playerBId : match.playerAId;
    if (!loserId) return;
    const cfg = tournament.formatConfigJson ?? {};
    const stacks = { ...((cfg.chipStacks ?? {}) as Record<string, number>) };
    const pot = Number(cfg.chipPot) || CHIP_MATCH_POT;
    const amount = chipTransferAmount(Number(stacks[loserId] ?? 0), pot);
    stacks[match.winnerId] = Number(stacks[match.winnerId] ?? 0) + amount;
    stacks[loserId] = Math.max(0, Number(stacks[loserId] ?? 0) - amount);
    const ledger = Array.isArray(cfg.chipLedger) ? [...cfg.chipLedger] : [];
    ledger.push({
      matchId: match.id,
      winnerId: match.winnerId,
      loserId,
      amount,
      at: new Date().toISOString(),
    });
    tournament.formatConfigJson = { ...cfg, chipStacks: stacks, chipLedger: ledger };
    await this.tournamentRepo.save(tournament);
  }

  private async maybeCompleteChipRace(tournament: TournamentV2): Promise<void> {
    if (tournament.mode !== TournamentV2Mode.CHIP_RACE) return;
    const stacks = (tournament.formatConfigJson?.chipStacks ?? {}) as Record<string, number>;
    const alive = (tournament.entrants ?? []).filter((id) => Number(stacks[id] ?? 0) > 0);
    if (alive.length <= 1) {
      const champion = alive[0] ?? tournament.entrants?.[0];
      if (champion) await this.completeTournament(tournament, champion);
    }
  }

  private async completeTournament(
    tournament: TournamentV2,
    championId: string,
  ): Promise<void> {
    tournament.status = TournamentV2Status.COMPLETED;
    tournament.formatConfigJson = {
      ...(tournament.formatConfigJson ?? {}),
      championId,
      completedAt: new Date().toISOString(),
    };
    await this.tournamentRepo.save(tournament);
    this.logger.log(`tournament COMPLETED champion=${championId}`);
  }

  /** Auto-advance player-vs-empty slots when no feeder can still fill the hole. */
  private async resolveOpeningByes(tournament: TournamentV2): Promise<void> {
    if (!isEliminationMode(tournament.mode)) return;
    let progressed = true;
    let guard = 0;
    while (progressed && guard++ < 32) {
      progressed = false;
      const fresh = await this.tournamentRepo.findOne({ where: { id: tournament.id } });
      if (!fresh) return;
      Object.assign(tournament, fresh);
      if (tournament.status === TournamentV2Status.COMPLETED) return;
      const matches = await this.matchRepo.find({
        where: {
          tournamentId: tournament.id,
          status: TournamentMatchStatus.ACTIVE,
        },
      });
      for (const m of matches) {
        if (await this.tryResolveBye(m, tournament)) progressed = true;
      }
    }
  }

  private async tryResolveBye(
    match: TournamentMatchV2,
    tournament: TournamentV2,
  ): Promise<boolean> {
    if (match.status === TournamentMatchStatus.COMPLETED) return false;
    const kind = classifyMatchSlots(match.playerAId, match.playerBId);
    if (kind !== 'bye-a' && kind !== 'bye-b') return false;
    const winnerId = kind === 'bye-a' ? match.playerAId : match.playerBId;
    if (!winnerId) return false;
    if (await this.hasPendingFeeder(match)) return false;

    match.status = TournamentMatchStatus.COMPLETED;
    match.winnerId = winnerId;
    match.aScore = match.aScore ?? 0;
    match.bScore = match.bScore ?? 0;
    await this.matchRepo.save(match);

    const bracket = match.bracket ?? TournamentBracketSide.WINNERS;
    if (
      isSingleElimFinal(
        tournament.mode,
        bracket,
        match.round,
        tournament.entrants?.length ?? 0,
      )
    ) {
      await this.completeTournament(tournament, winnerId);
      return true;
    }

    await this.placePlayerInNextMatch(
      match.tournamentId,
      match.round,
      match.matchIndex,
      winnerId,
      bracket,
    );
    if (tournament.mode === TournamentV2Mode.DOUBLE_ELIMINATION) {
      await this.maybeScheduleGrandFinal(match.tournamentId);
    }
    return true;
  }

  private async hasPendingFeeder(match: TournamentMatchV2): Promise<boolean> {
    const feed = feederMatchIndices(match.round, match.matchIndex);
    if (!feed) return false;
    const emptyA = !match.playerAId;
    const emptyB = !match.playerBId;
    for (const idx of feed.indices) {
      const feeder = await this.matchRepo.findOne({
        where: {
          tournamentId: match.tournamentId,
          round: feed.prevRound,
          matchIndex: idx,
          bracket: match.bracket,
        },
      });
      if (!feeder) continue;
      if (feeder.status !== TournamentMatchStatus.COMPLETED) {
        const fillsA = idx % 2 === 1;
        if (fillsA && emptyA) return true;
        if (!fillsA && emptyB) return true;
      }
    }
    return false;
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
