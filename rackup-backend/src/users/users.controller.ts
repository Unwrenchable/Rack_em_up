import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { StatsService } from './stats.service';
import { UsersService } from './users.service';
import { RatingService } from './rating.service';
import { toGlickoPublic } from './rating-display';
import { UploadAvatarDto } from './dto/upload-avatar.dto';
import { PlayerCardService } from '../ratings/player-card.service';

class SeedRatingDto {
  @IsString()
  from_system!: string;

  @IsNumber()
  from_value!: number;

  @IsOptional()
  @IsString()
  from_scale?: string;

  @IsOptional()
  @IsString()
  fargo_id?: string;

  @IsOptional()
  @IsString()
  fargo_readable_id?: string;

  @IsOptional()
  @IsString()
  apa_member_id?: string;
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly statsService: StatsService,
    private readonly usersService: UsersService,
    private readonly ratingService: RatingService,
    private readonly playerCards: PlayerCardService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: any) {
    const full = await this.usersService.findById(req.user.id);
    const u = full ?? req.user;
    const premiumActive =
      u.premiumTier &&
      u.premiumTier !== 'free' &&
      (!u.premiumUntil || new Date(u.premiumUntil) > new Date());
    const glicko = full
      ? this.ratingService.publicPayload(full)
      : toGlickoPublic({ rating: u.rating });
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      reputation: u.reputation,
      rating: glicko.rating,
      rd: glicko.rd,
      volatility: glicko.volatility,
      matches: glicko.matches,
      band: glicko.band,
      ratingDisplay: glicko.display,
      ladder: glicko.ladder,
      premiumTier: u.premiumTier ?? 'free',
      premiumUntil: u.premiumUntil ?? null,
      premiumActive: !!premiumActive,
    };
  }

  /**
   * One-time Glicko seed from external league rating (APA/BCA/Fargo/TAP/VNEA).
   * RealAI rating_convert — only when matches == 0.
   * Also records the external value on the Unified Player Card (separate continua).
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('me/rating/seed')
  async seedRating(@Req() req: any, @Body() body: SeedRatingDto) {
    const glicko = await this.ratingService.seedFromExternal(req.user.id, {
      from_system: body.from_system,
      from_value: body.from_value,
      from_scale: body.from_scale,
    });
    await this.playerCards.recordExternalSeed(req.user.id, {
      from_system: body.from_system,
      from_value: body.from_value,
      from_scale: body.from_scale,
    });
    if (body.fargo_id || body.apa_member_id || body.fargo_readable_id) {
      await this.playerCards.manualImport({
        userId: req.user.id,
        fargo_id: body.fargo_id,
        fargo_readable_id: body.fargo_readable_id,
        apa_member_id: body.apa_member_id,
      });
    }
    return glicko;
  }

  /**
   * Unified Player Card for console/coach.
   * `rackup_stats` mirrors ROC Glicko-2 (`users.rating` …). Fargo and RackUpRate
   * shadow are separate continua and never overwrite the ladder.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('me/player-card')
  async myPlayerCard(
    @Req() req: { user: { id: string } },
    @Query('refreshFargo') refreshFargo?: string,
  ) {
    return this.playerCards.getCardForUser(req.user.id, {
      refreshFargo: refreshFargo === '1' || refreshFargo === 'true',
    });
  }

  /** Profile picture — JSON data-URL, same pattern as halls/v2/photos/upload. */
  @UseGuards(AuthGuard('jwt'))
  @Post('me/avatar')
  async uploadAvatar(@Req() req: any, @Body() dto: UploadAvatarDto) {
    return this.usersService.uploadAvatar(req.user.id, dto);
  }

  /** P3 — set premium tier (ADMIN only via role check in service later; open for demo) */
  @UseGuards(AuthGuard('jwt'))
  @Post('me/premium')
  async setPremium(
    @Req() req: any,
    @Body() body: { tier?: 'free' | 'premium' | 'hall_pro'; days?: number },
  ) {
    return this.usersService.setPremiumTier(req.user.id, body.tier ?? 'premium', body.days ?? 30);
  }

  /**
   * Batch public profiles — `ids` comma-separated UUIDs (max 50).
   * Authenticated to limit scraping; response has no email/password.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('profiles')
  async profiles(@Query('ids') ids?: string) {
    const list = (ids ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    return this.usersService.findPublicByIds(list);
  }

  /**
   * Find a player by display name (contains) or exact email.
   * Authenticated; response has no email/password.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  search(
    @Query('q') q: string | undefined,
    @Req() req: { user: { id: string } },
  ) {
    return this.usersService.searchPublic(q ?? '', { excludeId: req.user.id, limit: 12 });
  }

  @Get(':id/stats')
  async stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.statsService.getPlayerStats(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/player-card')
  async playerCard(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('refreshFargo') refreshFargo?: string,
  ) {
    return this.playerCards.getCardForUser(id, {
      refreshFargo: refreshFargo === '1' || refreshFargo === 'true',
    });
  }

  /** Public profile for friends / looking-player hydration. */
  @Get(':id')
  async getPublic(@Param('id', ParseUUIDPipe) id: string) {
    const profile = await this.usersService.getPublicProfile(id);
    if (!profile) throw new NotFoundException('User not found');
    return profile;
  }
}
