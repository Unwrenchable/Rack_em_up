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

  @Get('search')
  async search(@Query() query: SearchMatchmakingDto) {
    return this.matchmakingService.search(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('request')
  async createRequest(
    @Body() body: CreateMatchmakingRequestDto,
    @Req() req: any,
  ) {
    return this.matchmakingService.createRequest(body, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.matchmakingService.cancelRequest(id, req.user.id);
  }
}
