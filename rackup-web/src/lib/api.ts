import {
  DEMO_ACTION,
  DEMO_BADGES,
  DEMO_DRILLS,
  DEMO_FRIENDS,
  DEMO_HALLS,
  DEMO_HALLS_LIVE,
  DEMO_LEAGUES,
  DEMO_MEMORIES,
  DEMO_MONEY,
  DEMO_NOTIFICATIONS,
  DEMO_PLAYERS,
  DEMO_TOURNAMENTS,
  DEMO_USER,
} from './demo';
import type {
  ActionPost,
  AppNotification,
  Badge,
  Drill,
  FriendCard,
  Hall,
  League,
  LiveHall,
  LookingPlayer,
  MatchMemory,
  MoneyMatch,
  ShotOfTheDay,
  SotdShotMap,
  Tournament,
  User,
} from './types';
import { DEMO_SHOT_OF_DAY } from './demo-shots';

const API = import.meta.env.VITE_API_URL ?? '/api/v1';
const TOKEN_KEY = 'rackup_token';
const USER_KEY = 'rackup_user';
const DEMO_KEY = 'rackup_demo';
const REFRESH_KEY = 'rackup_refresh';

/**
 * Socket.IO origin (no path).
 * Priority: VITE_WS_URL → VITE_API_URL (strip /api/v1) → same origin (Vite proxies /socket.io).
 */
export function getSocketUrl(): string {
  const ws = import.meta.env.VITE_WS_URL as string | undefined;
  if (ws && /^wss?:\/\//i.test(ws)) {
    // Allow wss://host or https://host — strip path after host
    return ws
      .replace(/^ws/i, 'http')
      .replace(/\/socket\.io\/?$/i, '')
      .replace(/\/$/, '');
  }
  if (ws && /^https?:\/\//i.test(ws)) {
    return ws.replace(/\/socket\.io\/?$/i, '').replace(/\/$/, '');
  }
  const base = import.meta.env.VITE_API_URL ?? '';
  if (base && /^https?:\/\//i.test(String(base))) {
    return String(base).replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  // Same-origin → Vite dev proxy /socket.io → :3000
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_KEY) === '1';
}

export function setSession(token: string | null, user: User | null, demo = false) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  if (demo) localStorage.setItem(DEMO_KEY, '1');
  else localStorage.removeItem(DEMO_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DEMO_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function enterDemoMode(): User {
  setSession('demo', DEMO_USER, true);
  return DEMO_USER;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token && token !== 'demo') headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id),
    email: String(raw.email),
    displayName: String(raw.displayName ?? raw.display_name ?? 'Player'),
    avatarUrl: (raw.avatarUrl as string | null) ?? null,
    role: String(raw.role ?? 'USER'),
    reputation: Number(raw.reputation ?? 0),
    rating: Number(raw.rating ?? 500),
  };
}

/** Auth V2 cutover — primary; V1 kept as legacy fallback only. */
export async function login(email: string, password: string) {
  try {
    const data = await request<{
      user: Record<string, unknown>;
      accessToken: string;
      refreshToken?: string;
    }>('/auth/v2/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const user = normalizeUser(data.user);
    setSession(data.accessToken, user, false);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    return user;
  } catch {
    // Legacy V1 fallback if V2 unavailable
    const data = await request<{
      user: Record<string, unknown>;
      accessToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const user = normalizeUser(data.user);
    setSession(data.accessToken, user, false);
    return user;
  }
}

export async function signup(email: string, password: string, displayName: string) {
  try {
    const data = await request<{
      user: Record<string, unknown>;
      accessToken: string;
      refreshToken?: string;
    }>('/auth/v2/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
      }),
    });
    const user = normalizeUser(data.user);
    setSession(data.accessToken, user, false);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    return user;
  } catch {
    const data = await request<{
      user: Record<string, unknown>;
      accessToken: string;
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
      }),
    });
    const user = normalizeUser(data.user);
    setSession(data.accessToken, user, false);
    return user;
  }
}

export type PublicUserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  reputation: number;
  rating: number;
  role: string;
};

