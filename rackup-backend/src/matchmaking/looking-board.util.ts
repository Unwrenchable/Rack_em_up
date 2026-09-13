/**
 * Pure helpers for the Find "Available now" board.
 * Keep ranking / merge / expiry rules here so smoke tests do not need Postgres.
 */

export type LookingBoardRow = {
  id: string;
  user_id: string;
  game: string;
  stakes: string;
  min_rating: number;
  max_rating: number;
  distance_meters: number;
  ratingProximity: number;
  stakes_weight: number;
  rank_score: number;
  created_at: Date;
  expires_at: Date;
  source: 'v1' | 'v2';
};

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function avg(a: number, b: number): number {
  return (a + b) / 2;
}

export function rankLookingCandidate(input: {
  searchLat: number;
  searchLon: number;
  entityLat: number;
  entityLon: number;
  minRating: number;
  maxRating: number;
  stakes: string;
  desiredStakes?: string;
  desiredMinRating?: number;
  desiredMaxRating?: number;
}): {
  distanceMeters: number;
  ratingProximity: number;
  stakesWeight: number;
  rankScore: number;
} {
  const distanceMeters = haversineMeters(
    input.searchLat,
    input.searchLon,
    input.entityLat,
    input.entityLon,
  );
  const desiredRatingCenter = avg(
    input.desiredMinRating ?? 0,
    input.desiredMaxRating ?? 1000,
  );
  const candidateRatingCenter = avg(input.minRating, input.maxRating);
  const ratingProximity = Math.abs(candidateRatingCenter - desiredRatingCenter);
  const stakesWeight =
    input.desiredStakes && input.stakes === input.desiredStakes ? 0 : 1000;
  const rankScore =
    distanceMeters * 0.5 + ratingProximity * 0.3 + stakesWeight * 0.2;
  return { distanceMeters, ratingProximity, stakesWeight, rankScore };
}

/** One card per player — newest request wins when V1 + V2 both exist. */
export function mergeLookingByUser(rows: LookingBoardRow[]): LookingBoardRow[] {
  const byUser = new Map<string, LookingBoardRow>();
  for (const row of rows) {
    const prev = byUser.get(row.user_id);
    if (!prev || new Date(row.created_at).getTime() >= new Date(prev.created_at).getTime()) {
      byUser.set(row.user_id, row);
    }
  }
  return [...byUser.values()].sort((a, b) => a.rank_score - b.rank_score);
}

/**
 * Active looking rows must still be in the future.
 * The old createRequest lookup used `expiresAt < now+30min`, which matched
 * already-expired rows and hid them from GET /matchmaking/search.
 */
export function isLookingRequestActive(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() > now.getTime();
}

export const LOOKING_TTL_MS = 30 * 60 * 1000;
/** Cap the discovery board so polls do not hydrate every live row worldwide. */
export const LOOKING_BOARD_LIMIT = 50;
/** Vegas — same origin as rackup-web DEFAULT_FIND_ORIGIN. */
export const DEFAULT_SEARCH_ORIGIN = { lat: 36.1699, lon: -115.1398 };
/** Match Find discovery radius so a coord-less GET still sees the board. */
export const DEFAULT_SEARCH_RADIUS_M = 21_000_000;

/**
 * After V2 pairing, leftover V1 cards should drop off. A brand-new V2 PENDING
 * row (Go live again) must stay visible.
 */
export function keepDiscoverableRows(
  rows: LookingBoardRow[],
  recentlyMatchedUserIds: Set<string>,
): LookingBoardRow[] {
  return rows.filter(
    (row) => row.source !== 'v1' || !recentlyMatchedUserIds.has(row.user_id),
  );
}
