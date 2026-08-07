import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialRealtimeService } from '../websocket/social-realtime.service';
import { UserSocialSettings } from './user-social-settings.entity';
import { SocialSettingsService } from './social-settings.service';
import { SocialSettingsController } from './social-settings.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserSocialSettings])],
  controllers: [SocialSettingsController],
  providers: [SocialRealtimeService, SocialSettingsService],
  exports: [SocialRealtimeService, SocialSettingsService],
})
export class SocialModule {}
