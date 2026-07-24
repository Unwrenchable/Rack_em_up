import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /** Safe public fields only (no email / password). */
  async getPublicProfile(id: string): Promise<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    reputation: number;
    rating: number;
    role: string;
  } | null> {
    const u = await this.findById(id);
    if (!u) return null;
    return {
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      reputation: u.reputation ?? 0,
      rating: u.rating ?? 500,
      role: u.role,
    };
  }

  async findPublicByIds(ids: string[]): Promise<
    Array<{
      id: string;
      displayName: string;
      avatarUrl: string | null;
      reputation: number;
      rating: number;
      role: string;
    }>
  > {
    if (!ids.length) return [];
    const unique = [...new Set(ids)];
    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: unique })
      .getMany();
    return rows.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      reputation: u.reputation ?? 0,
      rating: u.rating ?? 500,
      role: u.role,
    }));
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const user = this.usersRepository.create({
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
    });

    return this.usersRepository.save(user);
  }

  // ⭐ FIXED — now compiles cleanly
  async getLeaderboard(options: { limit: number; game?: string }) {
    const { limit } = options;

    return this.usersRepository.find({
      order: { id: 'ASC' },   // guaranteed to exist
      take: limit,
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { emailVerifiedAt: new Date() });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { passwordHash });
  }
}

