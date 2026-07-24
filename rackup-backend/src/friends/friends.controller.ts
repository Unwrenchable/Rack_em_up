import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestFriendDto } from './dto/request-friend.dto';
import { FriendsService } from './friends.service';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.friendsService.listForUser(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('request')
  request(@Body() dto: RequestFriendDto, @Req() req: { user: { id: string } }) {
    return this.friendsService.request(req.user.id, dto.addresseeId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/accept')
  accept(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.friendsService.accept(id, req.user.id);
  }
}