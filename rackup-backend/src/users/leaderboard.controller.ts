import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async leaderboard(
    @Query('limit') limit = 50,
    @Query('game') game?: string,
  ) {
    return this.usersService.getLeaderboard({
      limit: Number(limit),
      game,
    });
  }
}
