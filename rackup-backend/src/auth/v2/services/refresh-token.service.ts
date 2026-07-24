import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { RefreshToken } from '../entities/refresh-token.entity';
import { DeviceSessionsService } from './device-sessions.service';
import { User } from '../../../users/users.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly deviceSessionsService: DeviceSessionsService,
  ) {}

  async hashToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async findActiveByHashedToken(hashedToken: string): Promise<RefreshToken | null> {
    return this.refreshTokens.findOne({ where: { hashedToken } });
  }

  async revokeById(id: string): Promise<void> {
    await this.refreshTokens.update({ id }, { revoked: true });
  }

  async issueNewRefreshTokenRaw(user: User, deviceSessionId: string): Promise<{ refreshToken: string }> {
    const raw = crypto.randomBytes(64).toString('hex');
    const hashed = await this.hashToken(raw);

    const expiresDays = 7;
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    const entity = this.refreshTokens.create({
      userId: user.id,
      deviceSessionId,
      hashedToken: hashed,
      revoked: false,
      expiresAt,
    });

    await this.refreshTokens.save(entity);
    return { refreshToken: raw };
  }

  async consumeRotation(params: {
    hashedToken: string;
    expectedDeviceSessionId?: string;
  }): Promise<RefreshToken> {
    const rt = await this.findActiveByHashedToken(params.hashedToken);
    if (!rt) throw new UnauthorizedException('Invalid refresh token');
    if (rt.revoked) throw new UnauthorizedException('Refresh token revoked');
    if (rt.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Refresh token expired');

    if (params.expectedDeviceSessionId && rt.deviceSessionId !== params.expectedDeviceSessionId) {
      throw new UnauthorizedException('Refresh token device mismatch');
    }

    return rt;
  }
}

