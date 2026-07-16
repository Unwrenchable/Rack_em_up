export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  reputation: number;
  rating: number;
};

export type LiveHall = {
  hallId: string;
  name: string;
  lat: number;
  lon: number;
  activePlayerCount: number;
  averageRating: number | null;
  gameTypes: string[];
  activeMatchCount: number;
  pulseStatus: 'BUSY' | 'MODERATE' | 'QUIET';
};

export type Hall = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string | null;
  tableCount: number | null;
  isVerified: boolean;
};

export type MatchMemory = {
  id: string;
  matchId: string;
  matchType: 'STANDARD' | 'TOURNAMENT' | 'MONEY';
  isWinner: boolean;
  game: string | null;
  raceTo: number | null;
  stakes: string | null;
  scoreline: Record<string, unknown> | null;
  highlightVideoUrls: string[];
  createdAt: string;
};

export type MoneyMatch = {
  id: string;
  playerAId: string;
  playerBId: string;
  hallId: string;
  game: string;
  raceTo: number;
  amountCents: number | string;
  livestreamUrl: string | null;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED';
  aConfirmed: boolean;
  bConfirmed: boolean;
  createdAt: string;
};

export type LookingPlayer = {
  id: string;
  displayName: string;
  rating: number;
  game: string;
  stakes: string;
  distanceKm: number;
  reputation: number;
};

export type Tournament = {
  id: string;
  name: string;
  format: string;
  game: string;
  status: string;
  startsAt: string;
  hallId?: string | null;
};

export type League = {
  id: string;
  name: string;
  game: string;
  season: string;
  status: string;
  hallId: string;
};

export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: string;
};

export type ActionPost = {
  id: string;
  authorId: string;
  body: string;
  game: string;
  stakes: string;
  isOpen: boolean;
  createdAt: string;
  authorName?: string;
};

export type FriendCard = {
  id: string;
  displayName: string;
  rating: number;
  status: 'online' | 'at_hall' | 'offline';
  hallName?: string;
};

export type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
  mine?: boolean;
};

export type Drill = {
  id: string;
  title: string;
  focus: string;
  minutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
};

export type Badge = {
  id: string;
  label: string;
  desc: string;
  earned: boolean;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: 'match' | 'money' | 'social' | 'system' | 'training';
};

export type TipZone =
  | 'center'
  | '12-high'
  | '6-low'
  | '3-right'
  | '9-left'
  | '1:30-high-right'
  | '10:30-high-left'
  | '4:30-low-right'
  | '7:30-low-left';

export type CatalogShot = {
  id: string;
  name: string;
  tagline: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  category: string;
  table: string;
  setup: string[];
  objectBall: string;
  pocket: string;
  tipZone: TipZone;
  tipDetail: string;
  english: string;
  elevation: string;
  speed: string;
  speedDetail: string;
  bridge: string;
  steps: string[];
  tips: string[];
  commonMistakes: string[];
  successLooksLike: string;
};

export type ShotOfTheDay = {
  date: string;
  cycleLength: number;
  daysUntilRepeat: number;
  positionInCycle: number;
  shot: CatalogShot;
  note: string;
};