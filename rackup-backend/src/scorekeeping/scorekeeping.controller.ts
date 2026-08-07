import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MatchTimelineService } from './match-timeline.service';
import { AppendTimelineEventDto, StartTimelineDto } from './dto/timeline.dto';
import { ScorekeepingServiceV2 } from './scorekeeping-v2.service';
import { GameRulesService } from './game-rules.service';
import { keyForSotdCandidatesV2 } from '../common/redis-keys';
import { getRedisClient } from '../config/redis.config';

@Controller('scorekeeping/v2')
export class ScorekeepingController {
  constructor(
    private readonly timelines: MatchTimelineService,
    private readonly scorekeepingV2: ScorekeepingServiceV2,
    private readonly gameRules: GameRulesService,
  ) {}

  /** Game rule metadata + race validation helpers */
  @Get('rules')
  rules(@Query('game') game?: string) {
    const g = this.gameRules.normalizeGame(game);
    return { game: g, ...this.gameRules.describe(g) };
  }

  @Post('rules/validate-score')
  validateScore(
    @Body()
    body: {
      game?: string;
      raceTo: number;
      aScore: number;
      bScore: number;
    },
  ) {
    return this.gameRules.assertValidRaceScore({
      game: body.game,
      raceTo: body.raceTo,
      aScore: body.aScore,
      bScore: body.bScore,
      allowIncomplete: true,
    });
  }

  @Post('timeline/start')
  @UseGuards(AuthGuard('jwt'))
  async start(@Body() dto: StartTimelineDto) {
    return this.timelines.startTimeline({
      matchId: dto.matchId,
      domain: dto.domain,
      entityId: dto.entityId,
      hallId: dto.hallId,
      playerAId: dto.playerAId,
      playerBId: dto.playerBId,
      gameType: dto.gameType,
    });
  }

  @Post('timeline/event')
  @UseGuards(AuthGuard('jwt'))
  async append(@Body() dto: AppendTimelineEventDto) {
    return this.timelines.appendEvent({
      matchId: dto.matchId,
      domain: dto.domain,
      entityId: dto.entityId,
      hallId: dto.hallId,
      playerAId: dto.playerAId,
      playerBId: dto.playerBId,
      gameType: dto.gameType,
      type: dto.type,
      playerId: dto.playerId,
      rack: dto.rack,
      aScore: dto.aScore,
      bScore: dto.bScore,
      data: dto.data,
      note: dto.note,
    });
  }

  @Get('timeline/:matchId')
  @UseGuards(AuthGuard('jwt'))
  async get(@Param('matchId', new ParseUUIDPipe()) matchId: string) {
    return this.timelines.getTimeline(matchId);
  }

  /** Today's SOTD candidate events harvested from live matches */
  @Get('sotd-candidates')
  async sotdCandidates() {
    try {
      const redis = await getRedisClient();
      const raw = await redis.lRange(keyForSotdCandidatesV2(), 0, 49);
      return {
        day: new Date().toISOString().slice(0, 10),
        count: raw.length,
        candidates: raw.map((r) => {
          try {
            return JSON.parse(r);
          } catch {
            return r;
          }
        }),
      };
    } catch {
      return { day: new Date().toISOString().slice(0, 10), count: 0, candidates: [] };
    }
  }

  @Get('health')
  async health() {
    return this.scorekeepingV2.getHealthSnapshot();
  }
}
