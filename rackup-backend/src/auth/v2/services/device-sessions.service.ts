import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { DeviceSession } from '../entities/device-session.entity';

@Injectable()
export class DeviceSessionsService {
  constructor(
    @InjectRepository(DeviceSession)
    private readonly deviceSessions: Repository<DeviceSession>,
  ) {}

  async createSession(userId: string, input: { userAgent: string | null; ip: string | null }): Promise<DeviceSession> {
    const session = this.deviceSessions.create({
      userId,
      userAgent: input.userAgent,
      ip: input.ip,
      lastSeen: new Date(),
      revoked: false,
    });
    return this.deviceSessions.save(session);
  }

  async listForUser(userId: string): Promise<DeviceSession[]> {
    return this.deviceSessions.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async revokeSessionForUser(userId: string, deviceSessionId: string): Promise<void> {
    await this.deviceSessions.update({ userId, id: deviceSessionId }, { revoked: true });
    // refresh token rows revoked are handled by refresh-token service through rotation;
    // logout endpoints revoke device sessions; refresh-token validation should also check
    // device session revoked (done in refresh-token service by joining in future).
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.deviceSessions.update({ userId }, { revoked: true });
  }
}

