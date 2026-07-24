import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShotsService } from './shots.service';

@Controller('shots')
export class ShotsController {
  constructor(private readonly shotsService: ShotsService) {}

  /** Shot of the Day — public, non-repeating within a full catalog cycle. */
  @Get('today')
  today() {
    return this.shotsService.getToday();
  }

  @Get('upcoming')
  upcoming(@Query('days') days?: string) {
    const n = Math.min(30, Math.max(1, parseInt(days ?? '7', 10) || 7));
    return this.shotsService.upcoming(n);
  }

  @Get('catalog')
  catalog(
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
  ) {
    return this.shotsService.getCatalog({ difficulty, category });
  }

  @Post('complete')
  @UseGuards(AuthGuard('jwt'))
  complete(@Req() req: any, @Query('shotId') shotId?: string) {
    return this.shotsService.completeToday(req.user.id, shotId);
  }

  @Get('streak')
  @UseGuards(AuthGuard('jwt'))
  streak(@Req() req: any) {
    return this.shotsService.getStreak(req.user.id);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.shotsService.getOne(id);
  }
}
