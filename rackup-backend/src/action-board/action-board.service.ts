import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionPost } from './action-post.entity';
import { CreateActionPostDto } from './dto/create-action-post.dto';

@Injectable()
export class ActionBoardService {
  constructor(
    @InjectRepository(ActionPost)
    private readonly repo: Repository<ActionPost>,
  ) {}

  listOpen(): Promise<ActionPost[]> {
    return this.repo.find({
      where: { isOpen: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  create(authorId: string, dto: CreateActionPostDto): Promise<ActionPost> {
    return this.repo.save(
      this.repo.create({
        authorId,
        body: dto.body,
        game: dto.game,
        stakes: dto.stakes,
        lat: dto.lat ?? null,
        lon: dto.lon ?? null,
        isOpen: true,
      }),
    );
  }

  async close(id: string, authorId: string): Promise<ActionPost | null> {
    const post = await this.repo.findOne({ where: { id, authorId } });
    if (!post) return null;
    post.isOpen = false;
    return this.repo.save(post);
  }
}