import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { HallsV2Service } from './halls-v2.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CreateHallEventDto } from './dto/events/create-hall-event.dto';
import { UpdateHallEventDto } from './dto/events/update-hall-event.dto';
import { UploadHallPhotoDto } from './dto/photos/upload-hall-photo.dto';
import { CreateVegasSeedDto } from './dto/seed/create-vegas-seed.dto';
import { SeedResultDto } from './dto/seed/seed-result.dto';

@Controller('halls/v2')
export class HallsV2Controller {
  constructor(private readonly hallsV2: HallsV2Service) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('checkin')
  async checkin(@Req() req: any, @Body() dto: CheckInDto) {
    return this.hallsV2.checkIn(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('checkout')
  async checkout(@Req() req: any, @Body() dto: CheckOutDto) {
    return this.hallsV2.checkOut(req.user.id, dto);
  }

  @Get('feed/:hallId')
  async feed(@Param('hallId') hallId: string) {
    return this.hallsV2.feed(hallId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('events/create')
  async createEvent(@Req() req: any, @Body() dto: CreateHallEventDto) {
    return this.hallsV2.createEvent(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('events/update')
  async updateEvent(@Req() req: any, @Body() dto: UpdateHallEventDto) {
    return this.hallsV2.updateEvent(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('photos/upload')
  async uploadPhoto(@Req() req: any, @Body() dto: UploadHallPhotoDto) {
    return this.hallsV2.uploadPhoto(req.user.id, dto);
  }

  @Get('leaderboard/:hallId')
  async leaderboard(@Param('hallId') hallId: string) {
    return this.hallsV2.leaderboard(hallId);
  }

  // Idempotent seed endpoint for Vegas halls
  @Post('seed/vegas')
  async seedVegas(@Body() dto: CreateVegasSeedDto): Promise<SeedResultDto> {
    return this.hallsV2.seedVegas(dto);
  }
}

