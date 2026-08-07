import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ChatService } from './chat.service';

class CreateDmDto {
  @IsUUID()
  friendId!: string;
}

class CreateGroupDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  memberIds!: string[];
}

class SendMessageDto {
  @IsOptional()
  @IsIn(['TEXT', 'MATCH_INVITE', 'CHECKIN_SHARE', 'MEETUP_ACTION', 'SYSTEM'])
  type?: 'TEXT' | 'MATCH_INVITE' | 'CHECKIN_SHARE' | 'MEETUP_ACTION' | 'SYSTEM';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

class AddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds!: string[];
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  listThreads(@Req() req: { user: { id: string } }) {
    return this.chat.listThreads(req.user.id);
  }

  @Post('threads/dm')
  createDm(@Req() req: { user: { id: string } }, @Body() dto: CreateDmDto) {
    return this.chat.getOrCreateDm(req.user.id, dto.friendId);
  }

  @Post('threads/group')
  createGroup(@Req() req: { user: { id: string } }, @Body() dto: CreateGroupDto) {
    return this.chat.createGroup(req.user.id, dto);
  }

  @Get('threads/:id/messages')
  messages(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.listMessages(req.user.id, id, limit ? Number(limit) : 50);
  }

  @Post('threads/:id/messages')
  send(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    const type = dto.type ?? 'TEXT';
    if (type === 'TEXT') {
      return this.chat.sendText(req.user.id, id, dto.body ?? '');
    }
    return this.chat.send(req.user.id, id, type, dto.body ?? null, dto.payload ?? null);
  }

  @Post('threads/:id/read')
  read(@Req() req: { user: { id: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.chat.markRead(req.user.id, id);
  }

  @Post('threads/:id/members')
  addMembers(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.chat.addMembers(req.user.id, id, dto.userIds);
  }
}
