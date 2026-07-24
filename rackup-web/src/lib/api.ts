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

export async function fetchFriends(): Promise<FriendCard[]> {
  if (isDemoMode()) return DEMO_FRIENDS;
  try {
    const raw = await request<
      Array<{
        id: string;
        requesterId: string;
        addresseeId: string;
        status: string;
        createdAt: string;
      }>
    >('/friends');
    if (!Array.isArray(raw)) return [];
    const me = getStoredUser()?.id;
    const otherIds = raw.map((f) =>
      me && f.requesterId === me ? f.addresseeId : f.requesterId,
    );
    const profiles = await fetchUserProfiles(otherIds);
    return raw.map((f) => {
      const otherId = me && f.requesterId === me ? f.addresseeId : f.requesterId;
      const p = profiles.get(otherId);
      return {
        id: f.id,
        displayName: p?.displayName ?? `User ${otherId.slice(0, 6)}`,
        rating: p?.rating ?? 500,
        status: f.status === 'ACCEPTED' ? 'online' : 'offline',
      };
    });
  } catch {
    return [];
  }
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
        x: '0=head rail → 100=foot rail',
        y: '0=bottom long rail → 50=top long rail',
        units: 'normalized table percent (9-foot aspect 2:1)',
      },
      source: 'catalog_fallback',
      ascii_table:
        '┌───────────────────────────────────────┐\n│C            1                       O│\n│                                       │\n└───────────────────────────────────────┘\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path',
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


