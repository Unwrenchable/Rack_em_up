import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { SocialSettingsService } from './social-settings.service';
import type { CheckInVisibility } from './user-social-settings.entity';

class UpdateSocialSettingsDto {
  @IsOptional()
  @IsIn(['FRIENDS', 'SELECTED_FRIENDS', 'NOBODY'])
  checkInVisibility?: CheckInVisibility;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  checkInVisibleToUserIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(1440)
  checkInDefaultTtlMinutes?: number;

  @IsOptional()
  @IsBoolean()
  showOnlineToFriends?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDmFromNonFriends?: boolean;
}

@Controller('social/settings')
@UseGuards(AuthGuard('jwt'))
export class SocialSettingsController {
  constructor(private readonly settings: SocialSettingsService) {}

  @Get()
  get(@Req() req: { user: { id: string } }) {
    return this.settings.getOrCreate(req.user.id);
  }

  @Patch()
  patch(@Req() req: { user: { id: string } }, @Body() dto: UpdateSocialSettingsDto) {
    return this.settings.update(req.user.id, dto);
  }
}