export async function fetchUserProfile(id: string): Promise<PublicUserProfile | null> {
  if (isDemoMode()) {
    return {
      id,
      displayName: `Demo ${id.slice(0, 4)}`,
      avatarUrl: null,
      reputation: 0,
      rating: 500,
      role: 'USER',
    };
  }
  try {
    return await request<PublicUserProfile>(`/users/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchUserProfiles(ids: string[]): Promise<Map<string, PublicUserProfile>> {
  const map = new Map<string, PublicUserProfile>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  if (isDemoMode()) {
    unique.forEach((id) =>
      map.set(id, {
        id,
        displayName: `Demo ${id.slice(0, 4)}`,
        avatarUrl: null,
        reputation: 0,
        rating: 500,
        role: 'USER',
      }),
    );
    return map;
  }
  try {
    const rows = await request<PublicUserProfile[]>(
      `/users/profiles?ids=${unique.map(encodeURIComponent).join(',')}`,
    );
    if (Array.isArray(rows)) {
      rows.forEach((r) => map.set(r.id, r));
      return map;
    }
  } catch {
    /* fall through to per-id */
  }
  await Promise.all(
    unique.map(async (id) => {
      const p = await fetchUserProfile(id);
      if (p) map.set(id, p);
    }),
  );
  return map;
}

export async function fetchLiveHalls(): Promise<LiveHall[]> {
  if (isDemoMode()) return DEMO_HALLS_LIVE;
  try {
    return await request<LiveHall[]>('/halls/live');
  } catch {
    return [];
  }
}

export async function fetchHalls(): Promise<Hall[]> {
  if (isDemoMode()) return DEMO_HALLS;
  try {
    return await request<Hall[]>('/halls');
  } catch {
    return [];
  }
}

export async function checkInHall(payload: {
  name: string;
  lat: number;
  lon: number;
  game?: string;
  hallId?: string;
}) {
  if (isDemoMode()) {
    return { hall: DEMO_HALLS[0], checkin: { id: 'demo-checkin' } };
  }
  return request('/halls/check-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMemories(): Promise<MatchMemory[]> {
  if (isDemoMode()) return DEMO_MEMORIES;
  try {
    return await request<MatchMemory[]>('/users/me/memories');
  } catch {
    return [];
  }
}

export async function fetchMoneyMatches(): Promise<MoneyMatch[]> {
  if (isDemoMode()) return DEMO_MONEY;
  try {
    return await request<MoneyMatch[]>('/money-matches');
  } catch {
    return [];
  }
}

export async function createMoneyMatch(body: {
  playerAId: string;
  playerBId: string;
  hallId: string;
  game: string;
  raceTo: number;
  amountCents: number;
  livestreamUrl?: string;
}): Promise<MoneyMatch> {
  if (isDemoMode()) {
    return {
      id: `mm-${Date.now()}`,
      ...body,
      livestreamUrl: body.livestreamUrl ?? null,
      status: 'PENDING',
      aConfirmed: false,
      bConfirmed: false,
      createdAt: new Date().toISOString(),
    };
  }
  return request('/money-matches', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchLookingPlayers(): Promise<LookingPlayer[]> {
  if (isDemoMode()) return DEMO_PLAYERS;
  try {
    const raw = await request<
      Array<{
        id: string;
        user_id: string;
        game: string;
        stakes: string;
        distance_meters: number;
        min_rating: number;
        max_rating: number;
        rank_score: number;
      }>
    >('/matchmaking/search?lat=36.17&lon=-115.14&radius=20000&game=9-ball');
    if (!Array.isArray(raw)) return [];
    const profiles = await fetchUserProfiles(raw.map((r) => r.user_id));
    return raw.map((r) => {
      const p = profiles.get(r.user_id);
      return {
        id: r.id,
        displayName: p?.displayName ?? `Player ${r.user_id.slice(0, 6)}`,
        rating: p?.rating ?? Math.round((r.min_rating + r.max_rating) / 2),
        game: r.game,
        stakes: r.stakes,
        distanceKm: Math.round((r.distance_meters ?? 0) / 100) / 10,
        reputation: p?.reputation ?? 0,
      };
    });
  } catch {
    return [];
  }
}

export async function goLiveLooking(payload: {
  lat: number;
  lon: number;
  game: string;
  stakes: string;
  min_rating: number;
  max_rating: number;
  user_id: string;
}) {
  if (isDemoMode()) return { id: `lfm-${Date.now()}`, ...payload };
  return request('/matchmaking/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchTournaments(): Promise<Tournament[]> {
  if (isDemoMode()) return DEMO_TOURNAMENTS;
  try {
    const rows = await request<Tournament[]>('/tournaments');
    return rows;
  } catch {
    return [];
  }
}

export async function fetchLeagues(): Promise<League[]> {
  if (isDemoMode()) return DEMO_LEAGUES;
  try {
    return await request<League[]>('/leagues');
  } catch {
    return [];
  }
}

function mapFriendListItem(f: {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  rating: number;
  online: boolean;
  lastSeenAt?: string | null;
  activity?: { type: string; label?: string; hallId?: string } | null;
  mutualCount?: number;
}): FriendCard {
  const atHall = f.activity?.type === 'hall_checkin';
  return {
    id: f.userId,
    friendshipId: f.friendshipId,
    displayName: f.displayName,
    rating: f.rating ?? 500,
    status: atHall ? 'at_hall' : f.online ? 'online' : 'offline',
    hallName: atHall ? f.activity?.label : undefined,
    avatarUrl: f.avatarUrl ?? null,
    lastSeenAt: f.lastSeenAt ?? null,
    mutualCount: f.mutualCount,
  };
}

/** Accepted friends with online presence + activity (GET /friends). */
export async function fetchFriends(): Promise<FriendCard[]> {
  if (isDemoMode()) return DEMO_FRIENDS;
  try {
    const raw = await request<
      Array<{
        friendshipId: string;
        userId: string;
        displayName: string;
        avatarUrl: string | null;
        rating: number;
        online: boolean;
        lastSeenAt: string | null;
        activity: {
          type: string;
          label?: string;
          hallId?: string;
          matchId?: string;
        } | null;
        mutualCount?: number;
      }>
    >('/friends');
    if (!Array.isArray(raw)) return [];
    // New hydrated shape
    if (raw[0] && 'userId' in raw[0] && 'online' in raw[0]) {
      return raw.map(mapFriendListItem);
    }
    // Legacy raw friendship rows fallback
    const legacy = raw as unknown as Array<{
      id: string;
      requesterId: string;
      addresseeId: string;
      status: string;
    }>;
    const me = getStoredUser()?.id;
    const otherIds = legacy.map((f) =>
      me && f.requesterId === me ? f.addresseeId : f.requesterId,
    );
    const profiles = await fetchUserProfiles(otherIds);
    return legacy.map((f) => {
      const otherId = me && f.requesterId === me ? f.addresseeId : f.requesterId;
      const p = profiles.get(otherId);
      return {
        id: otherId,
        friendshipId: f.id,
        displayName: p?.displayName ?? `User ${otherId.slice(0, 6)}`,
        rating: p?.rating ?? 500,
        status: f.status === 'ACCEPTED' ? 'online' : 'offline',
      } as FriendCard;
    });
  } catch {
    return [];
  }
}

export async function fetchPendingFriendsIncoming() {
  if (isDemoMode()) return [];
  try {
    return await request<
      Array<{
        friendshipId: string;
        userId: string;
        displayName: string;
        rating: number;
        online: boolean;
      }>
    >('/friends/pending/incoming');
  } catch {
    return [];
  }
}

export async function requestFriend(addresseeId: string) {
  return request('/friends/request', {
    method: 'POST',
    body: JSON.stringify({ addresseeId }),
  });
}

export async function acceptFriend(friendshipId: string) {
  return request(`/friends/${friendshipId}/accept`, { method: 'POST' });
}

export async function declineFriend(friendshipId: string) {
  return request(`/friends/${friendshipId}/decline`, { method: 'POST' });
}

export async function cancelFriendRequest(friendshipId: string) {
  return request(`/friends/${friendshipId}/cancel`, { method: 'POST' });
}

export async function blockUser(userId: string) {
  return request('/friends/block', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function fetchChatThreads() {
  if (isDemoMode()) return [];
  try {
    return await request<
      Array<{
        id: string;
        kind: 'DM' | 'GROUP';
        title: string | null;
        lastMessageAt: string | null;
        lastMessagePreview: string | null;
        createdById: string;
      }>
    >('/chat/threads');
  } catch {
    return [];
  }
}

export async function openDmThread(friendId: string) {
  return request<{ id: string; kind: string }>('/chat/threads/dm', {
    method: 'POST',
    body: JSON.stringify({ friendId }),
  });
}

export async function fetchThreadMessages(threadId: string, limit = 50) {
  return request<
    Array<{
      id: string;
      threadId: string;
      senderId: string;
      type: string;
      body: string | null;
      createdAt: string;
    }>
  >(`/chat/threads/${threadId}/messages?limit=${limit}`);
}

export async function sendThreadMessage(
  threadId: string,
  body: string,
  type: string = 'TEXT',
) {
  return request(`/chat/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ type, body }),
  });
}

