import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import {
  RegisterPushDeviceDto,
  TestPushDto,
  UnregisterPushDeviceDto,
} from './dto/push-device.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly push: PushService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.notificationsService.listForUser(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('read-all')
  readAll(@Req() req: { user: { id: string } }) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('push/register')
  registerPush(
    @Req() req: { user: { id: string } },
    @Body() dto: RegisterPushDeviceDto,
  ) {
    return this.push.registerDevice({
      userId: req.user.id,
      token: dto.token,
      platform: dto.platform,
      prefs: dto.prefs,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('push/unregister')
  unregisterPush(
    @Req() req: { user: { id: string } },
    @Body() dto: UnregisterPushDeviceDto,
  ) {
    return this.push.unregisterDevice(req.user.id, dto.token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('push/devices')
  listDevices(@Req() req: { user: { id: string } }) {
    return this.push.listDevices(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('push/test')
  testPush(@Req() req: { user: { id: string } }, @Body() dto: TestPushDto) {
    return this.push.notify({
      userId: req.user.id,
      title: dto.title ?? 'RackUp test',
      body: dto.body ?? 'Push pipeline OK (in-app + queue/FCM).',
      kind: 'system',
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/read')
  readOne(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}
