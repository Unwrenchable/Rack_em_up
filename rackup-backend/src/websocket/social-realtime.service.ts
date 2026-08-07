import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { getRedisClient } from '../config/redis.config';

export type UserActivity = {
  type: 'idle' | 'hall_checkin' | 'in_match' | 'in_chat';
  label?: string;
  hallId?: string;
  matchId?: string;
  updatedAt?: string;
};

/**
 * Shared realtime bus for friends / chat / check-ins.
 * ChatGateway registers the Socket.IO server on init.
 */
@Injectable()
export class SocialRealtimeService {
  private readonly logger = new Logger(SocialRealtimeService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.debug(`drop ${event} — no server yet`);
      return;
    }
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToThread(threadId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(`thread:${threadId}`).emit(event, payload);
  }

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.sAdd(`presence:user:${userId}`, socketId);
      await redis.set(
        `presence:user:${userId}:meta`,
        JSON.stringify({
          online: true,
          lastSeen: new Date().toISOString(),
        }),
        { EX: 60 * 60 * 24 },
      );
    } catch (e) {
      this.logger.warn(`setUserOnline: ${e instanceof Error ? e.message : e}`);
    }
  }

  async setUserOffline(userId: string, socketId: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.sRem(`presence:user:${userId}`, socketId);
      const left = await redis.sCard(`presence:user:${userId}`);
      if (left === 0) {
        await redis.set(
          `presence:user:${userId}:meta`,
          JSON.stringify({
            online: false,
            lastSeen: new Date().toISOString(),
          }),
          { EX: 60 * 60 * 24 * 7 },
        );
      }
    } catch {
      /* ignore */
    }
  }

  async isOnline(userId: string): Promise<boolean> {
    try {
      const redis = await getRedisClient();
      return (await redis.sCard(`presence:user:${userId}`)) > 0;
    } catch {
      return false;
    }
  }

  async getActivity(userId: string): Promise<UserActivity | null> {
    try {
      const redis = await getRedisClient();
      const raw = await redis.get(`presence:user:${userId}:activity`);
      if (!raw) return null;
      return JSON.parse(raw) as UserActivity;
    } catch {
      return null;
    }
  }

  async setActivity(userId: string, activity: UserActivity | null): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `presence:user:${userId}:activity`;
      if (!activity) {
        await redis.del(key);
        return;
      }
      await redis.set(
        key,
        JSON.stringify({ ...activity, updatedAt: new Date().toISOString() }),
        { EX: 60 * 60 * 6 },
      );
    } catch {
      /* ignore */
    }
  }

  async getLastSeen(userId: string): Promise<string | null> {
    try {
      const redis = await getRedisClient();
      const raw = await redis.get(`presence:user:${userId}:meta`);
      if (!raw) return null;
      const meta = JSON.parse(raw) as { lastSeen?: string };
      return meta.lastSeen ?? null;
    } catch {
      return null;
    }
  }
}
