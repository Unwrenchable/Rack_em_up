export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  reputation: number;
  /** ROC Glicko-2 continuous rating */
  rating: number;
  rd?: number;
  volatility?: number;
  matches?: number;
  band?: string;
  /** e.g. "Advanced • 547" from RealAI / RackUp public payload */
  ratingDisplay?: string;
  ladder?: 'roc_glicko2';
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
  ownerUserId?: string | null;
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
  /** Phase 3D escrow */
  escrowStatus?: 'NONE' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED';
  escrowProvider?: string | null;
  escrowExternalId?: string | null;
  /** Phase 2 dual result confirm stores pendingResult until both players agree */
  resultJson?: {
    pendingResult?: {
      aScore: number;
      bScore: number;
      confirmedBy: string[];
      proposedAt?: string;
      proposedBy?: string;
    };
    dualConfirmed?: boolean;
    aScore?: number;
    bScore?: number;
    [key: string]: unknown;
  } | null;
};

export type LookingPlayer = {
  id: string;
  userId: string;
  displayName: string;
  rating: number;
  game: string;
  stakes: string;
  distanceKm: number;
  reputation: number;
  avatarUrl?: string | null;
  source?: 'v1' | 'v2';
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

export type FriendshipStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'BLOCKED'
  | 'CANCELLED';

export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
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

/** Friend list row from GET /friends (hydrated with presence). */
export type FriendCard = {
  id: string;
  friendshipId?: string;
  displayName: string;
  rating: number;
  status: 'online' | 'at_hall' | 'offline';
  hallName?: string;
  avatarUrl?: string | null;
  lastSeenAt?: string | null;
  mutualCount?: number;
};

export type FriendListItem = {
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

export type ChatThread = {
  id: string;
  kind: 'DM' | 'GROUP';
  title: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdById: string;
};

export type ThreadMessage = {
  id: string;
  threadId: string;
  senderId: string;
  type: string;
  body: string | null;
  payloadJson?: Record<string, unknown> | null;
  createdAt: string;
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

export type SotdPoint = { x: number; y: number };

/**
 * Rare map pin for Ghost Ball. Default is SPA derive (`showGhost`, offset 4.4).
 * Emit only when live derive would be wrong. Cloth coords 0–100 / 0–50.
 */
export type SotdGhostBall = SotdPoint & {
  /** Draw radius in cloth units; omit → SVG table ballR. Never 4.4/2. */
  radius?: number;
  /** Omit → SPA derive (`showGhost`). */
  show?: boolean;
};

export type SotdObjectBall = SotdPoint & {
  ballId: number;
  role?: 'object' | 'blocker' | 'prop' | 'helper';
};

export type SotdPathStyle = 'solid' | 'dashed';
export type SotdPathKind = 'ground' | 'airborne' | 'object' | 'cue_after';

export type SotdPathSegment = {
  from: SotdPoint;
  to: SotdPoint;
  style?: SotdPathStyle;
  kind?: SotdPathKind;
};

export type SotdShotMap = {
  id: string;
  name: string;
  difficulty: string;
  difficulty_rating: number;
  category: string;
  speed_category: string;
  tip_zone: string;
  cue_ball_start: SotdPoint;
  object_ball_positions: SotdObjectBall[];
  intended_path: SotdPathSegment[];
  english: {
    tip_zone: string;
    sidespin: number;
    backspin: number;
    follow: number;
    label: string;
  };
  landing_zones: Array<SotdPoint & { label: string }>;
  pocket_target: SotdPoint;
  /** Rare pin — omit so SPA derives ghost = OB − normalize(aim − OB)×4.4 */
  ghost_ball?: SotdGhostBall;
  /** Rare pin — omit so SPA uses midpoint(ghost, OB). */
  contact_point?: SotdPoint;
  coordinate_system: { x: string; y: string; units: string };
  source: 'catalogue' | 'realai';
  ascii_table: string;
  realaiReachable?: boolean;
};

/**
 * Unified Player Card (console/coach). Separate continua — do not mix with
 * `User.rating` (ROC Glicko-2). Profile/Find/MM UI is wired by ROC on main.
 */
export type RackupShadow = {
  rating: number;
  robustness: number;
  provisional: boolean;
  confidence_low: number;
  confidence_high: number;
  official: false;
  source: 'rackup_glicko_shadow';
  label: string;
};

export type RackupLadderStats = {
  rating: number;
  rd: number;
  volatility: number;
  matches: number;
  band: string;
  display: string;
  ladder: 'roc_glicko2';
  last_match_delta?: number | null;
  wins?: number;
  losses?: number;
  completed_matches?: number;
};

export type TapStats = {
  skill?: number | null;
  charter_points?: number | null;
  division?: string | null;
  notes?: string | null;
  imported_at?: string | null;
  raw?: Record<string, unknown> | null;
};

export type UnifiedPlayerCard = {
  player: {
    name: string;
    apa_sl: number | null;
    fargo_rating: number | null;
    fargo_robustness: number | null;
    bca_elo: number | null;
    tap_stats: TapStats | null;
    rackup_stats: RackupLadderStats | null;
    unified_id: string;
    rackup_shadow: RackupShadow | null;
    fargo_id?: string | null;
    fargo_readable_id?: string | null;
    apa_member_id?: string | null;
    bca_id?: string | null;
    tap_id?: string | null;
  };
  display: {
    fargo: string | null;
    rackup_shadow: string | null;
    disclaimer: string;
  };
  meta: {
    user_id: string | null;
    fargo_fetched_at: string | null;
    shadow_computed_at: string | null;
    resolve_method?: string;
    notes: string[];
  };
};
