/**
 * Frame / rack-level scorekeeping events for deep match timelines.
 * Used by Scorekeeping V2, RealAI match-summary, and SOTD candidate detection.
 */

export type MatchTimelineEventType =
  | 'match_start'
  | 'break'
  | 'rack_start'
  | 'rack_won'
  | 'foul'
  | 'safety'
  | 'miss'
  | 'shot'
  | 'ball_pocketed'
  | 'timeout'
  | 'score_tick'
  | 'sotd_candidate'
  | 'note'
  | 'match_end';

export type MatchTimelineEvent = {
  id: string;
  type: MatchTimelineEventType;
  at: string;
  /** Player who performed / caused the event */
  playerId?: string | null;
  rack?: number | null;
  /** Running score after event (optional) */
  aScore?: number | null;
  bScore?: number | null;
  /** Free-form payload (ball numbers, foul code, path hint, etc.) */
  data?: Record<string, unknown> | null;
  /** Human-readable note */
  note?: string | null;
};

export type MatchTimelineDomain = 'standard' | 'money' | 'tournament_v2' | 'league_v2';

export type MatchTimeline = {
  matchId: string;
  domain: MatchTimelineDomain;
  entityId?: string | null;
  hallId?: string | null;
  playerAId?: string | null;
  playerBId?: string | null;
  gameType?: string | null;
  events: MatchTimelineEvent[];
  sotdCandidates: string[];
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
};

export type AppendTimelineEventInput = {
  matchId: string;
  domain?: MatchTimelineDomain;
  entityId?: string | null;
  hallId?: string | null;
  playerAId?: string | null;
  playerBId?: string | null;
  gameType?: string | null;
  type: MatchTimelineEventType;
  playerId?: string | null;
  rack?: number | null;
  aScore?: number | null;
  bScore?: number | null;
  data?: Record<string, unknown> | null;
  note?: string | null;
};

/** Heuristic: events that look like Shot-of-the-Day candidates. */
export function isSotdCandidateEvent(ev: MatchTimelineEvent): boolean {
  if (ev.type === 'sotd_candidate') return true;
  if (ev.type === 'shot' && ev.data?.difficulty === 'hard') return true;
  if (ev.type === 'shot' && ev.data?.combo === true) return true;
  if (ev.type === 'shot' && ev.data?.bank === true) return true;
  if (ev.type === 'shot' && ev.data?.jump === true) return true;
  if (ev.type === 'ball_pocketed' && Number(ev.data?.ballsInShot ?? 0) >= 2) return true;
  return false;
}

export function summarizeTimelineForRealAi(timeline: MatchTimeline | null): {
  eventCount: number;
  racks: number;
  fouls: number;
  sotdCandidates: number;
  keyShots: Array<Record<string, unknown>>;
  timelineSnippet: MatchTimelineEvent[];
} {
  if (!timeline || !timeline.events.length) {
    return {
      eventCount: 0,
      racks: 0,
      fouls: 0,
      sotdCandidates: 0,
      keyShots: [],
      timelineSnippet: [],
    };
  }

  const events = timeline.events;
  const racks = events.filter((e) => e.type === 'rack_won').length;
  const fouls = events.filter((e) => e.type === 'foul').length;
  const candidates = events.filter(isSotdCandidateEvent);
  const keyShots = candidates.slice(-8).map((e) => ({
    type: e.type,
    at: e.at,
    playerId: e.playerId,
    rack: e.rack,
    data: e.data,
    note: e.note,
  }));

  return {
    eventCount: events.length,
    racks,
    fouls,
    sotdCandidates: candidates.length,
    keyShots,
    timelineSnippet: events.slice(-40),
  };
}
