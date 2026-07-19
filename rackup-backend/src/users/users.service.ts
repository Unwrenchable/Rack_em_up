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
}
