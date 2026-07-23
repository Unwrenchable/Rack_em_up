import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRedisClient } from '../../config/redis.config';
import { MatchmakingRequestV2 } from './entities/matchmaking-request-v2.entity';
import { MatchmakingSessionV2 } from './entities/matchmaking-session-v2.entity';
import { MatchesService } from '../../matches/matches.service';
import { User } from '../../users/users.entity';



@Injectable()
export class MatchmakingV2Service {
  private readonly queueKey = 'mm:v2:queue';
  private readonly pendingKey = 'mm:v2:pending';
  private readonly activeKey = 'mm:v2:active';

  // NOTE: This is a non-breaking parallel upgrade. The matchmaking loop is implemented
  // conservatively (best-effort opportunistic pairing) to avoid breaking v1 flows.

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
    const radius = Number(body.radius);
    const game = body.game ?? '8-ball';
    const stakes = body.stakes ?? 'casual';
    const minRating = body.min_rating ?? 0;
    const maxRating = body.max_rating ?? 3000;

    // Radius is accepted for API compatibility, but current matching loop
    // uses candidate distance sorting rather than strict filtering.


    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radius)) {
      throw new BadRequestException('Invalid lat/lon/radius');
    }

    const now = Date.now();
    const expiresAt = new Date(now + 10 * 60 * 1000); // auto-expire stale requests

    // Snapshot ELO at request time. Using `users.rating` as ELO proxy.
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
      expiresAt,
      status: 'PENDING',
    });

    const saved = await this.requestsRepo.save(reqEntity);

    const redis = await getRedisClient();
    await redis.lPush(this.queueKey, JSON.stringify({ requestId: saved.id, userId }));

    // Best-effort opportunistic pairing right away (no worker thread).
    // A more robust setup could use BullMQ or a dedicated worker.
    await this.tryMatch(redis);

    return { sessionId: null, requestId: saved.id, status: 'ENQUEUED' };

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

    return { cancelled: true, sessionId };
  }

  async confirm(userId: string, sessionId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

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
      // Create actual match (PENDING) without touching existing v1 matchmaking.
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
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.requesterUserId !== userId && session.opponentUserId !== userId) {
      throw new BadRequestException('Not part of this session');
    }

    return session;
  }

  private async tryMatch(redis: any) {
    // Naive implementation: pop a candidate request, find another compatible request in DB.
    // This will be improved in follow-up by full Redis pop/push pairing.
    const raw = await redis.rPop(this.queueKey);
    if (!raw) return;

    const first = JSON.parse(raw);
    const firstReq = await this.requestsRepo.findOne({ where: { id: first.requestId } });
    if (!firstReq || firstReq.expiresAt.getTime() < Date.now()) return;

    const opponents = await this.requestsRepo.find({
      where: {
        status: 'PENDING',
      },
    });

    const now = Date.now();
    const best = opponents
      .filter((r) => r.id !== firstReq.id)
      .filter((r) => r.expiresAt.getTime() > now)
      .filter((r) => r.game === firstReq.game)
      .filter((r) => r.stakes === firstReq.stakes)
      .filter((r) => r.userId !== firstReq.userId)
      .map((r) => {
        // Simple ELO window constraint (skill-based)
        const elo = firstReq.eloAtRequest;
        const okSkill = r.eloAtRequest >= firstReq.minRating && r.eloAtRequest <= firstReq.maxRating;
        const dist = this.haversineMeters(firstReq.lat, firstReq.lon, r.lat, r.lon);
        return { r, okSkill, dist };
      })
      .filter((x) => x.okSkill)
      .sort((a, b) => a.dist - b.dist)[0]?.r;

    if (!best) {
      // Put back if no match found for now.
      await redis.lPush(this.queueKey, JSON.stringify(first));
      return;
    }

    // Create matchmaking session (pending confirmation)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
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
    (best as any).status = 'MATCHED';
    await this.requestsRepo.save([firstReq, best]);

    await redis.hSet(this.pendingKey, savedSession.id, JSON.stringify({ sessionId: savedSession.id, status: savedSession.status }));
    await redis.hSet(this.activeKey, savedSession.id, JSON.stringify({ sessionId: savedSession.id, status: savedSession.status }));
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

