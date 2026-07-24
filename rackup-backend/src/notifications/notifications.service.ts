import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppNotification, NotificationKind } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(AppNotification)
    private readonly repo: Repository<AppNotification>,
  ) {}

  listForUser(userId: string): Promise<AppNotification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async create(input: {
    userId: string;
    title: string;
    body: string;
    kind?: NotificationKind;
  }): Promise<AppNotification> {
    return this.repo.save(
      this.repo.create({
        userId: input.userId,
        title: input.title,
        body: input.body,
        kind: input.kind ?? 'system',
        isRead: false,
      }),
    );
  }

  async markRead(id: string, userId: string): Promise<AppNotification> {
    const row = await this.repo.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Notification not found');
    row.isRead = true;
    return this.repo.save(row);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.repo.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }
}