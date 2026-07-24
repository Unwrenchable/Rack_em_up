import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LeagueSeason, LeagueSeasonStatus } from './entities/league-season.entity';
import { LeagueStanding } from './entities/league-standing.entity';
import { LeagueScheduledMatch, LeagueScheduledMatchStatus } from './entities/league-scheduled-match.entity';
import { ExternalRatingSource } from './entities/external-rating-source.entity';
import { PlayerExternalRating } from './entities/player-external-rating.entity';

import { CreateLeagueSeasonV2Dto } from './dto/create-league-season-v2.dto';
import { StartLeagueSeasonV2Dto } from './dto/start-league-season-v2.dto';
import { ScheduleLeagueMatchV2Dto } from './dto/schedule-league-match-v2.dto';
import { ReportLeagueMatchV2Dto } from './dto/report-league-match-v2.dto';
import { RatingsImportV2Dto } from './dto/ratings-import-v2.dto';

import { unifyRackupRating } from './rating/unified-rackup-rating';
import { ScorekeepingService } from '../../scorekeeping/scorekeeping.service';
import { RealaiV2Service } from '../../realai/v2/realai-v2.service';
import { RatingService } from '../../users/rating.service';

@Injectable()
export class LeaguesV2Service {
  private readonly logger = new Logger(LeaguesV2Service.name);

  constructor(
    @InjectRepository(LeagueSeason)
    private readonly seasonRepo: Repository<LeagueSeason>,

    @InjectRepository(LeagueStanding)
    private readonly standingRepo: Repository<LeagueStanding>,

    @InjectRepository(LeagueScheduledMatch)
    private readonly scheduledMatchRepo: Repository<LeagueScheduledMatch>,

    @InjectRepository(ExternalRatingSource)
    private readonly ratingSourceRepo: Repository<ExternalRatingSource>,

    @InjectRepository(PlayerExternalRating)
    private readonly playerExternalRatingRepo: Repository<PlayerExternalRating>,

    private readonly scorekeeping: ScorekeepingService,
    private readonly realaiV2: RealaiV2Service,
    private readonly ratingService: RatingService,
  ) {}

  async createSeason(organizerId: string, dto: CreateLeagueSeasonV2Dto): Promise<LeagueSeason> {
    const season = this.seasonRepo.create({
      organizerId,
      name: dto.name,
      region: dto.region,
      weeklySchedule: dto.weekly_schedule ?? [],
      status: LeagueSeasonStatus.DRAFT,
      weekIndex: 0,
    });

    return this.seasonRepo.save(season);
  }

  async startSeason(organizerId: string, dto: StartLeagueSeasonV2Dto): Promise<{ success: true }> {
    const season = await this.seasonRepo.findOne({ where: { id: dto.seasonId } });
    if (!season) throw new NotFoundException('Season not found');
    if (season.organizerId !== organizerId) throw new BadRequestException('Not season organizer');
    if (season.status !== LeagueSeasonStatus.DRAFT) throw new BadRequestException('Season already started');

    season.status = LeagueSeasonStatus.ACTIVE;
    season.startedAt = new Date();
    await this.seasonRepo.save(season);

    // Create empty standings snapshot.
    const standings = (dto.initialPlayers ?? []).map((playerId) =>
      this.standingRepo.create({ seasonId: season.id, playerId, points: 0, position: 0 }),
    );
    if (standings.length) await this.standingRepo.save(standings);

    return { success: true };
  }

  async getStandings(seasonId: string): Promise<{ seasonId: string; standings: Array<{ playerId: string; points: number; position: number }> }> {
    const season = await this.seasonRepo.findOne({ where: { id: seasonId } });
    if (!season) throw new NotFoundException('Season not found');

    const standings = await this.standingRepo.find({ where: { seasonId }, order: { points: 'DESC' }, take: 1000 });
    // Position is computed on read to keep write logic simple.
    const withPos = standings.map((s, idx) => ({
      playerId: s.playerId,
      points: s.points,
      position: idx + 1,
    }));

    return { seasonId, standings: withPos };
  }

