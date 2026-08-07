import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppNotification } from './notification.entity';
import { PushDevice } from './push-device.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppNotification, PushDevice])],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
