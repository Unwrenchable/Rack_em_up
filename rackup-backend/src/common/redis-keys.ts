/**
 * Canonical Redis V2 key helpers.
 *
 * Prefixes:
 *   halls:v2:{hallId}:*
 *   tournaments:v2:{tournamentId}:*
 *   leagues:v2:{seasonId}:*
 *   matchmaking:v2:{sessionId|queue}:*
 *   realai:v2:{jobId}:*
 *   scorekeeping:v2:*
 */

export function keyForHallV2(hallId: string, suffix: string): string {
  return `halls:v2:${hallId}:${suffix}`;
}

export function keyForTournamentV2(tournamentId: string, suffix: string): string {
  return `tournaments:v2:${tournamentId}:${suffix}`;
}

export function keyForLeagueV2(seasonId: string, suffix: string): string {
  return `leagues:v2:${seasonId}:${suffix}`;
}

/** Matchmaking queue / pending / active session keys. */
export function keyForMatchmakingV2(part: 'queue' | 'pending' | 'active' | string, suffix?: string): string {
  if (suffix) return `matchmaking:v2:${part}:${suffix}`;
  return `matchmaking:v2:${part}`;
}

export function keyForRealaiV2(jobId: string, suffix = 'job'): string {
  return `realai:v2:${jobId}:${suffix}`;
}

export function keyForScorekeepingV2(suffix: string): string {
  return `scorekeeping:v2:${suffix}`;
}

/** Legacy keys still present in older code — prefer migrating to helpers above. */
export const LEGACY_REDIS_KEYS = {
  mmQueue: 'mm:v2:queue',
  mmPending: 'mm:v2:pending',
  mmActive: 'mm:v2:active',
  hallsFeedPrefix: 'halls:v2:feed',
  hallsLeaderboardPrefix: 'halls:v2:leaderboard',
} as const;
