import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
  @Post(':id/read')
  readOne(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}