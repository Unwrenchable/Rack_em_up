import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ChatThread } from './entities/chat-thread.entity';
import { ChatThreadMember } from './entities/chat-thread-member.entity';
import { ChatMessage, ChatMessageType } from './entities/chat-message.entity';
import { FriendsService } from '../friends/friends.service';
import { SocialRealtimeService } from '../websocket/social-realtime.service';
import { SocialSettingsService } from '../social/social-settings.service';
import { sanitizeChatText } from '../websocket/chat-sanitize';
import { User } from '../users/users.entity';
import { realaiModerate } from '../ai/realai-coach.client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatThread)
    private readonly threads: Repository<ChatThread>,
    @InjectRepository(ChatThreadMember)
    private readonly members: Repository<ChatThreadMember>,
    @InjectRepository(ChatMessage)
    private readonly messages: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly friends: FriendsService,
    private readonly settings: SocialSettingsService,
    private readonly realtime: SocialRealtimeService,
  ) {}

  private dmKey(a: string, b: string): string {
    return [a, b].sort().join(':');
  }

  async getOrCreateDm(userId: string, friendId: string): Promise<ChatThread> {
    if (userId === friendId) {
      throw new BadRequestException('Cannot DM yourself');
    }
    await this.friends.assertNotBlocked(userId, friendId);

    const areFriends = await this.friends.areFriends(userId, friendId);
    if (!areFriends) {
      const pref = await this.settings.getOrCreate(friendId);
      if (!pref.allowDmFromNonFriends) {
        throw new ForbiddenException('DMs require friendship');
      }
    }

    const key = this.dmKey(userId, friendId);
    let thread = await this.threads.findOne({ where: { kind: 'DM', dmKey: key } });
    if (thread) return thread;

    thread = await this.threads.save(
      this.threads.create({
        kind: 'DM',
        title: null,
        createdById: userId,
        dmKey: key,
        lastMessageAt: null,
        lastMessagePreview: null,
      }),
    );

    await this.members.save([
      this.members.create({
        threadId: thread.id,
        userId,
        role: 'MEMBER',
        leftAt: null,
      }),
      this.members.create({
        threadId: thread.id,
        userId: friendId,
        role: 'MEMBER',
        leftAt: null,
      }),
    ]);

    return thread;
  }

  async createGroup(
    ownerId: string,
    input: { title: string; memberIds: string[] },
  ): Promise<ChatThread> {
    const title = (input.title ?? '').trim().slice(0, 120);
    if (!title) throw new BadRequestException('Group title required');

    const memberIds = [...new Set([ownerId, ...(input.memberIds ?? [])])];
    for (const mid of memberIds) {
      if (mid === ownerId) continue;
      await this.friends.assertNotBlocked(ownerId, mid);
      const ok = await this.friends.areFriends(ownerId, mid);
      if (!ok) throw new ForbiddenException(`Not friends with ${mid}`);
    }

    const thread = await this.threads.save(
      this.threads.create({
        kind: 'GROUP',
        title,
        createdById: ownerId,
        dmKey: null,
        lastMessageAt: null,
        lastMessagePreview: null,
      }),
    );

    await this.members.save(
      memberIds.map((uid) =>
        this.members.create({
          threadId: thread.id,
          userId: uid,
          role: uid === ownerId ? 'OWNER' : 'MEMBER',
          leftAt: null,
        }),
      ),
    );

    return thread;
  }

  async listThreads(userId: string) {
    const memberships = await this.members.find({
      where: { userId, leftAt: IsNull() },
    });
    if (!memberships.length) return [];

    const threadIds = memberships.map((m) => m.threadId);
    const threads = await this.threads
      .createQueryBuilder('t')
      .where('t.id IN (:...ids)', { ids: threadIds })
      .orderBy('t.last_message_at', 'DESC', 'NULLS LAST')
      .addOrderBy('t.created_at', 'DESC')
      .getMany();

    return threads.map((t) => ({
      id: t.id,
      kind: t.kind,
      title: t.title,
      lastMessageAt: t.lastMessageAt,
      lastMessagePreview: t.lastMessagePreview,
      createdById: t.createdById,
    }));
  }

  async assertMember(userId: string, threadId: string): Promise<ChatThreadMember> {
    const m = await this.members.findOne({
      where: { threadId, userId, leftAt: IsNull() },
    });
    if (!m) throw new ForbiddenException('Not a thread member');
    return m;
  }

  async listMessages(userId: string, threadId: string, limit = 50) {
    await this.assertMember(userId, threadId);
    return this.messages.find({
      where: { threadId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }

  async sendText(userId: string, threadId: string, rawBody: string) {
    return this.send(userId, threadId, 'TEXT', sanitizeChatText(rawBody), null);
  }

  async send(
    userId: string,
    threadId: string,
    type: ChatMessageType,
    body: string | null,
    payload: Record<string, unknown> | null,
  ) {
    await this.assertMember(userId, threadId);
    if (type === 'TEXT' && !body) {
      throw new BadRequestException('Empty message');
    }

    // RealAI moderation (contract §4.4) before persist / fan-out
    let moderationMeta: Record<string, unknown> | null = null;
    if (type === 'TEXT' && body) {
      const mod = await realaiModerate({
        player: { player_id: userId },
        text: body,
        context: { channel: 'thread_chat', thread_id: threadId },
      });
      moderationMeta = {
        action: mod.action,
        severity: mod.severity,
        clean: mod.clean,
        policy_tags: mod.policy_tags,
      };
      if (mod.action === 'block_and_escalate' || mod.action === 'hold_for_review') {
        this.logger.warn(
          `chat blocked user=${userId} thread=${threadId} action=${mod.action}`,
        );
        throw new ForbiddenException({
          code: 'MODERATION_BLOCK',
          action: mod.action,
          guidance: mod.guidance ?? 'Message held by moderation',
        });
      }
      // warn / warn_and_flag / soft_filter: still deliver; attach meta
    }

    const msg = await this.messages.save(
      this.messages.create({
        threadId,
        senderId: userId,
        type,
        body,
        payloadJson: {
          ...(payload ?? {}),
          ...(moderationMeta ? { moderation: moderationMeta } : {}),
        },
        deletedAt: null,
      }),
    );

    const preview =
      type === 'TEXT'
        ? (body ?? '').slice(0, 200)
        : type === 'MATCH_INVITE'
          ? 'Match invite'
          : type === 'CHECKIN_SHARE'
            ? 'Hall check-in'
            : type === 'MEETUP_ACTION'
              ? String(payload?.action ?? 'Meetup')
              : 'Message';

    await this.threads.update(threadId, {
      lastMessageAt: msg.createdAt,
      lastMessagePreview: preview,
    });

    const dto = {
      id: msg.id,
      threadId,
      senderId: userId,
      type,
      body,
      payloadJson: payload,
      createdAt: msg.createdAt.toISOString(),
    };

    this.realtime.emitToThread(threadId, 'thread:message', dto);

    // Fan-out to members not in room (inbox badge)
    const members = await this.members.find({
      where: { threadId, leftAt: IsNull() },
    });
    for (const m of members) {
      if (m.userId === userId) continue;
      this.realtime.emitToUser(m.userId, 'thread:message', dto);
    }

    return dto;
  }

  async markRead(userId: string, threadId: string) {
    const m = await this.assertMember(userId, threadId);
    m.lastReadAt = new Date();
    await this.members.save(m);
    return { ok: true, lastReadAt: m.lastReadAt };
  }

  async addMembers(actorId: string, threadId: string, userIds: string[]) {
    const actor = await this.assertMember(actorId, threadId);
    const thread = await this.threads.findOne({ where: { id: threadId } });
    if (!thread || thread.kind !== 'GROUP') {
      throw new BadRequestException('Only groups support add members');
    }
    if (actor.role !== 'OWNER' && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Insufficient role');
    }
    for (const uid of userIds) {
      if (!(await this.friends.areFriends(actorId, uid))) {
        throw new ForbiddenException(`Not friends with ${uid}`);
      }
      const existing = await this.members.findOne({ where: { threadId, userId: uid } });
      if (existing && !existing.leftAt) continue;
      if (existing) {
        existing.leftAt = null;
        existing.joinedAt = new Date();
        await this.members.save(existing);
      } else {
        await this.members.save(
          this.members.create({
            threadId,
            userId: uid,
            role: 'MEMBER',
            leftAt: null,
          }),
        );
      }
    }
    return { ok: true };
  }
}
