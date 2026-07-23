import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokens: Repository<PasswordResetToken>,
  ) {}

  async createTokenForUser(userId: string): Promise<{ token: string }> {
    const raw = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.tokens.update({ userId }, { usedAt: new Date() });
    // Mark all existing unused tokens for the user as used (simple single-token policy).

    const entity = this.tokens.create({
      userId,
      token: hashed,
      expiresAt,
      usedAt: null,
    });

    await this.tokens.save(entity);
    return { token: raw };
  }

  async consumeToken(token: string, userId: string): Promise<string | null> {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const row = await this.tokens.findOne({ where: { token: hashed, userId } });
    if (!row) return null;

    if (row.usedAt) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;

    await this.tokens.update({ id: row.id }, { usedAt: new Date() });
    return userId;
  }
}

