import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReportDto } from './dto/create-report.dto';
import { PlayerReport } from './report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(PlayerReport)
    private readonly repo: Repository<PlayerReport>,
  ) {}

  create(reporterId: string, dto: CreateReportDto): Promise<PlayerReport> {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException('Cannot report yourself');
    }
    return this.repo.save(
      this.repo.create({
        reporterId,
        reportedUserId: dto.reportedUserId,
        reason: dto.reason,
        details: dto.details ?? null,
        status: 'OPEN',
      }),
    );
  }

  listMine(reporterId: string): Promise<PlayerReport[]> {
    return this.repo.find({
      where: { reporterId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
  }
}