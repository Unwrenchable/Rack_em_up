/**
 * Canonical Redis V2 key helpers — single source of truth.
 *
 * Prefixes:
 *   halls:v2:{hallId}:*
 *   tournaments:v2:{tournamentId}:*
 *   leagues:v2:{seasonId}:*
 *   matchmaking:v2:{queue|pending|active}:*
 *   realai:v2:{jobId}:*
 *   scorekeeping:v2:*
 *   audit:v2:money:*
 *   idbridge:v2:*
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
export function keyForMatchmakingV2(
  part: 'queue' | 'pending' | 'active' | string,
  suffix?: string,
): string {
  if (suffix) return `matchmaking:v2:${part}:${suffix}`;
  return `matchmaking:v2:${part}`;
}

export function keyForRealaiV2(jobId: string, suffix = 'job'): string {
  return `realai:v2:${jobId}:${suffix}`;
}

/** Pending RealAI summary job id set (for health / observability). */
export function keyForRealaiPendingJobs(): string {
  return 'realai:v2:pending_jobs';
}

export function keyForScorekeepingV2(suffix: string): string {
  return `scorekeeping:v2:${suffix}`;
}

/** Live match timeline (events list) under scorekeeping namespace. */
export function keyForMatchTimelineV2(matchId: string): string {
  return `scorekeeping:v2:timeline:${matchId}`;
}

export function keyForSotdCandidatesV2(day?: string): string {
  const d = day ?? new Date().toISOString().slice(0, 10);
  return `scorekeeping:v2:sotd_candidates:${d}`;
}

/** Money-match audit trail list (newest first). */
export function keyForMoneyAuditV2(matchId?: string): string {
  if (matchId) return `audit:v2:money:${matchId}`;
  return 'audit:v2:money:all';
}

export function keyForIdBridgeV2(kind: 'league' | 'tournament', side: 'v1' | 'v2', id: string): string {
  return `idbridge:v2:${kind}:${side}:${id}`;
}

/** Legacy keys still present in older code — prefer migrating via migrateLegacyRedisKeys. */
export const LEGACY_REDIS_KEYS = {
  mmQueue: 'mm:v2:queue',
  mmPending: 'mm:v2:pending',
  mmActive: 'mm:v2:active',
  hallsFeedPrefix: 'halls:v2:feed',
  hallsLeaderboardPrefix: 'halls:v2:leaderboard',
} as const;

/** Map of legacy key → canonical V2 key (for simple string renames). */
export const LEGACY_TO_CANONICAL: Array<{ legacy: string; canonical: string }> = [
  { legacy: LEGACY_REDIS_KEYS.mmQueue, canonical: keyForMatchmakingV2('queue') },
  { legacy: LEGACY_REDIS_KEYS.mmPending, canonical: keyForMatchmakingV2('pending') },
  { legacy: LEGACY_REDIS_KEYS.mmActive, canonical: keyForMatchmakingV2('active') },
];
