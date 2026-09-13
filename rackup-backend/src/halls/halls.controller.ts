import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../users/users.entity';
import { CheckInDto } from './dto/check-in.dto';
import { ClaimHallDto } from './dto/claim-hall.dto';
import { HallsService } from './halls.service';

@Controller('halls')
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Get()
  async list(@Query('verified') verified?: string) {
    const verifiedOnly = verified === '1' || verified === 'true';
    return this.hallsService.findAll(verifiedOnly ? { verifiedOnly: true } : undefined);
  }

  @Get('live')
  async live() {
    return this.hallsService.getLiveActivity();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.hallsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('check-in')
  async checkIn(@Body() dto: CheckInDto, @Req() req: { user: User }) {
    return this.hallsService.checkIn(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HALL_OWNER', 'ADMIN')
  @Post(':id/claim')
  async claim(
    @Param('id') id: string,
    @Body() dto: ClaimHallDto,
    @Req() req: { user: User },
  ) {
    return this.hallsService.claimHall(id, req.user.id, dto);
  }

  /** Owner or ADMIN / HALL_OWNER flips the verified pin used by Find / Halls maps. */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/verify')
  async verify(
    @Param('id') id: string,
    @Body() body: { verified?: boolean },
    @Req() req: { user: User },
  ) {
    return this.hallsService.setVerified(id, req.user, body?.verified !== false);
  }
}