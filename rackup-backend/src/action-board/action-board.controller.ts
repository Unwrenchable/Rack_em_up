import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateActionPostDto } from './dto/create-action-post.dto';
import { ActionBoardService } from './action-board.service';

@Controller('action-board')
export class ActionBoardController {
  constructor(private readonly actionBoardService: ActionBoardService) {}

  @Get()
  list() {
    return this.actionBoardService.listOpen();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateActionPostDto, @Req() req: { user: { id: string } }) {
    return this.actionBoardService.create(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/close')
  close(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.actionBoardService.close(id, req.user.id);
  }
}