import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoolMatch } from './pool-match.entity';
import { CreatePoolMatchDto } from './dto/create-pool-match.dto';
import { ReportPoolMatchDto } from './dto/report-pool-match.dto';
import { MatchesGateway } from './matches.gateway';
import { ScorekeepingServiceV2 } from '../scorekeeping/scorekeeping-v2.service';
import { GameStyle, isRackupPyramid, normalizeGameStyle } from '../games/game-style';
import {
  createInitialPyramidState,
  pocketBalls,
  PyramidLiveState,
  scoreboardFromState,
} from '../games/pyramid';
import {
  parsePyramidSkillLevel,
  parseTableSizeFt,
  PyramidSkillLevel,
  PyramidTableSizeFt,
} from '../games/pyramid/pyramid-skill-level';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectRepository(PoolMatch)
    private readonly matchesRepo: Repository<PoolMatch>,
    private readonly matchesGateway: MatchesGateway,
    private readonly scorekeepingV2: ScorekeepingServiceV2,
  ) {}

  async create(dto: CreatePoolMatchDto): Promise<PoolMatch> {
    if (dto.playerAId === dto.playerBId) {
      throw new BadRequestException('Players must be different');
    }

    const game = normalizeGameStyle(dto.game);

    if (isRackupPyramid(String(game))) {
      return this.createPyramidMatch(dto);
    }

    if (dto.raceTo == null || dto.raceTo < 1) {
      throw new BadRequestException('raceTo is required for non-pyramid games');
    }

    const created = this.matchesRepo.create({
      playerAId: dto.playerAId,
      playerBId: dto.playerBId,
      hallId: dto.hallId ?? null,
      game: String(game),
      raceTo: dto.raceTo,
      status: 'PENDING',
      aScore: null,
      bScore: null,
      tableSizeFt: dto.tableSizeFt ?? null,
      skillLevel: null,
      stateJson: null,
      ratingWeight: 1,
    });

    const saved = await this.matchesRepo.save(created);
    this.matchesGateway.emitMatchCreated(saved);
    return saved;
  }

  private async createPyramidMatch(dto: CreatePoolMatchDto): Promise<PoolMatch> {
    let tableSizeFt: PyramidTableSizeFt;
    try {
      tableSizeFt = parseTableSizeFt(dto.tableSizeFt);
    } catch {
      throw new BadRequestException(
        'RackUp Pyramid requires tableSizeFt of 7 (10-ball rack) or 9 (15-ball rack)',
      );
    }
    const skillLevel = parsePyramidSkillLevel(dto.skillLevel);
    const state = createInitialPyramidState(tableSizeFt, skillLevel);

    const created = this.matchesRepo.create({
      playerAId: dto.playerAId,
      playerBId: dto.playerBId,
      hallId: dto.hallId ?? null,
      game: GameStyle.RACKUP_PYRAMID,
      raceTo: state.pointsToWin,
      status: 'PENDING',
      aScore: 0,
      bScore: 0,
      tableSizeFt,
      skillLevel,
      stateJson: state as unknown as Record<string, any>,
      ratingWeight: state.ratingWeight,
    });

    const saved = await this.matchesRepo.save(created);
    this.matchesGateway.emitMatchCreated(saved);
    this.logger.log(
      `pyramid match ${saved.id} ${tableSizeFt}ft ${skillLevel} race=${state.pointsToWin} weight=${state.ratingWeight}`,
    );
    return saved;
  }

  async findOne(id: string): Promise<PoolMatch> {
    const match = await this.matchesRepo.findOne({ where: { id } });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  async acceptMatch(id: string, userId: string): Promise<PoolMatch> {
    const match = await this.findOne(id);

    if (match.status !== 'PENDING') {
      throw new BadRequestException('Match is not pending');
    }

    if (match.playerAId !== userId && match.playerBId !== userId) {
      throw new BadRequestException('You are not part of this match');
    }

    (match as any).accepted = (match as any).accepted || {};
    (match as any).accepted[userId] = true;

    const aAccepted = (match as any).accepted[match.playerAId];
    const bAccepted = (match as any).accepted[match.playerBId];

    if (aAccepted && bAccepted) {
      match.status = 'ACTIVE';
      const saved = await this.matchesRepo.save(match);
      this.matchesGateway.emitMatchStarted(saved);
      this.emitScoreboard(saved);
      return saved;
    }

    return this.matchesRepo.save(match);
  }

  async cancelMatch(id: string, userId: string): Promise<PoolMatch> {
    const match = await this.findOne(id);

    if (match.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed match');
    }

    if (match.playerAId !== userId && match.playerBId !== userId) {
      throw new BadRequestException('You are not part of this match');
    }

    match.status = 'CANCELLED';
    const saved = await this.matchesRepo.save(match);
    this.matchesGateway.emitMatchCancelled(saved);
    return saved;
  }

  /**
   * Live scoreboard for any match; Pyramid includes balls remaining + points.
   */
  async getScoreboard(id: string) {
    const match = await this.findOne(id);
    if (isRackupPyramid(match.game) && match.stateJson) {
      const state = match.stateJson as unknown as PyramidLiveState;
      return {
        matchId: match.id,
        status: match.status,
        playerAId: match.playerAId,
        playerBId: match.playerBId,
        game: match.game,
        ...scoreboardFromState(state),
      };
    }
    return {
      matchId: match.id,
      status: match.status,
      playerAId: match.playerAId,
      playerBId: match.playerBId,
      game: match.game,
      raceTo: match.raceTo,
      aScore: match.aScore,
      bScore: match.bScore,
      tableSizeFt: match.tableSizeFt,
      skillLevel: match.skillLevel,
      ratingWeight: match.ratingWeight ?? 1,
      isComplete: match.status === 'COMPLETED',
    };
  }

  /**
   * Pyramid: pocket object ball(s) for a player — updates points + balls remaining.
   */
  async pyramidPocket(id: string, playerId: string, balls: number[]): Promise<PoolMatch> {
    const match = await this.findOne(id);
    if (!isRackupPyramid(match.game)) {
      throw new BadRequestException('Not a RackUp Pyramid match');
    }
    if (match.status !== 'ACTIVE' && match.status !== 'PENDING') {
      throw new BadRequestException(`Cannot pocket when status=${match.status}`);
    }
    if (match.status === 'PENDING') {
      match.status = 'ACTIVE';
    }

    const side =
      playerId === match.playerAId ? 'A' : playerId === match.playerBId ? 'B' : null;
    if (!side) throw new BadRequestException('Player is not in this match');

    let state = (match.stateJson ?? null) as PyramidLiveState | null;
    if (!state) {
      state = createInitialPyramidState(
        (match.tableSizeFt as PyramidTableSizeFt) ?? 9,
        parsePyramidSkillLevel(match.skillLevel),
      );
    }

    state = pocketBalls(state, side, balls);
    match.stateJson = state as unknown as Record<string, any>;
    match.aScore = state.aPoints;
    match.bScore = state.bPoints;
    match.ratingWeight = state.ratingWeight;

    if (state.isComplete && state.winnerSide) {
      match.status = 'COMPLETED';
      const saved = await this.matchesRepo.save(match);
      const winnerId =
        state.winnerSide === 'A' ? saved.playerAId : saved.playerBId;
      await this.scorekeepingV2.processReport({
        domain: 'standard',
        matchId: saved.id,
        entityId: saved.id,
        playerAId: saved.playerAId,
        playerBId: saved.playerBId,
        aScore: saved.aScore ?? 0,
        bScore: saved.bScore ?? 0,
        winnerId,
        gameType: GameStyle.RACKUP_PYRAMID,
        hallId: saved.hallId,
        raceTo: saved.raceTo,
        ratingWeight: saved.ratingWeight ?? state.ratingWeight,
        tableSize: saved.tableSizeFt ? `${saved.tableSizeFt}ft` : undefined,
        skillLevel: saved.skillLevel ?? undefined,
      });
      this.matchesGateway.emitMatchCompleted(saved);
      this.emitScoreboard(saved);
      return saved;
    }

    const saved = await this.matchesRepo.save(match);
    this.emitScoreboard(saved);
    return saved;
  }

  /** Report final score — standard races or pyramid final points. */
  async reportResult(id: string, dto: ReportPoolMatchDto): Promise<PoolMatch> {
    const match = await this.findOne(id);

    if (match.status !== 'ACTIVE' && match.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot report result for status=${match.status}`,
      );
    }

    if (dto.aScore === dto.bScore) {
      throw new BadRequestException('Tie scores are not allowed');
    }

    if (isRackupPyramid(match.game)) {
      // Pyramid: scores are points; must meet raceTo (pointsToWin)
      if (dto.aScore < match.raceTo && dto.bScore < match.raceTo) {
        throw new BadRequestException(
          `Pyramid match incomplete: need ${match.raceTo} points to win`,
        );
      }
    } else if (dto.aScore > match.raceTo || dto.bScore > match.raceTo) {
      throw new BadRequestException('Score exceeds race limit');
    }

    match.aScore = dto.aScore;
    match.bScore = dto.bScore;
    match.status = 'COMPLETED';

    if (isRackupPyramid(match.game) && match.stateJson) {
      const state = match.stateJson as unknown as PyramidLiveState;
      state.aPoints = dto.aScore;
      state.bPoints = dto.bScore;
      state.isComplete = true;
      state.winnerSide = dto.aScore > dto.bScore ? 'A' : 'B';
      match.stateJson = state as unknown as Record<string, any>;
    }

    const saved = await this.matchesRepo.save(match);
    const aWins = saved.aScore! > saved.bScore!;

    await this.scorekeepingV2.processReport({
      domain: 'standard',
      matchId: saved.id,
      entityId: saved.id,
      playerAId: saved.playerAId,
      playerBId: saved.playerBId,
      aScore: saved.aScore ?? 0,
      bScore: saved.bScore ?? 0,
      winnerId: aWins ? saved.playerAId : saved.playerBId,
      gameType: saved.game,
      hallId: saved.hallId,
      raceTo: saved.raceTo,
      ratingWeight: saved.ratingWeight ?? 1,
      tableSize: saved.tableSizeFt ? `${saved.tableSizeFt}ft` : undefined,
      skillLevel: saved.skillLevel ?? undefined,
    });

    this.matchesGateway.emitMatchCompleted(saved);
    this.emitScoreboard(saved);
    return saved;
  }

  async listForUser(userId: string): Promise<PoolMatch[]> {
    return this.matchesRepo.find({
      where: [{ playerAId: userId }, { playerBId: userId }],
      order: { createdAt: 'DESC' },
    });
  }

  /** Public presets for FE match creation. */
  listPyramidPresets() {
    const skills = Object.values(PyramidSkillLevel);
    const tables: PyramidTableSizeFt[] = [7, 9];
    const presets = [];
    for (const tableSizeFt of tables) {
      for (const skillLevel of skills) {
        const state = createInitialPyramidState(tableSizeFt, skillLevel);
        presets.push({
          tableSizeFt,
          skillLevel,
          rackBalls: state.rackBalls,
          pointsToWin: state.pointsToWin,
          callShot: state.callShot,
          ratingWeight: state.ratingWeight,
          label: `${skillLevel} · ${tableSizeFt}ft · ${state.rackBalls}-ball · ${state.pointsToWin} pts`,
        });
      }
    }
    return {
      gameStyle: GameStyle.RACKUP_PYRAMID,
      rules: {
        scoring: 'Pocketed ball scores its number; 1-ball = 11',
        cue: 'Designated cue ball only',
        win: 'First to points-to-win',
        tables: 'American 7ft → 10-ball rack; 9ft → 15-ball rack',
        rating: 'Shared ladder; K scaled by skill weight',
      },
      presets,
    };
  }

  private emitScoreboard(match: PoolMatch) {
    try {
      if (isRackupPyramid(match.game) && match.stateJson) {
        const board = {
          matchId: match.id,
          status: match.status,
          ...scoreboardFromState(match.stateJson as unknown as PyramidLiveState),
        };
        this.matchesGateway.emitScoreUpdate({
          domain: 'standard',
          entityId: match.id,
          matchId: match.id,
          playerAId: match.playerAId,
          playerBId: match.playerBId,
          aScore: match.aScore ?? 0,
          bScore: match.bScore ?? 0,
          winnerId:
            match.status === 'COMPLETED'
              ? (match.aScore ?? 0) > (match.bScore ?? 0)
                ? match.playerAId
                : match.playerBId
              : null,
          hallId: match.hallId,
          occurredAt: new Date().toISOString(),
        });
        // Also emit full pyramid board on generic event for FE
        if (this.matchesGateway.server) {
          this.matchesGateway.server.emit('pyramid_scoreboard', board);
        }
      }
    } catch (e) {
      this.logger.warn(`scoreboard emit: ${e instanceof Error ? e.message : e}`);
    }
  }
}
