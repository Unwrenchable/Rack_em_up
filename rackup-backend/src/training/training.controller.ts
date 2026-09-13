import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
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

  /** Multipart clip upload — returns a stored URL for /training/analyze. */
  @UseGuards(AuthGuard('jwt'))
  @Post('clips')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 80 * 1024 * 1024 },
    }),
  )
  async uploadClip(
    @UploadedFile() file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number },
    @Req() req: { user: { id: string } },
  ) {
    if (!file?.buffer) throw new BadRequestException('file field required');
    return this.trainingService.uploadClip(req.user.id, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('scouting')
  scouting(@Body() dto: ScoutingDto, @Req() req: { user: { id: string } }) {
    return this.trainingService.scoutOpponent(req.user.id, dto.opponentUserId);
  }
}
