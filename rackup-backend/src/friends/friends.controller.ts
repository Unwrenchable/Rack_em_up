import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BlockUserDto, RequestFriendDto } from './dto/request-friend.dto';
import { FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(AuthGuard('jwt'))
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /** Accepted friends with online + activity */
  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.friendsService.listFriends(req.user.id);
  }

  @Get('pending/incoming')
  pendingIn(@Req() req: { user: { id: string } }) {
    return this.friendsService.listPendingIncoming(req.user.id);
  }

  @Get('pending/outgoing')
  pendingOut(@Req() req: { user: { id: string } }) {
    return this.friendsService.listPendingOutgoing(req.user.id);
  }

  @Get('raw')
  listRaw(@Req() req: { user: { id: string } }) {
    return this.friendsService.listForUser(req.user.id);
  }

  @Get(':userId/mutual')
  async mutual(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: { user: { id: string } },
  ) {
    const ids = await this.friendsService.getMutualFriendIds(req.user.id, userId);
    return { userId, mutualFriendIds: ids, count: ids.length };
  }

  @Post('request')
  request(@Body() dto: RequestFriendDto, @Req() req: { user: { id: string } }) {
    return this.friendsService.request(req.user.id, dto.addresseeId);
  }

  @Post('block')
  block(@Body() dto: BlockUserDto, @Req() req: { user: { id: string } }) {
    return this.friendsService.block(req.user.id, dto.userId);
  }

  @Delete('block/:userId')
  unblock(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.friendsService.unblock(req.user.id, userId);
  }

  @Post(':id/accept')
  accept(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: { id: string } }) {
    return this.friendsService.accept(id, req.user.id);
  }

  @Post(':id/decline')
  decline(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: { id: string } }) {
    return this.friendsService.decline(id, req.user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: { id: string } }) {
    return this.friendsService.cancelRequest(id, req.user.id);
  }
}
