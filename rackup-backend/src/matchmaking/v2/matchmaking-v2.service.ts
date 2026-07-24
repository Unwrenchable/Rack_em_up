import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { getRedisClient } from '../../config/redis.config';
import { keyForMatchmakingV2 } from '../../common/redis-keys';
import { MatchmakingRequestV2 } from './entities/matchmaking-request-v2.entity';
import { MatchmakingSessionV2 } from './entities/matchmaking-session-v2.entity';
import { MatchesService } from '../../matches/matches.service';
import { User } from '../../users/users.entity';

const DEFAULT_QUEUE_TTL_MS = Number(process.env.MM_V2_QUEUE_TTL_MS ?? 10 * 60 * 1000);
const DEFAULT_CONFIRM_TTL_MS = Number(process.env.MM_V2_CONFIRM_TTL_MS ?? 2 * 60 * 1000);
const DEFAULT_RADIUS_M = Number(process.env.MM_V2_DEFAULT_RADIUS_M ?? 20_000);
const MAX_RADIUS_M = Number(process.env.MM_V2_MAX_RADIUS_M ?? 100_000);

@Injectable()
export class MatchmakingV2Service {
  private readonly queueKey = keyForMatchmakingV2('queue');
  private readonly pendingKey = keyForMatchmakingV2('pending');
  private readonly activeKey = keyForMatchmakingV2('active');
  private readonly logger = new Logger(MatchmakingV2Service.name);

  constructor(
    @InjectRepository(MatchmakingRequestV2)
    private readonly requestsRepo: Repository<MatchmakingRequestV2>,

    @InjectRepository(MatchmakingSessionV2)
    private readonly sessionsRepo: Repository<MatchmakingSessionV2>,

    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    private readonly matchesService: MatchesService,
  ) {}

