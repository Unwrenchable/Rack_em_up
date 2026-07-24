import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatsService } from './stats.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly statsService: StatsService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: any) {
    const u = req.user;
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      reputation: u.reputation,
      rating: u.rating,
    };
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
