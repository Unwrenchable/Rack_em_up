/**
 * Normalized match report payload — single shape for all report domains.
 * Domain services persist domain state, then call ScorekeepingServiceV2.processReport.
 */

export type MatchReportDomain = 'standard' | 'money' | 'tournament_v2' | 'league_v2';

export type MatchReportPayload = {
  domain: MatchReportDomain;
  /** Domain match / scheduled-match id */
  matchId: string;
  /**
   * Parent entity: for standard/money = matchId;
   * tournament_v2 = tournament id; league_v2 = season id.
   */
  entityId: string;
  playerAId: string;
  playerBId: string;
  aScore: number;
  bScore: number;
  winnerId: string | null;
  gameType?: string;
  hallId?: string | null;
  raceTo?: number;
  /** Stakes string (e.g. amountCents) for money memories */
  stakes?: string;
  /** Skip Elo when domain already applied (prefer false — V2 owns Elo) */
  skipElo?: boolean;
  /** Skip memories when not applicable (e.g. some league paths) */
  skipMemories?: boolean;
  correlationId?: string;
  /** Optional reporter for audit */
  reportingPlayerId?: string;
  /**
   * Elo K multiplier (shared ladder). Pyramid skill weights: 0.7–1.15.
   * Default 1.0 for standard 8/9/10-ball. Passed to RealAI rating_update.
   */
  ratingWeight?: number;
  /** Pyramid / match table size for RealAI (`7ft` | `9ft`). */
  tableSize?: string;
  /** Skill band for RealAI (`beginner` | `intermediate` | …). */
  skillLevel?: string;
  forfeit?: boolean;
  /** ROC / match context for Glicko rating_update payload */
  format?: string;
  sessionId?: string;
  rocLeagueId?: string;
};

export type ProcessReportResult = {
  matchId: string;
  domain: MatchReportDomain;
  eloApplied: boolean;
  memoriesCreated: boolean;
  realaiJobId: string | null;
  redisEventEmitted: boolean;
  socketEmitted: boolean;
  auditWritten: boolean;
  timelineFinalized: boolean;
  timelineEventCount: number;
  sotdCandidateCount: number;
  occurredAt: string;
};