  async searchAndEnqueue(userId: string, body: any) {
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    let radius = Number(body.radius ?? body.radius_m ?? DEFAULT_RADIUS_M);
    const game = body.game ?? '8-ball';
    const stakes = body.stakes ?? 'casual';
    const minRating = body.min_rating ?? 0;
    const maxRating = body.max_rating ?? 3000;
    const ttlMs = Number(body.ttl_ms ?? DEFAULT_QUEUE_TTL_MS);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radius)) {
      throw new BadRequestException('Invalid lat/lon/radius');
    }
    if (radius <= 0) radius = DEFAULT_RADIUS_M;
    radius = Math.min(radius, MAX_RADIUS_M);

    await this.expireStaleRequests();

    const now = Date.now();
    const expiresAt = new Date(now + Math.max(30_000, ttlMs));

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    const rating = user?.rating ?? 1500;

    const reqEntity = this.requestsRepo.create({
      userId,
      lat,
      lon,
      game,
      stakes,
      minRating,
      maxRating,
      eloAtRequest: Math.round(rating),
      radiusMeters: Math.round(radius),
      expiresAt,
      status: 'PENDING',
    });

    const saved = await this.requestsRepo.save(reqEntity);

    const redis = await getRedisClient();
    await redis.lPush(
      this.queueKey,
      JSON.stringify({ requestId: saved.id, userId, radiusMeters: saved.radiusMeters }),
    );

    await this.tryMatch(redis);

    return {
      sessionId: null,
      requestId: saved.id,
      status: 'ENQUEUED',
      expiresAt: saved.expiresAt,
      radiusMeters: saved.radiusMeters,
    };
  }

  async cancel(userId: string, sessionId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.requesterUserId !== userId && session.opponentUserId !== userId) {
      throw new BadRequestException('Not part of this session');
    }

    session.status = 'CANCELLED';
    await this.sessionsRepo.save(session);

    const redis = await getRedisClient();
    await redis.hSet(this.activeKey, sessionId, JSON.stringify({ status: 'CANCELLED' }));
    await redis.hDel(this.pendingKey, sessionId);

    return { cancelled: true, sessionId };
  }

  async confirm(userId: string, sessionId: string) {
    await this.expireStaleSessions();

    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      session.status = 'EXPIRED' as any;
      await this.sessionsRepo.save(session);
      throw new BadRequestException('Session expired');
    }

    if (session.status !== 'PENDING_CONFIRMATION') {
      return { sessionId, status: session.status };
    }

    if (session.requesterUserId === userId) {
      session.confirmedByRequester = true;
    } else if (session.opponentUserId === userId) {
      session.confirmedByOpponent = true;
    } else {
      throw new BadRequestException('Not part of this session');
    }

    if (session.confirmedByRequester && session.confirmedByOpponent) {
      const match = await this.matchesService.create({
        playerAId: session.requesterUserId,
        playerBId: session.opponentUserId,
        hallId: session.hallId ?? null,
        game: session.game,
        raceTo: 3,
      } as any);

      session.matchId = match.id;
      session.status = 'CONFIRMED';
    }

    await this.sessionsRepo.save(session);
    return { sessionId: session.id, status: session.status, matchId: session.matchId };
  }

  async status(userId: string, sessionId: string) {
    await this.expireStaleSessions();
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.requesterUserId !== userId && session.opponentUserId !== userId) {
      throw new BadRequestException('Not part of this session');
    }

    return session;
  }

  /** Mark expired queue requests and prune Redis queue entries. */
  async expireStaleRequests(): Promise<number> {
    const now = new Date();
    const result = await this.requestsRepo.update(
      { status: 'PENDING', expiresAt: LessThan(now) },
      { status: 'EXPIRED' },
    );
    return result.affected ?? 0;
  }

  async expireStaleSessions(): Promise<number> {
    const now = new Date();
    const stale = await this.sessionsRepo.find({
      where: { status: 'PENDING_CONFIRMATION' },
    });
    let n = 0;
    for (const s of stale) {
      if (s.expiresAt && s.expiresAt.getTime() < now.getTime()) {
        s.status = 'EXPIRED' as any;
        await this.sessionsRepo.save(s);
        n += 1;
        try {
          const redis = await getRedisClient();
          await redis.hDel(this.pendingKey, s.id);
          await redis.hSet(this.activeKey, s.id, JSON.stringify({ status: 'EXPIRED' }));
        } catch {
          /* ignore */
        }
      }
    }
    return n;
  }

  private async tryMatch(redis: any) {
    await this.expireStaleRequests();
    await this.expireStaleSessions();

    // Drain up to N queue entries looking for a valid pair
    for (let attempt = 0; attempt < 20; attempt++) {
      const raw = await redis.rPop(this.queueKey);
      if (!raw) return;

      const first = JSON.parse(raw);
      const firstReq = await this.requestsRepo.findOne({ where: { id: first.requestId } });
      if (!firstReq || firstReq.status !== 'PENDING' || firstReq.expiresAt.getTime() < Date.now()) {
        if (firstReq && firstReq.status === 'PENDING' && firstReq.expiresAt.getTime() < Date.now()) {
          firstReq.status = 'EXPIRED';
          await this.requestsRepo.save(firstReq);
        }
        continue;
      }

      const radiusA = firstReq.radiusMeters ?? DEFAULT_RADIUS_M;

      const opponents = await this.requestsRepo.find({ where: { status: 'PENDING' } });
      const now = Date.now();

      const best = opponents
        .filter((r) => r.id !== firstReq.id)
        .filter((r) => r.expiresAt.getTime() > now)
        .filter((r) => r.game === firstReq.game)
        .filter((r) => r.stakes === firstReq.stakes)
        .filter((r) => r.userId !== firstReq.userId)
        .map((r) => {
          const okSkill =
            r.eloAtRequest >= firstReq.minRating &&
            r.eloAtRequest <= firstReq.maxRating &&
            firstReq.eloAtRequest >= r.minRating &&
            firstReq.eloAtRequest <= r.maxRating;
          const dist = this.haversineMeters(firstReq.lat, firstReq.lon, r.lat, r.lon);
          const radiusB = r.radiusMeters ?? DEFAULT_RADIUS_M;
          const maxDist = Math.min(radiusA, radiusB);
          const okRadius = dist <= maxDist;
          return { r, okSkill, okRadius, dist, maxDist };
        })
        .filter((x) => x.okSkill && x.okRadius)
        .sort((a, b) => a.dist - b.dist)[0]?.r;

      if (!best) {
        // Put back; no partner within radius yet
        await redis.lPush(this.queueKey, JSON.stringify(first));
        return;
      }

      // Remove best from redis queue if present (best-effort scan)
      await this.removeRequestFromQueue(redis, best.id);

      const expiresAt = new Date(Date.now() + DEFAULT_CONFIRM_TTL_MS);
      const session = this.sessionsRepo.create({
        requesterUserId: firstReq.userId,
        opponentUserId: best.userId,
        requestId: firstReq.id,
        game: firstReq.game,
        stakes: firstReq.stakes,
        hallId: null,
        expiresAt,
        status: 'PENDING_CONFIRMATION',
      });
      const savedSession = await this.sessionsRepo.save(session);

      firstReq.status = 'MATCHED';
      best.status = 'MATCHED';
      await this.requestsRepo.save([firstReq, best]);

      await redis.hSet(
        this.pendingKey,
        savedSession.id,
        JSON.stringify({ sessionId: savedSession.id, status: savedSession.status, expiresAt }),
      );
      await redis.hSet(
        this.activeKey,
        savedSession.id,
        JSON.stringify({ sessionId: savedSession.id, status: savedSession.status }),
      );

      this.logger.log(
        `matched ${firstReq.userId} ↔ ${best.userId} within ${radiusA}m (session ${savedSession.id})`,
      );
      return;
    }
  }

  private async removeRequestFromQueue(redis: any, requestId: string) {
    const len = await redis.lLen(this.queueKey);
    for (let i = 0; i < Math.min(len, 100); i++) {
      const raw = await redis.rPop(this.queueKey);
      if (!raw) break;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.requestId === requestId) continue;
        await redis.lPush(this.queueKey, raw);
      } catch {
        /* drop bad */
      }
    }
  }

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
