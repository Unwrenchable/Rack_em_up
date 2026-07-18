import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateMatchmakingRequestDto } from './dto/create-matchmaking-request.dto';
import { SearchMatchmakingDto } from './dto/search-matchmaking.dto';
import { MatchmakingService } from './matchmaking.service';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  // Full search list
  @Get('search')
  async search(@Query() query: SearchMatchmakingDto) {
    return this.matchmakingService.search(query);
  }

  // Best match candidate
  @Get('best')
  async best(@Query() query: SearchMatchmakingDto) {
    return this.matchmakingService.findBestMatch(query);
  }

  // Create matchmaking request
  @UseGuards(AuthGuard('jwt'))
  @Post('request')
  async createRequest(
    @Body() body: CreateMatchmakingRequestDto,
    @Req() req: any,
  ) {
    return this.matchmakingService.createRequest(body, req.user.id);
  }

  // Cancel matchmaking request
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.matchmakingService.cancelRequest(id, req.user.id);
  }

  // Cleanup expired requests (admin or cron trigger)
  @Delete('expired/all')
  async cleanupExpired() {
    const removed = await this.matchmakingService.cleanupExpired();
    return { removed };
  }

  // 🔥 Auto-match: find best opponent and create a PoolMatch
  @UseGuards(AuthGuard('jwt'))
  @Post('auto-match')
  async autoMatch(
    @Req() req: any,
    @Body()
    body: {
      search: SearchMatchmakingDto;
      raceTo: number;
      hallId?: string;
    },
  ) {
    return this.matchmakingService.autoCreateMatch(
      req.user.id,
      body.search,
      body.raceTo,
      body.hallId,
    );
  }
}
