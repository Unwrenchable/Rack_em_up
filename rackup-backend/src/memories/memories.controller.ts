import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { MemoriesService } from './memories.service';
import { AppendHighlightDto } from './dto/append-highlight.dto';

@Controller('users/me/memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getMyMemories(@Req() req: Request & { user?: any }) {
    const userId = req.user?.id;
    return this.memoriesService.findMemoriesByParticipant(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/matches/:id/highlight')
  async appendHighlight(
    @Param('id', new ParseUUIDPipe()) matchId: string,
    @Body() dto: AppendHighlightDto,
    @Req() req: Request & { user?: any },
  ) {
    const participantUserId = req.user?.id;
    return this.memoriesService.appendHighlight({
      matchId,
      participantUserId,
      highlightVideoUrl: dto.highlightVideoUrl,
    });
  }
}
