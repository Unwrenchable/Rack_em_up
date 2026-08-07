import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRedisClient } from '../config/redis.config';
import { PushDevice, PushPlatform } from './push-device.entity';
import { NotificationsService } from './notifications.service';
import { NotificationKind } from './notification.entity';

export type PushPayload = {
  userId: string;
  title: string;
  body: string;
  kind?: NotificationKind;
  data?: Record<string, string>;
};

/**
 * Push notifications (FCM HTTP v1 stub + always in-app).
 *
 * Env:
 *   FCM_SERVER_KEY=   legacy server key (optional)
 *   PUSH_ENABLED=true|false  (default true for queue; delivery needs key)
 *
 * Without FCM key: enqueues to Redis and creates in-app notification only.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushDevice)
    private readonly devicesRepo: Repository<PushDevice>,
    private readonly notifications: NotificationsService,
  ) {}

  async registerDevice(input: {
    userId: string;
    token: string;
    platform?: PushPlatform;
    prefs?: Record<string, boolean>;
  }): Promise<PushDevice> {
    let row = await this.devicesRepo.findOne({ where: { token: input.token } });
    if (row) {
      row.userId = input.userId;
      row.platform = input.platform ?? row.platform;
      row.enabled = true;
      if (input.prefs) row.prefsJson = { ...row.prefsJson, ...input.prefs };
    } else {
      row = this.devicesRepo.create({
        userId: input.userId,
        token: input.token,
        platform: input.platform ?? 'unknown',
        enabled: true,
        prefsJson: input.prefs ?? { money: true, match: true, social: true, system: true },
      });
    }
    return this.devicesRepo.save(row);
  }

  async unregisterDevice(userId: string, token: string): Promise<{ ok: true }> {
    await this.devicesRepo.update({ userId, token }, { enabled: false });
    return { ok: true };
  }

  async listDevices(userId: string): Promise<PushDevice[]> {
    return this.devicesRepo.find({ where: { userId, enabled: true } });
  }

  /**
   * Create in-app notification + best-effort push to registered devices.
   */
  async notify(payload: PushPayload) {
    const inApp = await this.notifications.create({
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      kind: payload.kind ?? 'system',
    });

    const devices = await this.devicesRepo.find({
      where: { userId: payload.userId, enabled: true },
    });

    const kindKey = payload.kind ?? 'system';
    const targets = devices.filter((d) => d.prefsJson?.[kindKey] !== false);

    let pushed = 0;
    let queued = 0;
    for (const d of targets) {
      const ok = await this.deliver(d.token, payload);
      if (ok === 'sent') pushed += 1;
      else if (ok === 'queued') queued += 1;
    }

    return { inApp, devices: targets.length, pushed, queued };
  }

  private async deliver(
    token: string,
    payload: PushPayload,
  ): Promise<'sent' | 'queued' | 'skipped'> {
    const key = process.env.FCM_SERVER_KEY;
    if (!key || process.env.PUSH_ENABLED === 'false') {
      await this.enqueue(token, payload);
      return 'queued';
    }

    try {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data ?? {},
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        this.logger.warn(`FCM ${res.status}`);
        await this.enqueue(token, payload);
        return 'queued';
      }
      return 'sent';
    } catch (e) {
      this.logger.warn(`FCM error: ${e instanceof Error ? e.message : e}`);
      await this.enqueue(token, payload);
      return 'queued';
    }
  }

  private async enqueue(token: string, payload: PushPayload): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.lPush(
        'push:v1:queue',
        JSON.stringify({
          token,
          ...payload,
          at: new Date().toISOString(),
        }),
      );
      await redis.lTrim('push:v1:queue', 0, 999);
    } catch {
      /* ignore */
    }
  }
}
