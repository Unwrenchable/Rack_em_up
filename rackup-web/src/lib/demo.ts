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
  Tournament,
  User,
} from './types';

export const DEMO_USER: User = {
  id: 'demo-user-1',
  email: 'ace@rackup.pool',
  displayName: 'Ace Delgado',
  role: 'USER',
  reputation: 92,
  rating: 612,
};

export const DEMO_HALLS_LIVE: LiveHall[] = [
  {
    hallId: 'h1',
    name: 'Midnight Rack',
    lat: 36.17,
    lon: -115.14,
    activePlayerCount: 14,
    averageRating: 548,
    gameTypes: ['9-ball', 'One-pocket'],
    activeMatchCount: 4,
    pulseStatus: 'BUSY',
  },
  {
    hallId: 'h2',
    name: 'Felt & Fortune',
    lat: 36.12,
    lon: -115.17,
    activePlayerCount: 6,
    averageRating: 490,
    gameTypes: ['8-ball', '9-ball'],
    activeMatchCount: 1,
    pulseStatus: 'MODERATE',
  },
  {
    hallId: 'h3',
    name: 'Southside Billiards',
    lat: 36.09,
    lon: -115.2,
    activePlayerCount: 2,
    averageRating: 420,
    gameTypes: ['8-ball'],
    activeMatchCount: 0,
    pulseStatus: 'QUIET',
  },
  {
    hallId: 'h4',
    name: 'Diamond Room',
    lat: 36.14,
    lon: -115.11,
    activePlayerCount: 9,
    averageRating: 580,
    gameTypes: ['10-ball', '9-ball'],
    activeMatchCount: 2,
    pulseStatus: 'BUSY',
  },
];

export const DEMO_HALLS: Hall[] = DEMO_HALLS_LIVE.map((h) => ({
  id: h.hallId,
  name: h.name,
  lat: h.lat,
  lon: h.lon,
  address: `${h.name} · Las Vegas`,
  tableCount: h.hallId === 'h1' ? 18 : 12,
  isVerified: h.pulseStatus !== 'QUIET',
}));

// backwards compat for older imports
export const DEMO_HALLS_PULSE = DEMO_HALLS_LIVE;

export const DEMO_PLAYERS: LookingPlayer[] = [
  {
    id: 'p1',
    displayName: 'VegasVee',
    rating: 640,
    game: '9-ball',
    stakes: '$100/game',
    distanceKm: 1.2,
    reputation: 88,
  },
  {
    id: 'p2',
    displayName: 'BankShot_B',
    rating: 575,
    game: 'One-pocket',
    stakes: 'Race to 5 · $50',
    distanceKm: 2.8,
    reputation: 95,
  },
  {
    id: 'p3',
    displayName: 'SoftBreak',
    rating: 510,
    game: '8-ball',
    stakes: 'Casual',
    distanceKm: 0.6,
    reputation: 80,
  },
  {
    id: 'p4',
    displayName: 'RailRunner',
    rating: 700,
    game: '10-ball',
    stakes: 'Race to 7 · $200',
    distanceKm: 4.1,
    reputation: 91,
  },
];

export const DEMO_MEMORIES: MatchMemory[] = [
  {
    id: 'm1',
    matchId: 'match-1',
    matchType: 'MONEY',
    isWinner: true,
    game: '9-ball',
    raceTo: 7,
    stakes: '15000',
    scoreline: { score: 7, opponentScore: 4 },
    highlightVideoUrls: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'm2',
    matchId: 'match-2',
    matchType: 'TOURNAMENT',
    isWinner: false,
    game: '8-ball',
    raceTo: 5,
    stakes: null,
    scoreline: { a: 3, b: 5 },
    highlightVideoUrls: [],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'm3',
    matchId: 'match-3',
    matchType: 'STANDARD',
    isWinner: true,
    game: 'One-pocket',
    raceTo: 4,
    stakes: null,
    scoreline: { score: 4, opponentScore: 2 },
    highlightVideoUrls: [],
    createdAt: new Date(Date.now() - 400000000).toISOString(),
  },
];

