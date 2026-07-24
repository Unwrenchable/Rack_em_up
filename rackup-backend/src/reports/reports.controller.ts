import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.reportsService.listMine(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateReportDto, @Req() req: { user: { id: string } }) {
    return this.reportsService.create(req.user.id, dto);
  }
}