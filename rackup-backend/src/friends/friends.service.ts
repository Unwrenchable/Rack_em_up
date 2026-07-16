import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from './friendship.entity';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private readonly repo: Repository<Friendship>,
  ) {}

  async request(requesterId: string, addresseeId: string): Promise<Friendship> {
    if (requesterId === addresseeId) {
      throw new BadRequestException('Cannot friend yourself');
    }
    const existing = await this.repo.findOne({
      where: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    });
    if (existing) return existing;

    return this.repo.save(
      this.repo.create({
        requesterId,
        addresseeId,
        status: 'PENDING',
      }),
    );
  }

  async accept(id: string, userId: string): Promise<Friendship> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Friendship not found');
    if (row.addresseeId !== userId) {
      throw new BadRequestException('Only the addressee can accept');
    }
    row.status = 'ACCEPTED';
    return this.repo.save(row);
  }

  async listForUser(userId: string): Promise<Friendship[]> {
    return this.repo.find({
      where: [
        { requesterId: userId },
        { addresseeId: userId },
      ],
      order: { createdAt: 'DESC' },
    });
  }
}