import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MatchmakingV2Service } from './matchmaking-v2.service';

class SearchV2Body {
  // Reuse v1 semantics, but routed under v2
  lat!: number;
  lon!: number;
  radius!: number;
  game?: string;
  stakes?: string;
  min_rating?: number;
  max_rating?: number;
  raceTo?: number;
}

class CancelBody {
  sessionId!: string;
}

class ConfirmBody {
  sessionId!: string;
}

@Controller('matchmaking/v2')
export class MatchmakingV2Controller {

  constructor(private readonly matchmakingV2: MatchmakingV2Service) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('search')
  async search(@Req() req: any, @Body() body: SearchV2Body) {
    return this.matchmakingV2.searchAndEnqueue(req.user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('cancel')
  async cancel(@Req() req: any, @Body() body: CancelBody) {
    return this.matchmakingV2.cancel(req.user.id, body.sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('confirm')
  async confirm(@Req() req: any, @Body() body: ConfirmBody) {
    return this.matchmakingV2.confirm(req.user.id, body.sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('status/:sessionId')
  async status(@Req() req: any, @Param('sessionId') sessionId: string) {
    return this.matchmakingV2.status(req.user.id, sessionId);
  }
}

