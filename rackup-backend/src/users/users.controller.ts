import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatsService } from './stats.service';

@Controller('users')
export class UsersController {
  constructor(private readonly statsService: StatsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: any) {
    return req.user;
  }

  @Get(':id/stats')
  async stats(@Param('id') id: string) {
    return this.statsService.getPlayerStats(id);
  }
}
