import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Friendship, FriendshipStatus } from './friendship.entity';
import { User } from '../users/users.entity';
import { SocialRealtimeService } from '../websocket/social-realtime.service';

export type FriendListItemDto = {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  status: FriendshipStatus;
  direction?: 'incoming' | 'outgoing' | 'mutual';
  online: boolean;
  lastSeenAt: string | null;
  activity: {
    type: string;
    label?: string;
    hallId?: string;
    matchId?: string;
  } | null;
  mutualCount?: number;
};

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private readonly repo: Repository<Friendship>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly realtime: SocialRealtimeService,
  ) {}

  async request(requesterId: string, addresseeId: string): Promise<Friendship> {
    if (requesterId === addresseeId) {
      throw new BadRequestException('Cannot friend yourself');
    }
    if (await this.isBlocked(requesterId, addresseeId)) {
      throw new ForbiddenException('Cannot send friend request (blocked)');
    }

    const existing = await this.findPair(requesterId, addresseeId);
    if (existing) {
      if (existing.status === 'ACCEPTED') return existing;
      if (existing.status === 'PENDING') return existing;
      if (existing.status === 'BLOCKED') {
        throw new ForbiddenException('Cannot send friend request (blocked)');
      }
      // DECLINED / CANCELLED → allow re-request as new pending
      existing.requesterId = requesterId;
      existing.addresseeId = addresseeId;
      existing.status = 'PENDING';
      existing.blockedById = null;
      existing.respondedAt = null;
      const saved = await this.repo.save(existing);
      this.emitFriendEvent(addresseeId, 'friend:request', {
        friendship: saved,
        fromUserId: requesterId,
      });
      return saved;
    }

    const saved = await this.repo.save(
      this.repo.create({
        requesterId,
        addresseeId,
        status: 'PENDING',
        blockedById: null,
      }),
    );

    this.emitFriendEvent(addresseeId, 'friend:request', {
      friendship: saved,
      fromUserId: requesterId,
    });
    return saved;
  }

  async accept(id: string, userId: string): Promise<Friendship> {
    const row = await this.requireRow(id);
    if (row.addresseeId !== userId) {
      throw new BadRequestException('Only the addressee can accept');
    }
    if (row.status !== 'PENDING') {
      throw new BadRequestException(`Cannot accept status=${row.status}`);
    }
    row.status = 'ACCEPTED';
    row.respondedAt = new Date();
    const saved = await this.repo.save(row);
    this.emitFriendEvent(row.requesterId, 'friend:accepted', {
      friendship: saved,
      byUserId: userId,
    });
    this.emitFriendEvent(row.addresseeId, 'friend:accepted', {
      friendship: saved,
      byUserId: userId,
    });
    return saved;
  }

  async decline(id: string, userId: string): Promise<Friendship> {
    const row = await this.requireRow(id);
    if (row.addresseeId !== userId) {
      throw new BadRequestException('Only the addressee can decline');
    }
    if (row.status !== 'PENDING') {
      throw new BadRequestException(`Cannot decline status=${row.status}`);
    }
    row.status = 'DECLINED';
    row.respondedAt = new Date();
    const saved = await this.repo.save(row);
    this.emitFriendEvent(row.requesterId, 'friend:declined', {
      friendship: saved,
      byUserId: userId,
    });
    return saved;
  }

  async cancelRequest(id: string, userId: string): Promise<Friendship> {
    const row = await this.requireRow(id);
    if (row.requesterId !== userId) {
      throw new BadRequestException('Only the requester can cancel');
    }
    if (row.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel status=${row.status}`);
    }
    row.status = 'CANCELLED';
    row.respondedAt = new Date();
    const saved = await this.repo.save(row);
    this.emitFriendEvent(row.addresseeId, 'friend:cancelled', {
      friendship: saved,
      byUserId: userId,
    });
    return saved;
  }

  async block(blockerId: string, targetId: string): Promise<Friendship> {
    if (blockerId === targetId) {
      throw new BadRequestException('Cannot block yourself');
    }
    let row = await this.findPair(blockerId, targetId);
    if (!row) {
      row = this.repo.create({
        requesterId: blockerId,
        addresseeId: targetId,
        status: 'BLOCKED',
        blockedById: blockerId,
        respondedAt: new Date(),
      });
    } else {
      row.status = 'BLOCKED';
      row.blockedById = blockerId;
      row.respondedAt = new Date();
    }
    const saved = await this.repo.save(row);
    this.emitFriendEvent(targetId, 'friend:blocked', {
      byUserId: blockerId,
      friendshipId: saved.id,
    });
    return saved;
  }

  async unblock(blockerId: string, targetId: string): Promise<{ ok: true }> {
    const row = await this.findPair(blockerId, targetId);
    if (!row || row.status !== 'BLOCKED') {
      return { ok: true };
    }
    if (row.blockedById && row.blockedById !== blockerId) {
      throw new ForbiddenException('Only the blocker can unblock');
    }
    row.status = 'CANCELLED';
    row.blockedById = null;
    row.respondedAt = new Date();
    await this.repo.save(row);
    return { ok: true };
  }

  async listForUser(userId: string): Promise<Friendship[]> {
    return this.repo.find({
      where: [{ requesterId: userId }, { addresseeId: userId }],
      order: { createdAt: 'DESC' },
    });
  }

  async listFriends(userId: string): Promise<FriendListItemDto[]> {
    const rows = await this.repo.find({
      where: [
        { requesterId: userId, status: 'ACCEPTED' },
        { addresseeId: userId, status: 'ACCEPTED' },
      ],
      order: { createdAt: 'DESC' },
    });
    return this.hydrateFriendItems(userId, rows, 'mutual');
  }

  async listPendingIncoming(userId: string): Promise<FriendListItemDto[]> {
    const rows = await this.repo.find({
      where: { addresseeId: userId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
    return this.hydrateFriendItems(userId, rows, 'incoming');
  }

  async listPendingOutgoing(userId: string): Promise<FriendListItemDto[]> {
    const rows = await this.repo.find({
      where: { requesterId: userId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
    return this.hydrateFriendItems(userId, rows, 'outgoing');
  }

  async getMutualFriendIds(userId: string, otherUserId: string): Promise<string[]> {
    const [a, b] = await Promise.all([
      this.getAcceptedFriendIds(userId),
      this.getAcceptedFriendIds(otherUserId),
    ]);
    const setB = new Set(b);
    return a.filter((id) => setB.has(id));
  }

  async getMutualCount(userId: string, otherUserId: string): Promise<number> {
    return (await this.getMutualFriendIds(userId, otherUserId)).length;
  }

  async areFriends(a: string, b: string): Promise<boolean> {
    const row = await this.findPair(a, b);
    return !!row && row.status === 'ACCEPTED';
  }

  async isBlocked(a: string, b: string): Promise<boolean> {
    const row = await this.findPair(a, b);
    return !!row && row.status === 'BLOCKED';
  }

  async assertNotBlocked(a: string, b: string): Promise<void> {
    if (await this.isBlocked(a, b)) {
      throw new ForbiddenException('Users are blocked');
    }
  }

  async getAcceptedFriendIds(userId: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: [
        { requesterId: userId, status: 'ACCEPTED' },
        { addresseeId: userId, status: 'ACCEPTED' },
      ],
    });
    return rows.map((r) =>
      r.requesterId === userId ? r.addresseeId : r.requesterId,
    );
  }

  private async hydrateFriendItems(
    viewerId: string,
    rows: Friendship[],
    direction: FriendListItemDto['direction'],
  ): Promise<FriendListItemDto[]> {
    const otherIds = rows.map((r) =>
      r.requesterId === viewerId ? r.addresseeId : r.requesterId,
    );
    if (!otherIds.length) return [];

    const users = await this.usersRepo.find({ where: { id: In(otherIds) } });
    const byId = new Map(users.map((u) => [u.id, u]));

    const out: FriendListItemDto[] = [];
    for (const row of rows) {
      const otherId =
        row.requesterId === viewerId ? row.addresseeId : row.requesterId;
      const u = byId.get(otherId);
      if (!u) continue;
      const [online, activity, lastSeenAt] = await Promise.all([
        this.realtime.isOnline(otherId),
        this.realtime.getActivity(otherId),
        this.realtime.getLastSeen(otherId),
      ]);
      let mutualCount: number | undefined;
      if (direction === 'mutual' || row.status === 'ACCEPTED') {
        mutualCount = await this.getMutualCount(viewerId, otherId);
      }
      out.push({
        friendshipId: row.id,
        userId: otherId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        rating: u.rating ?? 500,
        status: row.status,
        direction,
        online,
        lastSeenAt,
        activity: activity
          ? {
              type: activity.type,
              label: activity.label,
              hallId: activity.hallId,
              matchId: activity.matchId,
            }
          : null,
        mutualCount,
      });
    }
    // Online friends first
    out.sort((a, b) => Number(b.online) - Number(a.online));
    return out;
  }

  private async findPair(a: string, b: string): Promise<Friendship | null> {
    return this.repo.findOne({
      where: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    });
  }

  private async requireRow(id: string): Promise<Friendship> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Friendship not found');
    return row;
  }

  private emitFriendEvent(userId: string, event: string, payload: unknown): void {
    this.realtime.emitToUser(userId, event, payload);
  }
}
