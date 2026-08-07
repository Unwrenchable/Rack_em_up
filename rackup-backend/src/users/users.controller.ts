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

class SeedRatingDto {
  @IsString()
  from_system!: string;

  @IsNumber()
  from_value!: number;

  @IsOptional()
  @IsString()
  from_scale?: string;
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly statsService: StatsService,
    private readonly usersService: UsersService,
    private readonly ratingService: RatingService,
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
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('me/rating/seed')
  async seedRating(@Req() req: any, @Body() body: SeedRatingDto) {
    return this.ratingService.seedFromExternal(req.user.id, {
      from_system: body.from_system,
      from_value: body.from_value,
      from_scale: body.from_scale,
    });
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

  @Get(':id/stats')
  async stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.statsService.getPlayerStats(id);
  }

  /** Public profile for friends / looking-player hydration. */
  @Get(':id')
  async getPublic(@Param('id', ParseUUIDPipe) id: string) {
    const profile = await this.usersService.getPublicProfile(id);
    if (!profile) throw new NotFoundException('User not found');
    return profile;
  }
}