export const DEMO_MONEY: MoneyMatch[] = [
  {
    id: 'mm1',
    playerAId: 'demo-user-1',
    playerBId: 'p1',
    hallId: 'h1',
    game: '9-ball',
    raceTo: 9,
    amountCents: 25000,
    livestreamUrl: null,
    status: 'ACTIVE',
    aConfirmed: true,
    bConfirmed: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mm2',
    playerAId: 'p2',
    playerBId: 'demo-user-1',
    hallId: 'h2',
    game: 'One-pocket',
    raceTo: 5,
    amountCents: 10000,
    livestreamUrl: null,
    status: 'PENDING',
    aConfirmed: true,
    bConfirmed: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const DEMO_TOURNAMENTS: Tournament[] = [
  {
    id: 't1',
    name: 'Thursday 9-Ball Open',
    format: 'SINGLE_ELIM',
    game: '9-ball',
    status: 'ACTIVE',
    startsAt: new Date(Date.now() + 3600000 * 5).toISOString(),
    hallId: 'h1',
  },
  {
    id: 't2',
    name: 'Midnight Rack Classic',
    format: 'DOUBLE_ELIM',
    game: '8-ball',
    status: 'DRAFT',
    startsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    hallId: 'h1',
  },
  {
    id: 't3',
    name: 'Diamond Room 10-Ball',
    format: 'SINGLE_ELIM',
    game: '10-ball',
    status: 'ACTIVE',
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    hallId: 'h4',
  },
];

export const DEMO_LEAGUES: League[] = [
  {
    id: 'l1',
    name: 'Vegas Monday Night',
    game: '9-ball',
    season: 'Spring 2026',
    status: 'ACTIVE',
    hallId: 'h1',
  },
  {
    id: 'l2',
    name: 'Southside Scotch Doubles',
    game: '8-ball',
    season: 'Spring 2026',
    status: 'ACTIVE',
    hallId: 'h3',
  },
];

export const DEMO_FRIENDS: FriendCard[] = [
  {
    id: 'p1',
    displayName: 'VegasVee',
    rating: 640,
    status: 'at_hall',
    hallName: 'Midnight Rack',
  },
  {
    id: 'p2',
    displayName: 'BankShot_B',
    rating: 575,
    status: 'online',
  },
  {
    id: 'p3',
    displayName: 'SoftBreak',
    rating: 510,
    status: 'offline',
  },
  {
    id: 'p4',
    displayName: 'RailRunner',
    rating: 700,
    status: 'online',
  },
];

export const DEMO_ACTION: ActionPost[] = [
  {
    id: 'a1',
    authorId: 'p1',
    authorName: 'VegasVee',
    body: 'Looking for race to 7 · 9-ball · $100/game. Soft players only — let’s run it.',
    game: '9-ball',
    stakes: 'big_money',
    isOpen: true,
    createdAt: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'a2',
    authorId: 'p2',
    authorName: 'BankShot_B',
    body: 'One-pocket practice partner at Felt & Fortune. No money, just work.',
    game: 'One-pocket',
    stakes: 'casual',
    isOpen: true,
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
];

export const DEMO_DRILLS: Drill[] = [
  {
    id: 'd1',
    title: 'Long straight stun',
    focus: 'Cue ball control',
    minutes: 12,
    difficulty: 'Medium',
    description: '15 straight-ins from the spot. Leave the CB within a hand-span of the center diamond.',
  },
  {
    id: 'd2',
    title: 'Bank ladder',
    focus: 'Banks',
    minutes: 10,
    difficulty: 'Hard',
    description: 'Cross-corner banks from 5 positions. Track make %. Stop at 8/10.',
  },
  {
    id: 'd3',
    title: 'Break box',
    focus: 'Break',
    minutes: 8,
    difficulty: 'Easy',
    description: '10 breaks. Count table runs and second-ball pocket. Film one for review.',
  },
];

export const DEMO_BADGES: Badge[] = [
  { id: 'b1', label: 'Money Match Beast', desc: '5 verified money wins', earned: true },
  { id: 'b2', label: 'Hall Regular', desc: '10 check-ins same hall', earned: true },
  { id: 'b3', label: 'Clutch King', desc: 'Win from hill-hill', earned: false },
  { id: 'b4', label: 'Sportsman', desc: '10 positive ratings', earned: true },
  { id: 'b5', label: 'No-Show Zero', desc: '20 shows in a row', earned: false },
];

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'VegasVee confirmed',
    body: 'Your $250 race is ACTIVE at Midnight Rack.',
    time: '12m ago',
    read: false,
    kind: 'money',
  },
  {
    id: 'n2',
    title: 'Hall Pulse',
    body: '14 players at Midnight Rack right now.',
    time: '40m ago',
    read: false,
    kind: 'match',
  },
  {
    id: 'n3',
    title: 'Friend online',
    body: 'BankShot_B just came online.',
    time: '2h ago',
    read: true,
    kind: 'social',
  },
];

