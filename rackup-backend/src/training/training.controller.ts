import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyzeShotDto } from './dto/analyze-shot.dto';
import { ScoutingDto } from './dto/scouting.dto';
import { TrainingService } from './training.service';

@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  /** Public: RealAI provider health (does not expose secrets). */
  @Get('provider')
  provider() {
    return this.trainingService.providerStatus();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('drills/today')
  drills(@Req() req: { user: { id: string } }) {
    return this.trainingService.todayDrills(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('analyze')
  analyze(@Body() dto: AnalyzeShotDto, @Req() req: { user: { id: string } }) {
    return this.trainingService.analyzeShot(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('scouting')
  scouting(@Body() dto: ScoutingDto, @Req() req: { user: { id: string } }) {
    return this.trainingService.scoutOpponent(req.user.id, dto.opponentUserId);
  }
}