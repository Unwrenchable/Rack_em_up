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
  Tournament,
  User,
} from './types';
import { DEMO_SHOT_OF_DAY } from './demo-shots';

const API = import.meta.env.VITE_API_URL ?? '/api/v1';
const TOKEN_KEY = 'rackup_token';
const USER_KEY = 'rackup_user';
const DEMO_KEY = 'rackup_demo';

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

export async function login(email: string, password: string) {
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

export async function signup(email: string, password: string, displayName: string) {
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

export async function fetchLiveHalls(): Promise<LiveHall[]> {
  if (isDemoMode()) return DEMO_HALLS_LIVE;
  try {
    return await request<LiveHall[]>('/halls/live');
  } catch {
    return DEMO_HALLS_LIVE;
  }
}

export async function fetchHalls(): Promise<Hall[]> {
  if (isDemoMode()) return DEMO_HALLS;
  try {
    return await request<Hall[]>('/halls');
  } catch {
    return DEMO_HALLS;
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
    return DEMO_MEMORIES;
  }
}

export async function fetchMoneyMatches(): Promise<MoneyMatch[]> {
  if (isDemoMode()) return DEMO_MONEY;
  try {
    return await request<MoneyMatch[]>('/money-matches');
  } catch {
    return DEMO_MONEY;
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
    await request('/matchmaking/search?lat=36.17&lon=-115.14&radiusKm=20&game=9-ball');
    return DEMO_PLAYERS;
  } catch {
    return DEMO_PLAYERS;
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
    return DEMO_TOURNAMENTS;
  }
}

export async function fetchLeagues(): Promise<League[]> {
  if (isDemoMode()) return DEMO_LEAGUES;
  try {
    return await request<League[]>('/leagues');
  } catch {
    return DEMO_LEAGUES;
  }
}

export async function fetchFriends(): Promise<FriendCard[]> {
  if (isDemoMode()) return DEMO_FRIENDS;
  try {
    await request('/friends');
    return DEMO_FRIENDS;
  } catch {
    return DEMO_FRIENDS;
  }
}

export async function fetchActionBoard(): Promise<ActionPost[]> {
  if (isDemoMode()) return DEMO_ACTION;
  try {
    return await request<ActionPost[]>('/action-board');
  } catch {
    return DEMO_ACTION;
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
    return { drills: DEMO_DRILLS, provider: 'demo-fallback' };
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
    return DEMO_NOTIFICATIONS;
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
    return DEMO_SHOT_OF_DAY;
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

export function wsUrl(): string {
  return import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';
}