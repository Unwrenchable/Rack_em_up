import type { FriendCard } from './types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPlayerUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

type RawFriend = {
  friendshipId?: string;
  id?: string;
  userId?: string;
  user_id?: string;
  requesterId?: string;
  addresseeId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  rating?: number;
  online?: boolean;
  status?: string;
  lastSeenAt?: string | null;
  activity?: { type?: string; label?: string; hallId?: string } | null;
  mutualCount?: number;
};

function otherId(f: RawFriend, meId?: string): string | undefined {
  if (f.userId) return f.userId;
  if (f.user_id) return f.user_id;
  if (meId && f.requesterId === meId) return f.addresseeId;
  if (meId && f.addresseeId === meId) return f.requesterId;
  return f.requesterId ?? f.addresseeId ?? f.id;
}

/**
 * GET /friends may be hydrated { userId, online } or raw friendship rows.
 * Always expose `id` as the other player's user id (Challenge / DM / Add).
 */
export function mapFriendCards(raw: unknown, meId?: string): FriendCard[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? ((raw as { friends?: unknown; items?: unknown }).friends ??
          (raw as { items?: unknown }).items ??
          [])
      : [];
  if (!Array.isArray(list)) return [];

  const out: FriendCard[] = [];
  for (const row of list as RawFriend[]) {
    const userId = otherId(row, meId);
    if (!userId || userId === meId) continue;
    const atHall =
      row.activity?.type === 'hall_checkin' ||
      row.status === 'at_hall' ||
      Boolean(row.activity?.hallId);
    const online = row.online === true || row.status === 'online';
    out.push({
      id: userId,
      friendshipId: row.friendshipId ?? row.id,
      displayName: row.displayName ?? `User ${userId.slice(0, 6)}`,
      rating: row.rating ?? 500,
      status: atHall ? 'at_hall' : online ? 'online' : 'offline',
      hallName: atHall ? row.activity?.label : undefined,
      avatarUrl: row.avatarUrl ?? null,
      lastSeenAt: row.lastSeenAt ?? null,
      mutualCount: row.mutualCount,
    });
  }
  return out;
}