  async scheduleMatch(organizerId: string, seasonId: string, dto: ScheduleLeagueMatchV2Dto): Promise<{ success: true }> {
    const season = await this.seasonRepo.findOne({ where: { id: seasonId } });
    if (!season) throw new NotFoundException('Season not found');
    if (season.organizerId !== organizerId) throw new BadRequestException('Not season organizer');
    if (season.status !== LeagueSeasonStatus.ACTIVE) throw new BadRequestException('Season not active');

    const scheduled = this.scheduledMatchRepo.create({
      seasonId,
      weekIndex: dto.weekIndex,
      playerAId: dto.playerAId,
      playerBId: dto.playerBId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
      status: LeagueScheduledMatchStatus.SCHEDULED,
    });

    await this.scheduledMatchRepo.save(scheduled);
    return { success: true };
  }

  async reportMatch(organizerId: string, seasonId: string, dto: ReportLeagueMatchV2Dto): Promise<{ success: true }> {
    const season = await this.seasonRepo.findOne({ where: { id: seasonId } });
    if (!season) throw new NotFoundException('Season not found');
    if (season.organizerId !== organizerId) throw new BadRequestException('Not season organizer');

    const match = await this.scheduledMatchRepo.findOne({ where: { id: dto.scheduledMatchId, seasonId } });
    if (!match) throw new NotFoundException('Scheduled match not found');
    if (match.status !== LeagueScheduledMatchStatus.SCHEDULED) throw new BadRequestException('Match already reported');

    match.playerAScore = dto.playerAScore;
    match.playerBScore = dto.playerBScore;
    match.reportedAt = new Date();
    match.status = LeagueScheduledMatchStatus.COMPLETED;

    await this.scheduledMatchRepo.save(match);

    // standings update: win=3, draw=1
    const aWins = dto.playerAScore > dto.playerBScore;
    const bWins = dto.playerBScore > dto.playerAScore;

    const aStanding = await this.standingRepo.findOne({ where: { seasonId, playerId: match.playerAId } });
    const bStanding = await this.standingRepo.findOne({ where: { seasonId, playerId: match.playerBId } });
    if (!aStanding || !bStanding) throw new BadRequestException('Standings snapshot missing players');

    if (aWins) {
      aStanding.points += 3;
    } else if (bWins) {
      bStanding.points += 3;
    } else {
      aStanding.points += 1;
      bStanding.points += 1;
    }

    await this.standingRepo.save([aStanding, bStanding]);

    const winnerId = aWins ? match.playerAId : bWins ? match.playerBId : null;
    if (winnerId) {
      const loserId = winnerId === match.playerAId ? match.playerBId : match.playerAId;
      await this.ratingService.applyMatchResult(winnerId, loserId).catch((e) =>
        this.logger.warn(`league rating failed: ${e}`),
      );
    }

    await this.scorekeeping.emitScoreUpdate({
      domain: 'league_v2',
      entityId: seasonId,
      matchId: match.id,
      playerAId: match.playerAId,
      playerBId: match.playerBId,
      aScore: dto.playerAScore,
      bScore: dto.playerBScore,
      winnerId,
    });

    void this.realaiV2
      .submitSummaryJob({
        matchId: match.id,
        context: `league_v2:${seasonId}`,
      })
      .catch((e) => this.logger.warn(`league summary job: ${e}`));

    return { success: true };
  }

  async importExternalRatings(_organizerId: string, dto: RatingsImportV2Dto): Promise<{ success: true }> {
    const source = await this.ratingSourceRepo.findOne({ where: { name: dto.sourceName } });
    const src =
      source ??
      (await this.ratingSourceRepo.save(
        this.ratingSourceRepo.create({ name: dto.sourceName, region: dto.region ?? null, rawConfig: dto.rawConfig ?? {} }),
      ));

    for (const pr of dto.ratings) {
      const unified = unifyRackupRating(dto.sourceName, pr.rating);

      const row = this.playerExternalRatingRepo.create({
        seasonId: dto.seasonId,
        sourceId: src.id,
        playerId: pr.playerId,
        externalRating: pr.rating,
        unifiedRating: unified,
      });
      await this.playerExternalRatingRepo.save(row);
    }

    return { success: true };
  }

  async getUnifiedPlayerRating(playerId: string): Promise<{ playerId: string; unifiedRating: number | null }> {
    // Return most recent unified rating across sources.
    const rows = await this.playerExternalRatingRepo.find({ where: { playerId }, order: { createdAt: 'DESC' }, take: 1 });
    if (!rows.length) return { playerId, unifiedRating: null };
    return { playerId, unifiedRating: rows[0].unifiedRating ?? null };
  }
}