export async function fetchSocialSettings() {
  if (isDemoMode()) {
    return {
      checkInVisibility: 'FRIENDS',
      showOnlineToFriends: true,
      allowDmFromNonFriends: false,
    };
  }
  return request<{
    checkInVisibility: string;
    checkInVisibleToUserIds: string[];
    checkInDefaultTtlMinutes: number;
    showOnlineToFriends: boolean;
    allowDmFromNonFriends: boolean;
  }>('/social/settings');
}

export async function updateSocialSettings(
  patch: Partial<{
    checkInVisibility: string;
    checkInVisibleToUserIds: string[];
    checkInDefaultTtlMinutes: number;
    showOnlineToFriends: boolean;
    allowDmFromNonFriends: boolean;
  }>,
) {
  return request('/social/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function fetchActionBoard(): Promise<ActionPost[]> {
  if (isDemoMode()) return DEMO_ACTION;
  try {
    return await request<ActionPost[]>('/action-board');
  } catch {
    return [];
  }
}

export async function createActionPost(body: {
  body: string;
  game: string;
  stakes: string;
}): Promise<ActionPost> {
  if (isDemoMode()) {
    return {
      id: `a-${Date.now()}`,
      authorId: 'demo-user-1',
      authorName: DEMO_USER.displayName,
      isOpen: true,
      createdAt: new Date().toISOString(),
      ...body,
    };
  }
  return request('/action-board', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchTodayDrills(): Promise<{
  drills: Drill[];
  provider: string;
}> {
  if (isDemoMode()) {
    return { drills: DEMO_DRILLS, provider: 'demo' };
  }
  try {
    const data = await request<{
      drills: Array<Drill & { source?: string }>;
      provider: string;
    }>('/training/drills/today');
    return {
      drills: data.drills.map((d) => ({
        id: d.id,
        title: d.title,
        focus: d.focus,
        minutes: d.minutes,
        difficulty: d.difficulty,
        description: d.description,
      })),
      provider: data.provider,
    };
  } catch {
    return { drills: [], provider: 'error' };
  }
}

export async function analyzeShot(body: {
  notes?: string;
  videoUrl?: string;
  game?: string;
  focus?: string;
}) {
  if (isDemoMode()) {
    return {
      analysis: 'Demo analysis: work the pre-shot routine, freeze on aim, firm enough for shape.',
      provider: 'demo',
      offlineFallback: true,
    };
  }
  return request<{
    analysis: string;
    provider: string;
    offlineFallback: boolean;
    model: string;
  }>('/training/analyze', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchProviderHealth() {
  try {
    return await request<{
      configured: boolean;
      reachable: boolean;
      baseUrl: string;
      model: string;
    }>('/training/provider');
  } catch {
    return { configured: false, reachable: false, baseUrl: '', model: '' };
  }
}

export async function fetchNotificationsApi(): Promise<AppNotification[]> {
  if (isDemoMode()) return DEMO_NOTIFICATIONS;
  try {
    const rows = await request<
      Array<{
        id: string;
        title: string;
        body: string;
        kind: string;
        isRead: boolean;
        createdAt: string;
      }>
    >('/notifications');
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind as AppNotification['kind'],
      read: n.isRead,
      time: formatRelative(n.createdAt),
    }));
  } catch {
    return [];
  }
}

/** @deprecated use fetchTodayDrills */
export function fetchDrills(): Drill[] {
  return DEMO_DRILLS;
}

export async function fetchShotOfTheDay(): Promise<ShotOfTheDay> {
  if (isDemoMode()) return DEMO_SHOT_OF_DAY;
  try {
    return await request<ShotOfTheDay>('/shots/today');
  } catch {
    throw new Error('Failed to fetch shot of the day');
  }
}

/** Structured SOTD map — catalog fallback works with RealAI offline. */
export async function fetchSotdMap(shotId: string): Promise<SotdShotMap | null> {
  if (isDemoMode()) {
    return {
      id: shotId,
      name: DEMO_SHOT_OF_DAY.shot.name,
      difficulty: DEMO_SHOT_OF_DAY.shot.difficulty,
      difficulty_rating: 2,
      category: DEMO_SHOT_OF_DAY.shot.category,
      speed_category: DEMO_SHOT_OF_DAY.shot.speed,
      tip_zone: DEMO_SHOT_OF_DAY.shot.tipZone,
      cue_ball_start: { x: 30, y: 25 },
      object_ball_positions: [{ ballId: 1, x: 55, y: 25 }],
      intended_path: [
        { from: { x: 30, y: 25 }, to: { x: 55, y: 25 } },
        { from: { x: 55, y: 25 }, to: { x: 100, y: 25 } },
      ],
      english: {
        tip_zone: DEMO_SHOT_OF_DAY.shot.tipZone,
        sidespin: 0,
        backspin: 0,
        follow: 0,
        label: 'none',
      },
      landing_zones: [
        { x: 8, y: 2, label: 'pocket' },
        { x: 4.4, y: 2, label: 'cb_rest' },
      ],
      pocket_target: { x: 100, y: 25 },
      coordinate_system: {
        x: 'head to foot',
        y: 'near rail to far rail',
        units: 'table percent',
      },
      source: 'catalog_fallback',
      ascii_table: '',
      realaiReachable: false,
    };
  }
  try {
    return await request<SotdShotMap>(`/realai/v2/sotd/map/${encodeURIComponent(shotId)}`);
  } catch {
    return null;
  }
}

export async function fetchSotdMaps(): Promise<{ total: number; maps: SotdShotMap[]; realaiReachable: boolean }> {
  if (isDemoMode()) {
    const one = await fetchSotdMap(DEMO_SHOT_OF_DAY.shot.id);
    return { total: one ? 1 : 0, maps: one ? [one] : [], realaiReachable: false };
  }
  try {
    return await request(`/realai/v2/sotd/maps`);
  } catch {
    return { total: 0, maps: [], realaiReachable: false };
  }
}

/**
 * Personalized Shot of the Day via RealAI rackup-coach ability `shot_of_the_day`.
 * Surfaces primary + why_helps_regular_play per wiring contract.
 */
export async function fetchRealAiShotOfTheDay(body?: {
  game?: string;
  tableSize?: string;
  skillLevel?: string;
  weaknesses?: string[];
  shownShotIds?: string[];
}) {
  if (isDemoMode()) {
    return {
      ok: true,
      why:
        DEMO_SHOT_OF_DAY.note ||
        DEMO_SHOT_OF_DAY.shot.tagline ||
        DEMO_SHOT_OF_DAY.shot.successLooksLike,
      result: { primary: DEMO_SHOT_OF_DAY.shot },
      provider: 'demo',
    };
  }
  return request<{
    ok: boolean;
    why?: string | null;
    result?: Record<string, unknown>;
    provider?: string;
    reason?: string;
  }>('/realai/v2/shot-of-the-day', {
    method: 'POST',
    body: JSON.stringify({
      game: body?.game ?? 'pyramid',
      tableSize: body?.tableSize,
      skillLevel: body?.skillLevel,
      weaknesses: body?.weaknesses,
      shownShotIds: body?.shownShotIds,
    }),
  });
}

/** Coach / practice plan via RealAI ability `coach` | `pyramid`. */
export async function requestRealAiCoach(body: {
  goal?: string;
  mode?: string;
  discipline?: string;
  tableSize?: string;
  skillLevel?: string | number;
  minutes?: number;
  matchId?: string;
}) {
  if (isDemoMode()) {
    return {
      ok: true,
      result: {
        practice_plan: {
          duration_minutes: body.minutes ?? 30,
          blocks: [
            { order: 1, skill: 'position_play', minutes: 15, drill: 'Stop shot ladder' },
          ],
        },
      },
      provider: 'demo',
    };
  }
  return request('/realai/v2/coach', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Pyramid rules / race help via RealAI `pyramid_rules` (offline matrix pin if down). */
export async function fetchPyramidRules(body?: {
  table_size?: string;
  skill_level?: string;
  my_score?: number;
  opp_score?: number;
}) {
  if (isDemoMode()) {
    return {
      ok: true,
      result: {
        config: {
          table_size: body?.table_size ?? '7ft',
          rack_size: 10,
          points_to_win: 35,
          one_ball_value: 11,
        },
      },
      provider: 'demo',
    };
  }
  return request('/realai/v2/pyramid-rules', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

/** Rank pre-filtered candidates via RealAI `matchmaking`. */
export async function realAiMatchmaking(body: {
  window?: number;
  candidates: Array<Record<string, unknown>>;
}) {
  return request('/realai/v2/matchmaking', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function registerForTournament(tournamentId: string, userId: string): Promise<void> {
  await request(`/tournaments/${tournamentId}/register`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function completeMoneyMatch(input: {
  matchId: string;
  reportingPlayerId: string;
  aScore: number;
  bScore: number;
}): Promise<MoneyMatch> {
  if (isDemoMode()) {
    return {
      id: input.matchId,
      playerAId: input.reportingPlayerId,
      playerBId: 'p2',
      hallId: 'h1',
      game: '9-ball',
      raceTo: 7,
      amountCents: 10000,
      livestreamUrl: null,
      status: 'COMPLETED',
      aConfirmed: true,
      bConfirmed: true,
      createdAt: new Date().toISOString(),
    };
  }
  return request(`/money-matches/${input.matchId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      reportingPlayerId: input.reportingPlayerId,
      aScore: input.aScore,
      bScore: input.bScore,
    }),
  });
}

export async function fetchLeagueStandings(seasonId: string): Promise<{
  seasonId: string;
  standings: Array<{ playerId: string; points: number; position: number }>;
}> {
  if (isDemoMode()) {
    return {
      seasonId,
      standings: [
        { playerId: 'demo-1', points: 9, position: 1 },
        { playerId: 'demo-2', points: 6, position: 2 },
      ],
    };
  }
  try {
    return await request(`/leagues/v2/season/${encodeURIComponent(seasonId)}/standings`);
  } catch {
    // Fallback: empty standings when V2 season not linked to V1 league id
    return { seasonId, standings: [] };
  }
}

export async function fetchShotCatalog(filters?: {
  difficulty?: string;
  category?: string;
}): Promise<{ total: number; shots: import('./types').CatalogShot[] }> {
  if (isDemoMode()) {
    return { total: 1, shots: [DEMO_SHOT_OF_DAY.shot] };
  }
  const q = new URLSearchParams();
  if (filters?.difficulty) q.set('difficulty', filters.difficulty);
  if (filters?.category) q.set('category', filters.category);
  const qs = q.toString();
  try {
    return await request(`/shots/catalog${qs ? `?${qs}` : ''}`);
  } catch {
    return { total: 0, shots: [] };
  }
}

export async function completeSotd(shotId?: string): Promise<{
  completed: boolean;
  date: string;
  shotId: string;
  streak: number;
}> {
  if (isDemoMode()) {
    const key = 'rackup_sotd_streak';
    const n = Number(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(n));
    return {
      completed: true,
      date: new Date().toISOString().slice(0, 10),
      shotId: shotId ?? DEMO_SHOT_OF_DAY.shot.id,
      streak: n,
    };
  }
  const q = shotId ? `?shotId=${encodeURIComponent(shotId)}` : '';
  return request(`/shots/complete${q}`, { method: 'POST' });
}

export async function fetchSotdStreak(): Promise<{ streak: number; lastCompletedOn: string | null }> {
  if (isDemoMode()) {
    return {
      streak: Number(localStorage.getItem('rackup_sotd_streak') || '0'),
      lastCompletedOn: null,
    };
  }
  try {
    return await request('/shots/streak');
  } catch {
    return { streak: 0, lastCompletedOn: null };
  }
}

export async function confirmMoneyMatch(input: {
  matchId: string;
  confirmingPlayerId: string;
  confirmingSide: 'A' | 'B';
}): Promise<MoneyMatch> {
  if (isDemoMode()) {
    return {
      id: input.matchId,
      playerAId: input.confirmingSide === 'A' ? input.confirmingPlayerId : 'p1',
      playerBId: input.confirmingSide === 'B' ? input.confirmingPlayerId : 'p1',
      hallId: 'h1',
      game: '9-ball',
      raceTo: 7,
      amountCents: 10000,
      livestreamUrl: null,
      status: 'ACTIVE',
      aConfirmed: true,
      bConfirmed: true,
      createdAt: new Date().toISOString(),
    };
  }
  return request(`/money-matches/${input.matchId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({
      confirmingPlayerId: input.confirmingPlayerId,
      confirmingSide: input.confirmingSide,
    }),
  });
}

export async function disputeMoneyMatch(input: {
  matchId: string;
  reason: string;
  details?: string;
}): Promise<MoneyMatch> {
  if (isDemoMode()) {
    throw new Error('Demo dispute recorded locally');
  }
  return request(`/money-matches/${input.matchId}/dispute`, {
    method: 'POST',
    body: JSON.stringify({
      reason: input.reason,
      details: input.details,
    }),
  });
}

/** Phase 3D — arbiter resolve (ADMIN / HALL_OWNER / ORGANIZER) */
export async function resolveMoneyDispute(input: {
  matchId: string;
  resolution: 'complete' | 'refund' | 'no_contest';
  aScore?: number;
  bScore?: number;
  winnerId?: string;
  notes?: string;
  arbiterId?: string;
}): Promise<MoneyMatch> {
  if (isDemoMode()) {
    return {
      id: input.matchId,
      playerAId: 'p1',
      playerBId: 'p2',
      hallId: 'h1',
      game: '9-ball',
      raceTo: 7,
      amountCents: 10000,
      livestreamUrl: null,
      status: 'COMPLETED',
      aConfirmed: true,
      bConfirmed: true,
      escrowStatus: input.resolution === 'complete' ? 'RELEASED' : 'REFUNDED',
      createdAt: new Date().toISOString(),
    };
  }
  return request(`/money-matches/${input.matchId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({
      arbiterId: input.arbiterId,
      resolution: input.resolution,
      aScore: input.aScore,
      bScore: input.bScore,
      winnerId: input.winnerId,
      notes: input.notes,
    }),
  });
}

export async function fetchMoneyMatchAudit(matchId: string): Promise<unknown[]> {
  if (isDemoMode()) return [];
  return request(`/money-matches/${encodeURIComponent(matchId)}/audit`);
}

export async function exportMoneyAudit(params?: {
  matchId?: string;
  action?: string;
  limit?: number;
}): Promise<unknown[]> {
  if (isDemoMode()) return [];
  const q = new URLSearchParams();
  if (params?.matchId) q.set('matchId', params.matchId);
  if (params?.action) q.set('action', params.action);
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return request(`/money-matches/audit/export${qs ? `?${qs}` : ''}`);
}

// --- P3 platform stubs ---

export async function registerPushDevice(body: {
  token: string;
  platform?: string;
  prefs?: Record<string, boolean>;
}): Promise<unknown> {
  if (isDemoMode()) return { ok: true, token: body.token };
  return request('/notifications/push/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function testPushNotification(body?: {
  title?: string;
  body?: string;
}): Promise<unknown> {
  if (isDemoMode()) return { queued: true };
  return request('/notifications/push/test', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export async function setPremiumTier(body?: {
  tier?: 'free' | 'premium' | 'hall_pro';
  days?: number;
}): Promise<unknown> {
  if (isDemoMode()) {
    return { premiumTier: body?.tier ?? 'premium', premiumActive: true };
  }
  return request('/users/me/premium', {
    method: 'POST',
    body: JSON.stringify(body ?? { tier: 'premium', days: 30 }),
  });
}

export function fetchBadges(): Badge[] {
  return DEMO_BADGES;
}

export function fetchNotifications(): AppNotification[] {
  return DEMO_NOTIFICATIONS;
}

export function formatMoney(cents: number | string): string {
  const n = typeof cents === 'string' ? Number(cents) : cents;
  if (Number.isNaN(n)) return '$—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n / 100);
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Phase 2 — V2 client stubs (pages can adopt without full rewrites)
// ---------------------------------------------------------------------------

/** Matchmaking V2 — Redis queue + haversine (matches backend SearchV2Body) */
export async function mmV2Search(body: {
  lat: number;
  lon: number;
  radius: number;
  game?: string;
  stakes?: string;
  min_rating?: number;
  max_rating?: number;
  raceTo?: number;
}): Promise<unknown> {
  if (isDemoMode()) {
    return { status: 'searching', sessionId: 'demo-mm', dryRun: true, ...body };
  }
  return request('/matchmaking/v2/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function mmV2Confirm(body: { sessionId: string }): Promise<unknown> {
  if (isDemoMode()) return { ok: true, ...body };
  return request('/matchmaking/v2/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function mmV2Cancel(body: { sessionId: string }): Promise<unknown> {
  if (isDemoMode()) return { ok: true };
  return request('/matchmaking/v2/cancel', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function mmV2Status(sessionId: string): Promise<unknown> {
  if (isDemoMode()) return { sessionId, status: 'idle' };
  return request(`/matchmaking/v2/status/${encodeURIComponent(sessionId)}`);
}

/** Halls V2 — check-in + feed */
export async function hallV2CheckIn(body: { hallId: string }): Promise<unknown> {
  if (isDemoMode()) return { ok: true, hallId: body.hallId, status: 'checked_in' };
  return request('/halls/v2/checkin', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function hallV2CheckOut(body: { hallId: string }): Promise<unknown> {
  if (isDemoMode()) return { ok: true, hallId: body.hallId, status: 'checked_out' };
  return request('/halls/v2/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function hallV2Feed(hallId: string): Promise<unknown> {
  if (isDemoMode()) return { hallId, items: [] };
  return request(`/halls/v2/feed/${encodeURIComponent(hallId)}`);
}

/** Tournament V2 — list / create / start / bracket / report / admin / TV */
export async function tournamentV2List(): Promise<
  Array<{ id: string; name: string; game: string; mode: string; status: string }>
> {
  if (isDemoMode()) {
    return [{ id: 'demo-t', name: 'Demo Open', game: '9-ball', mode: 'SINGLE_ELIMINATION', status: 'DRAFT' }];
  }
  return request('/tournaments/v2');
}

export async function tournamentV2Create(body: {
  name: string;
  game: string;
  mode: string;
  seed_strategy?: 'manual' | 'random' | 'elo';
  format_config?: Record<string, unknown>;
}): Promise<{ id: string; name: string; status: string }> {
  if (isDemoMode()) return { id: `demo-${Date.now()}`, name: body.name, status: 'DRAFT' };
  return request('/tournaments/v2/create', { method: 'POST', body: JSON.stringify(body) });
}

export async function tournamentV2Register(tournamentId: string): Promise<unknown> {
  if (isDemoMode()) return { success: true };
  return request('/tournaments/v2/register', {
    method: 'POST',
    body: JSON.stringify({ tournamentId }),
  });
}

export async function tournamentV2Start(body: {
  tournamentId: string;
  seed_strategy?: 'manual' | 'random' | 'elo';
}): Promise<unknown> {
  if (isDemoMode()) return { success: true };
  return request('/tournaments/v2/start', { method: 'POST', body: JSON.stringify(body) });
}

export async function tournamentV2Bracket(tournamentId: string): Promise<unknown> {
  if (isDemoMode()) return { tournamentId, matches: [], rounds: [] };
  return request(`/tournaments/v2/bracket/${encodeURIComponent(tournamentId)}`);
}

export async function tournamentV2ReportMatch(body: {
  tournamentId: string;
  matchId: string;
  aScore: number;
  bScore: number;
  winnerId?: string;
}): Promise<unknown> {
  if (isDemoMode()) return { success: true, dryRun: true, ...body };
  return request('/tournaments/v2/report-match', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function tournamentV2Standings(tournamentId: string): Promise<unknown> {
  if (isDemoMode()) return { tournamentId, standings: [] };
  return request(`/tournaments/v2/standings/${encodeURIComponent(tournamentId)}`);
}

export async function tournamentV2Tv(tournamentId: string): Promise<unknown> {
  if (isDemoMode()) {
    return {
      type: 'tournament_tv',
      tournament: { id: tournamentId, name: 'Demo TV', game: '9-ball', mode: 'SINGLE_ELIMINATION', status: 'ACTIVE' },
      matches: [],
      standings: [],
      activeMatches: [],
      completedCount: 0,
    };
  }
  return request(`/tournaments/v2/tv/${encodeURIComponent(tournamentId)}`);
}

export async function tournamentV2AdminUpdateScore(body: {
  tournamentId: string;
  matchId: string;
  aScore: number;
  bScore: number;
}): Promise<unknown> {
  return request('/tournaments/v2/admin/update-score', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function tournamentV2AdminSwap(body: {
  tournamentId: string;
  matchId: string;
}): Promise<unknown> {
  return request('/tournaments/v2/admin/swap-players', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function tournamentV2AdminReseed(body: {
  tournamentId: string;
  seedStrategy?: 'manual' | 'random' | 'elo';
  force?: boolean;
}): Promise<unknown> {
  return request('/tournaments/v2/admin/reseed', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function tournamentV2AdvanceSwiss(tournamentId: string): Promise<unknown> {
  return request('/tournaments/v2/admin/advance-swiss', {
    method: 'POST',
    body: JSON.stringify({ tournamentId }),
  });
}

/** Scorekeeping health (observability) */
export async function fetchScorekeepingHealth(): Promise<{
  status: string;
  lastReport: unknown;
  pendingRealAiJobs: number;
  recentEventCount: number;
  entryPoint?: string;
}> {
  if (isDemoMode()) {
    return {
      status: 'ok',
      lastReport: null,
      pendingRealAiJobs: 0,
      recentEventCount: 0,
      entryPoint: 'ScorekeepingServiceV2.processReport',
    };
  }
  return request('/health/scorekeeping');
}

// --- Phase 3C deep scorekeeping / timelines ---

export async function scorekeepingStartTimeline(body: {
  matchId: string;
  domain: string;
  entityId?: string;
  hallId?: string;
  playerAId?: string;
  playerBId?: string;
  gameType?: string;
}): Promise<unknown> {
  if (isDemoMode()) return { matchId: body.matchId, events: [], domain: body.domain };
  return request('/scorekeeping/v2/timeline/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function scorekeepingAppendEvent(body: {
  matchId: string;
  type: string;
  domain?: string;
  playerId?: string;
  rack?: number;
  aScore?: number;
  bScore?: number;
  data?: Record<string, unknown>;
  note?: string;
  hallId?: string;
}): Promise<unknown> {
  if (isDemoMode()) return { matchId: body.matchId, events: [{ type: body.type }], dryRun: true };
  return request('/scorekeeping/v2/timeline/event', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function scorekeepingGetTimeline(matchId: string): Promise<unknown> {
  if (isDemoMode()) return { matchId, events: [], sotdCandidates: [] };
  return request(`/scorekeeping/v2/timeline/${encodeURIComponent(matchId)}`);
}

export async function scorekeepingSotdCandidates(): Promise<{
  day: string;
  count: number;
  candidates: unknown[];
}> {
  if (isDemoMode()) return { day: new Date().toISOString().slice(0, 10), count: 0, candidates: [] };
  return request('/scorekeeping/v2/sotd-candidates');
}

// --- RackUp Pyramid ---

export async function fetchPyramidPresets(): Promise<{
  gameStyle: string;
  rules: Record<string, string>;
  presets: Array<{
    tableSizeFt: number;
    skillLevel: string;
    rackBalls: number;
    pointsToWin: number;
    callShot: string;
    ratingWeight: number;
    label: string;
  }>;
}> {
  if (isDemoMode()) {
    return {
      gameStyle: 'rackup-pyramid',
      rules: {},
      presets: [
        {
          tableSizeFt: 7,
          skillLevel: 'INTERMEDIATE',
          rackBalls: 10,
          pointsToWin: 35,
          callShot: 'no',
          ratingWeight: 0.85,
          label: 'Demo',
        },
      ],
    };
  }
  return request('/matches/pyramid/presets');
}

export async function createPyramidMatch(body: {
  playerAId: string;
  playerBId: string;
  hallId?: string;
  tableSizeFt: 7 | 9;
  skillLevel: string;
}): Promise<unknown> {
  return request('/matches', {
    method: 'POST',
    body: JSON.stringify({
      playerAId: body.playerAId,
      playerBId: body.playerBId,
      hallId: body.hallId,
      game: 'rackup-pyramid',
      tableSizeFt: body.tableSizeFt,
      skillLevel: body.skillLevel,
    }),
  });
}

export async function fetchMatchScoreboard(matchId: string): Promise<unknown> {
  return request(`/matches/${encodeURIComponent(matchId)}/scoreboard`);
}

export async function pyramidPocketBalls(input: {
  matchId: string;
  playerId: string;
  balls: number[];
}): Promise<unknown> {
  return request(`/matches/${encodeURIComponent(input.matchId)}/pyramid/pocket`, {
    method: 'POST',
    body: JSON.stringify({ playerId: input.playerId, balls: input.balls }),
  });
}

/** ID bridge helpers (V1 ↔ V2) */
export async function resolveIdBridge(
  kind: 'league' | 'tournament',
  from: 'v1' | 'v2',
  id: string,
): Promise<{ kind: string; v1Id?: string; v2Id?: string; resolved: string }> {
  if (isDemoMode()) return { kind, resolved: id, v1Id: id, v2Id: id };
  return request(`/id-bridge/${kind}/${from}/${encodeURIComponent(id)}`);
}

// ─── ROC wallet / payments (USD ledger) ─────────────────────────────────────

export type RocWallet = {
  availableUsdCents: number;
  availableUsd: string;
  pendingUsdCents: number;
  pendingUsd: string;
  lifetimePaidOutUsdCents: number;
  lifetimePaidOutUsd: string;
  lifetimeEarnedUsdCents: number;
  lifetimeEarnedUsd: string;
  preferredPayoutMethod: 'stripe_bank' | 'usdc';
  usdcWalletAddress: string | null;
  stripeConnectAccountId: string | null;
  currency: 'USD';
  history: Array<{
    id: string;
    kind: 'payment_in' | 'payout_out';
    amountUsdCents: number;
    amountUsd: string;
    method: string;
    status: string;
    sessionId?: string | null;
    entryId?: string | null;
    rocLeagueId?: string;
    stripeRef?: string | null;
    place?: number;
    at: string;
  }>;
};

export async function fetchRocWallet(): Promise<RocWallet> {
  if (isDemoMode()) {
    return {
      availableUsdCents: 4500,
      availableUsd: '$45.00',
      pendingUsdCents: 1200,
      pendingUsd: '$12.00',
      lifetimePaidOutUsdCents: 20000,
      lifetimePaidOutUsd: '$200.00',
      lifetimeEarnedUsdCents: 24500,
      lifetimeEarnedUsd: '$245.00',
      preferredPayoutMethod: 'stripe_bank',
      usdcWalletAddress: null,
      stripeConnectAccountId: null,
      currency: 'USD',
      history: [
        {
          id: 'demo-1',
          kind: 'payout_out',
          amountUsdCents: 4500,
          amountUsd: '$45.00',
          method: 'wallet_credit',
          status: 'paid',
          at: new Date().toISOString(),
        },
      ],
    };
  }
  return request<RocWallet>('/roc/wallet');
}

export async function updateRocWalletPreferences(body: {
  preferredPayoutMethod?: 'stripe_bank' | 'usdc';
  usdcWalletAddress?: string | null;
  stripeConnectAccountId?: string | null;
}): Promise<{
  preferredPayoutMethod?: 'stripe_bank' | 'usdc';
  usdcWalletAddress?: string | null;
  stripeConnectAccountId?: string | null;
}> {
  if (isDemoMode()) return body;
  return request('/roc/wallet/preferences', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** Start Stripe Checkout / Payment Sheet for a ROC entry (USD only). */
export async function rocCheckout(body: {
  entryId: string;
  method: 'card' | 'apple_pay' | 'google_pay' | 'usdc';
  successUrl?: string;
  cancelUrl?: string;
}) {
  return request<{
    paymentId: string;
    amountUsd: string;
    checkoutUrl: string | null;
    clientSecret: string | null;
    splitPreview: { label: string };
  }>('/roc/checkout', { method: 'POST', body: JSON.stringify(body) });
}

/** Dev: confirm pay-in without Stripe webhook. */
export async function rocMockConfirmPayment(paymentId: string) {
  return request(`/roc/checkout/${paymentId}/mock-confirm`, { method: 'POST' });
}

export async function rocCreateLeague(body: { name: string; slug?: string }) {
  return request('/roc/leagues', { method: 'POST', body: JSON.stringify(body) });
}

export async function rocOperatorDashboard(leagueId: string) {
  return request(`/roc/leagues/${leagueId}/dashboard`);
}

export async function rocSessionProjections(sessionId: string) {
  return request(`/roc/sessions/${sessionId}/projections`);
}

export async function rocCloseSession(
  sessionId: string,
  body?: { acknowledgeWarnings?: boolean; overrideNote?: string },
) {
  return request(`/roc/sessions/${sessionId}/close`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

/** RealAI ledger_audit + payout_sanity (read-only). */
export async function rocRunSessionAudit(sessionId: string) {
  return request<{
    auditId: string;
    uiStatus: 'pass' | 'warnings' | 'blocked' | 'none';
    label?: string;
    plain_language: string[];
    canAutoPayout: boolean;
    blocked: boolean;
    authorize_payout: false;
  }>(`/roc/sessions/${sessionId}/audit`, { method: 'POST' });
}

export async function rocGetSessionAudit(sessionId: string) {
  return request(`/roc/sessions/${sessionId}/audit`);
}

/** Operator release after warnings (re-runs audit; blockers still hold). */
export async function rocReleasePayout(
  sessionId: string,
  overrideNote?: string,
) {
  return request(`/roc/sessions/${sessionId}/release-payout`, {
    method: 'POST',
    body: JSON.stringify({ overrideNote }),
  });
}

export const api = {
  getTournaments: async () => {
    return fetch('/api/tournaments').then((r) => r.json());
  },
  getTournament: async (id: string) => {
    return fetch(`/api/tournaments/${id}`).then((r) => r.json());
  },
  post: async (path: string, body: unknown) => {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    try {
      return await res.json();
    } catch {
      return null;
    }
  },
};


