import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { EmailVerificationToken } from '../entities/email-verification-token.entity';
import { UsersService } from '../../../users/users.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly tokens: Repository<EmailVerificationToken>,
    private readonly usersService: UsersService,
  ) {}

  async createTokenForUser(userId: string): Promise<{ token: string }> {
    const raw = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.tokens.update({ userId }, { usedAt: new Date() });
    // Mark all existing unused tokens for the user as used (simple single-token policy).

    const entity = this.tokens.create({
      userId,
      token: hashed,
      expiresAt,
      usedAt: null,
    });

    await this.tokens.save(entity);

    // In a real app we would email `raw`. For this task we return it.
    return { token: raw };
  }

  async verifyToken(token: string, userId: string): Promise<{ id: string } | null> {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const row = await this.tokens.findOne({ where: { token: hashed, userId } });
    if (!row) throw new UnauthorizedException('Invalid token');

    if (row.usedAt) throw new UnauthorizedException('Token already used');
    if (row.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Token expired');

    await this.tokens.update({ id: row.id }, { usedAt: new Date() });

    return { id: userId };
  }
}

