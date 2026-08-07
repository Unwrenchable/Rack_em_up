/**
 * RealAI rackup-coach client — production intelligence provider.
 *
 * Contract: REALAI_RACKUP_WIRING_CONTRACT.md (v1.0.0)
 * Canonical: POST {REALAI_BASE_URL}/v1/plugins/rackup-coach
 * Alias:     POST {REALAI_BASE_URL}/v1/rackup/coach
 *
 * RackUp owns persistence/UI; RealAI owns skill math, moderation, coaching, SOTD, Pyramid rules.
 */

import { randomUUID } from 'crypto';

// ─── Envelope types ─────────────────────────────────────────────────────────

export type RackUpCoachAbility =
  | 'rating_update'
  | 'skill_update'
  | 'post_match_rating'
  | 'rating_convert'
  | 'convert_rating'
  | 'league_convert'
  | 'matchmaking'
  | 'matchmaking_support'
  | 'league_validate'
  | 'league_score'
  | 'score_validate'
  | 'moderation'
  | 'moderate'
  | 'chat_moderation'
  | 'coach'
  | 'pyramid'
  | 'video_analysis'
  | 'shot_of_the_day'
  | 'sotd'
  | 'pyramid_rules'
  | 'sotd_contribute'
  | 'rating_intel'
  | 'tournament'
  | 'hall_context'
  | 'ledger_audit'
  | 'payout_sanity'
  | 'money_anomaly';

export type RackUpPlayerContext = {
  player_id: string;
  display_name?: string;
  rating?: number;
  /** Glicko-2 RD */
  rd?: number;
  /** Glicko-2 volatility σ */
  volatility?: number;
  matches_played_rackup?: number;
  rating_system?: string;
  discipline?: string;
  preferred_hand?: string;
  weaknesses?: string[];
  strengths?: string[];
  recent_results?: Array<Record<string, unknown>>;
  session_stats?: Record<string, unknown>;
  history_notes?: string[];
  hall_id?: string;
  hall_name?: string;
  table_speed?: string;
  locale?: string;
  table_size?: string;
  skill_level?: string;
  pyramid_skill?: string;
  pyramid_score?: number;
  pyramid_opp_score?: number;
  league_ratings?: Record<string, unknown>;
  primary_rating_system?: string;
};

/** One side of a Glicko-2 update (from RealAI result). */
export type GlickoPlayerAfter = {
  player_id: string;
  rating: number;
  rd: number;
  volatility: number;
  band?: string;
  display?: string;
};

export type RackUpCoachRequest = {
  ability: RackUpCoachAbility | string;
  goal?: string;
  organs_enabled?: boolean;
  player: RackUpPlayerContext;
  payload?: Record<string, unknown>;
};

export type RackUpOrganTrace = {
  organ_id: string;
  ok: boolean;
  notes?: string;
  output?: unknown;
};

export type RackUpCoachResponse = {
  ok: boolean;
  plugin?: string;
  ability?: string;
  result: Record<string, unknown> | null;
  organ_trace?: RackUpOrganTrace[];
  notes?: string;
  error?: string | null;
};

export type ModerationAction =
  | 'allow'
  | 'soft_filter'
  | 'warn'
  | 'warn_and_flag'
  | 'hold_for_review'
  | 'block_and_escalate';

export type ModerationResult = {
  clean: boolean;
  action: ModerationAction;
  severity?: number;
  severity_label?: string;
  guidance?: string;
  categories?: Record<string, boolean>;
  coach_redirect?: string;
  policy_tags?: string[];
  text_preview?: string;
  player_id?: string;
};

export type RatingUpdateResult = {
  player_id: string;
  algorithm?: string;
  ladder?: string;
  rating_after: number;
  rd_after?: number;
  volatility_after?: number;
  rating_before?: number;
  rd_before?: number;
  display_before?: string;
  display_after?: string;
  band?: string;
  weighted_delta?: number;
  raw_delta?: number;
  band_after?: string;
  band_before?: string;
  band_changed?: boolean;
  skill_signals?: Record<string, unknown>;
  input?: Record<string, unknown>;
  persist_hint?: Record<string, unknown>;
  /** Dual-side payload when RealAI returns both players in one call */
  winner_after?: GlickoPlayerAfter;
  loser_after?: GlickoPlayerAfter;
  player_after?: GlickoPlayerAfter;
  deltas?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

export type RatingConvertResult = {
  rackup_rating_estimate: number;
  band_label?: string;
  display?: string;
  confidence?: number;
  ladder?: string;
  glicko2_seed?: {
    rating: number;
    rd: number;
    volatility: number;
    band?: string;
    display?: string;
    method?: string;
  };
  seed_hint?: Record<string, unknown>;
  equivalents?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

// ─── Config ─────────────────────────────────────────────────────────────────

function baseUrl(): string {
  return (process.env.REALAI_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
}

function apiKey(): string | undefined {
  return process.env.REALAI_API_KEY || undefined;
}

function coachPath(): string {
  // Canonical path per contract §1.2
  return process.env.REALAI_COACH_PATH ?? '/v1/plugins/rackup-coach';
}

function tenant(): string | undefined {
  return process.env.RACKUP_TENANT || process.env.REALAI_TENANT || undefined;
}

function timeoutMs(): number {
  const n = Number(process.env.REALAI_TIMEOUT_MS ?? 20_000);
  return Number.isFinite(n) && n > 1000 ? n : 20_000;
}

/** When true, Nest may fall back to local Elo if RealAI is down (dev only). */
export function allowLocalEloFallback(): boolean {
  return (
    process.env.REALAI_FALLBACK_LOCAL_ELO === '1' ||
    process.env.REALAI_FALLBACK_LOCAL_ELO === 'true'
  );
}

// ─── Core invoke ────────────────────────────────────────────────────────────

export class RealAiCoachError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'RealAiCoachError';
  }
}

/**
 * Invoke rackup-coach once. Throws on transport / non-2xx.
 * Contract: HTTP 200 with ok:false is a logical failure — returned, not thrown.
 */
export async function invokeRackupCoach(
  body: RackUpCoachRequest,
  opts?: { requestId?: string; retries?: number },
): Promise<RackUpCoachResponse> {
  const retries = opts?.retries ?? 1;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await invokeOnce(body, opts?.requestId ?? randomUUID());
    } catch (e) {
      lastErr = e;
      if (attempt >= retries) break;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new RealAiCoachError(String(lastErr));
}

async function invokeOnce(
  body: RackUpCoachRequest,
  requestId: string,
): Promise<RackUpCoachResponse> {
  const url = `${baseUrl()}${coachPath()}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
    'X-Provider': 'realai',
  };
  const key = apiKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  const t = tenant();
  if (t) headers['X-RackUp-Tenant'] = t;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(timeoutMs()),
    body: JSON.stringify({
      organs_enabled: body.organs_enabled ?? true,
      ...body,
      payload: body.payload ?? {},
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new RealAiCoachError(
      `RealAI coach HTTP ${res.status}: ${text.slice(0, 240)}`,
      res.status,
      text,
    );
  }

  const json = (await res.json()) as RackUpCoachResponse;
  if (json == null || typeof json !== 'object') {
    throw new RealAiCoachError('RealAI coach returned non-object body');
  }
  // Normalize missing fields
  return {
    ok: Boolean(json.ok),
    plugin: json.plugin ?? 'rackup-coach',
    ability: json.ability ?? String(body.ability),
    result: (json.result as Record<string, unknown>) ?? null,
    organ_trace: json.organ_trace,
    notes: json.notes,
    error: json.error ?? null,
  };
}

/** Best-effort invoke; returns null on transport failure. */
export async function invokeRackupCoachSafe(
  body: RackUpCoachRequest,
  opts?: { requestId?: string },
): Promise<RackUpCoachResponse | null> {
  try {
    return await invokeRackupCoach(body, { ...opts, retries: 1 });
  } catch {
    return null;
  }
}

// ─── Ability helpers ────────────────────────────────────────────────────────

function parseGlickoSide(
  raw: unknown,
  fallbackId: string,
): GlickoPlayerAfter | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const rating = Number(o.rating ?? o.rating_after);
  if (!Number.isFinite(rating)) return undefined;
  return {
    player_id: String(o.player_id ?? fallbackId),
    rating,
    rd: Number.isFinite(Number(o.rd ?? o.rd_after))
      ? Number(o.rd ?? o.rd_after)
      : 175,
    volatility: Number.isFinite(Number(o.volatility ?? o.vol ?? o.sigma))
      ? Number(o.volatility ?? o.vol ?? o.sigma)
      : 0.06,
    band: (o.band as string) ?? (o.band_label as string) ?? undefined,
    display: (o.display as string) ?? (o.display_after as string) ?? undefined,
  };
}

/**
 * Glicko-2 rating_update — RealAI owns math (ROC_GLICKO2_RATING_CONTRACT).
 * Pass rating, rd, volatility on every rated call when known.
 */
export async function realaiRatingUpdate(input: {
  player: RackUpPlayerContext;
  opponent_id?: string;
  opponent_rating: number;
  opponent_rd?: number;
  opponent_volatility?: number;
  won: boolean;
  game?: string;
  game_style?: string;
  format?: string;
  table_size?: string;
  skill_level?: string;
  my_score?: number;
  opp_score?: number;
  rating_weight?: number;
  provisional?: boolean;
  forfeit?: boolean;
  margin?: number;
  match_id?: string;
  session_id?: string;
  roc_league_id?: string;
  player_ids_json?: string[];
}): Promise<RatingUpdateResult> {
  const res = await invokeRackupCoach({
    ability: 'rating_update',
    player: {
      ...input.player,
      rating_system: input.player.rating_system ?? 'rackup',
      matches_played_rackup: input.player.matches_played_rackup,
    },
    payload: {
      opponent_id: input.opponent_id,
      opponent_rating: input.opponent_rating,
      opponent_rd: input.opponent_rd,
      opponent_volatility: input.opponent_volatility,
      opp_rating: input.opponent_rating,
      opp_rd: input.opponent_rd,
      won: input.won,
      game: input.game ?? input.player.discipline ?? 'eight_ball',
      game_style:
        input.game_style ?? input.game ?? input.player.discipline ?? 'eight_ball',
      format: input.format ?? 'SINGLES',
      table_size: input.table_size ?? input.player.table_size,
      skill_level: input.skill_level ?? input.player.skill_level,
      my_score: input.my_score,
      opp_score: input.opp_score,
      provisional: input.provisional ?? false,
      forfeit: input.forfeit ?? false,
      margin: input.margin,
      rating_weight: input.rating_weight,
      match_id: input.match_id,
      session_id: input.session_id,
      roc_league_id: input.roc_league_id,
      player_ids_json: input.player_ids_json,
      ladder: 'roc_glicko2',
      algorithm: 'glicko2_v1',
    },
  });

  if (!res.ok || !res.result) {
    throw new RealAiCoachError(
      res.error ?? 'rating_update failed',
      undefined,
      res,
    );
  }

  const r = res.result;
  const playerAfter =
    parseGlickoSide(r.player_after, input.player.player_id) ??
    parseGlickoSide(r.winner_after, input.player.player_id) ??
    parseGlickoSide(r.loser_after, input.player.player_id);

  const writeHint = (r.persist_hint as { write_value?: Record<string, unknown> } | undefined)
    ?.write_value;

  const ratingAfter = Number(
    playerAfter?.rating ?? writeHint?.rating ?? r.rating_after,
  );
  if (!Number.isFinite(ratingAfter)) {
    throw new RealAiCoachError('rating_update missing rating_after', undefined, r);
  }

  const rdAfter = Number(
    playerAfter?.rd ?? writeHint?.rd ?? r.rd_after ?? input.player.rd ?? 175,
  );
  const volAfter = Number(
    playerAfter?.volatility ??
      writeHint?.volatility ??
      r.volatility_after ??
      input.player.volatility ??
      0.06,
  );

  return {
    player_id: String(r.player_id ?? input.player.player_id),
    algorithm: (r.algorithm as string) ?? 'glicko2_v1',
    ladder: (r.ladder as string) ?? 'roc_glicko2',
    rating_after: ratingAfter,
    rd_after: Number.isFinite(rdAfter) ? rdAfter : 175,
    volatility_after: Number.isFinite(volAfter) ? volAfter : 0.06,
    rating_before:
      r.rating_before != null ? Number(r.rating_before) : input.player.rating,
    rd_before: r.rd_before != null ? Number(r.rd_before) : input.player.rd,
    display_before: r.display_before as string | undefined,
    display_after:
      (r.display_after as string) ??
      playerAfter?.display ??
      (r.display as string | undefined),
    band:
      playerAfter?.band ??
      (r.band as string) ??
      (r.band_after as string) ??
      undefined,
    weighted_delta:
      r.weighted_delta != null ? Number(r.weighted_delta) : undefined,
    raw_delta: r.raw_delta != null ? Number(r.raw_delta) : undefined,
    band_after: (r.band_after as string) ?? playerAfter?.band,
    band_before: r.band_before as string | undefined,
    band_changed: Boolean(r.band_changed),
    skill_signals: r.skill_signals as Record<string, unknown> | undefined,
    input: r.input as Record<string, unknown> | undefined,
    persist_hint: r.persist_hint as Record<string, unknown> | undefined,
    winner_after: parseGlickoSide(r.winner_after, input.player.player_id),
    loser_after: parseGlickoSide(
      r.loser_after,
      input.opponent_id ?? 'opponent',
    ),
    player_after: playerAfter,
    deltas: r.deltas as Record<string, unknown> | undefined,
    raw: r,
  };
}

/** Cross-league convert → Glicko seed (one-time for new players). */
export async function realaiRatingConvert(input: {
  player: RackUpPlayerContext;
  from_system: string;
  from_value: number;
  from_scale?: string;
  also_known?: Array<Record<string, unknown>>;
  want?: string[];
}): Promise<RatingConvertResult> {
  const res = await invokeRackupCoach({
    ability: 'rating_convert',
    player: {
      ...input.player,
      rating_system: input.player.rating_system ?? 'rackup',
    },
    payload: {
      from_system: input.from_system,
      from_value: input.from_value,
      from_scale: input.from_scale,
      also_known: input.also_known ?? [],
      want: input.want ?? ['rackup', 'bca', 'fargo', 'tap', 'vnea'],
      ladder: 'roc_glicko2',
    },
  });

  if (!res.ok || !res.result) {
    throw new RealAiCoachError(
      res.error ?? 'rating_convert failed',
      undefined,
      res,
    );
  }

  const r = res.result;
  const seedRaw = r.glicko2_seed as Record<string, unknown> | undefined;
  const estimate = Number(
    r.rackup_rating_estimate ?? seedRaw?.rating ?? input.player.rating ?? 500,
  );

  return {
    rackup_rating_estimate: Number.isFinite(estimate) ? estimate : 500,
    band_label: r.band_label as string | undefined,
    display: r.display as string | undefined,
    confidence: r.confidence != null ? Number(r.confidence) : undefined,
    ladder: (r.ladder as string) ?? 'roc_glicko2',
    glicko2_seed: seedRaw
      ? {
          rating: Number(seedRaw.rating ?? estimate),
          rd: Number(seedRaw.rd ?? 150),
          volatility: Number(seedRaw.volatility ?? 0.06),
          band: seedRaw.band as string | undefined,
          display: seedRaw.display as string | undefined,
          method: seedRaw.method as string | undefined,
        }
      : {
          rating: Number.isFinite(estimate) ? estimate : 500,
          rd: 175,
          volatility: 0.06,
        },
    seed_hint: r.seed_hint as Record<string, unknown> | undefined,
    equivalents: r.equivalents as Record<string, unknown> | undefined,
    raw: r,
  };
}

export async function realaiLeagueValidate(input: {
  player: RackUpPlayerContext;
  payload: Record<string, unknown>;
}): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: Record<string, unknown>;
  raw: RackUpCoachResponse;
}> {
  const res = await invokeRackupCoach({
    ability: 'league_validate',
    player: input.player,
    payload: input.payload,
  });
  const result = res.result ?? {};
  return {
    valid: Boolean(res.ok && result.valid !== false),
    errors: Array.isArray(result.errors)
      ? (result.errors as string[])
      : res.error
        ? [res.error]
        : [],
    warnings: Array.isArray(result.warnings) ? (result.warnings as string[]) : [],
    normalized: result.normalized as Record<string, unknown> | undefined,
    raw: res,
  };
}

export async function realaiModerate(input: {
  player: RackUpPlayerContext;
  text: string;
  context?: {
    channel?: string;
    match_id?: string;
    thread_id?: string;
    prior_flags?: number;
    recipient_id?: string;
  };
}): Promise<ModerationResult> {
  const res = await invokeRackupCoachSafe({
    ability: 'moderation',
    player: input.player,
    payload: {
      text: input.text,
      context: input.context ?? { channel: 'global_chat' },
    },
  });

  // Failure policy: allow with soft note when RealAI down (delayed mod queue)
  if (!res || !res.result) {
    return {
      clean: true,
      action: 'allow',
      guidance: 'moderation_offline_allow',
      policy_tags: ['offline_fallback'],
    };
  }

  const r = res.result;
  const action = (r.action as ModerationAction) ?? (r.clean === false ? 'warn' : 'allow');
  return {
    clean: r.clean !== false && action === 'allow',
    action,
    severity: r.severity != null ? Number(r.severity) : undefined,
    severity_label: r.severity_label as string | undefined,
    guidance: r.guidance as string | undefined,
    categories: r.categories as Record<string, boolean> | undefined,
    coach_redirect: r.coach_redirect as string | undefined,
    policy_tags: r.policy_tags as string[] | undefined,
    text_preview: r.text_preview as string | undefined,
    player_id: r.player_id as string | undefined,
  };
}

export async function realaiMatchmaking(input: {
  player: RackUpPlayerContext;
  window?: number;
  candidates: Array<Record<string, unknown>>;
}): Promise<Record<string, unknown>> {
  const res = await invokeRackupCoach({
    ability: 'matchmaking',
    player: input.player,
    payload: {
      window: input.window ?? 70,
      candidates: input.candidates,
    },
  });
  if (!res.ok || !res.result) {
    throw new RealAiCoachError(res.error ?? 'matchmaking failed', undefined, res);
  }
  return res.result;
}

export async function realaiShotOfTheDay(input: {
  player: RackUpPlayerContext;
  game?: string;
  count?: number;
  hint?: string;
  shown_shot_ids?: string[];
}): Promise<Record<string, unknown>> {
  const res = await invokeRackupCoach({
    ability: 'shot_of_the_day',
    player: input.player,
    payload: {
      game: input.game ?? input.player.discipline ?? 'pyramid',
      count: input.count ?? 1,
      hint: input.hint ?? '',
      shown_shot_ids: input.shown_shot_ids ?? [],
    },
  });
  if (!res.ok || !res.result) {
    throw new RealAiCoachError(res.error ?? 'shot_of_the_day failed', undefined, res);
  }
  return res.result;
}

export async function realaiCoach(input: {
  ability?: 'coach' | 'pyramid';
  goal?: string;
  player: RackUpPlayerContext;
  payload?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const res = await invokeRackupCoach({
    ability: input.ability ?? 'coach',
    goal: input.goal,
    player: input.player,
    payload: input.payload ?? { mode: 'full' },
  });
  if (!res.ok || !res.result) {
    throw new RealAiCoachError(res.error ?? 'coach failed', undefined, res);
  }
  return res.result;
}

export async function realaiPyramidRules(input: {
  player: RackUpPlayerContext;
  payload?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const res = await invokeRackupCoach({
    ability: 'pyramid_rules',
    player: input.player,
    payload: input.payload ?? {},
  });
  if (!res.ok || !res.result) {
    throw new RealAiCoachError(res.error ?? 'pyramid_rules failed', undefined, res);
  }
  return res.result;
}

export async function realaiVideoAnalysis(input: {
  player: RackUpPlayerContext;
  payload: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const res = await invokeRackupCoach({
    ability: 'video_analysis',
    player: input.player,
    payload: input.payload,
  });
  if (!res.ok || !res.result) {
    throw new RealAiCoachError(res.error ?? 'video_analysis failed', undefined, res);
  }
  return res.result;
}

// ─── ROC ledger audit (read-only — never moves money) ───────────────────────
// Contract: ROC_LEDGER_AUDIT_CONTRACT.md

export type LedgerAuditFinding = {
  severity: 'info' | 'warning' | 'blocker' | string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type LedgerAuditResult = {
  ok: boolean;
  ability: string;
  status: 'pass' | 'warnings' | 'fail' | string;
  owns_ledger: false;
  owns_payouts: false;
  authorize_payout: false;
  read_only: true;
  provider: 'realai';
  summary: {
    ok: boolean;
    warning_count: number;
    blocker_count: number;
    finding_count: number;
  };
  warnings: LedgerAuditFinding[];
  blockers: LedgerAuditFinding[];
  findings: LedgerAuditFinding[];
  plain_language: string[];
  gate: {
    recommend_before_auto_payout?: boolean;
    hard_block_if_blockers?: boolean;
    authorize_payout: false;
    release_safe?: boolean;
    note?: string;
  };
  fix_before_release?: string[];
  confidence?: number;
  ranks_match_standings?: boolean;
  split_check?: Record<string, unknown>;
  totals?: Record<string, unknown>;
  raw: Record<string, unknown>;
  offline?: boolean;
};

function normalizeAuditResponse(
  ability: string,
  res: RackUpCoachResponse | null,
  offlineFallback: LedgerAuditResult,
): LedgerAuditResult {
  if (!res) return offlineFallback;
  // Contract: top-level fields may be on result or root-like in result envelope
  const r = { ...(res.result ?? {}), ...res } as Record<string, unknown>;
  // Prefer nested result for summary fields
  const body = (res.result ?? res) as Record<string, unknown>;

  const findings = (Array.isArray(body.findings)
    ? body.findings
    : []) as LedgerAuditFinding[];
  const blockers = (Array.isArray(body.blockers)
    ? body.blockers
    : findings.filter((f) => f.severity === 'blocker')) as LedgerAuditFinding[];
  const warnings = (Array.isArray(body.warnings)
    ? body.warnings
    : findings.filter((f) => f.severity === 'warning')) as LedgerAuditFinding[];
  const summaryRaw = (body.summary as Record<string, unknown>) ?? {};
  const blocker_count = Number(
    summaryRaw.blocker_count ?? blockers.length ?? 0,
  );
  const warning_count = Number(
    summaryRaw.warning_count ?? warnings.length ?? 0,
  );
  const status =
    (body.status as string) ??
    (blocker_count > 0 ? 'fail' : warning_count > 0 ? 'warnings' : 'pass');
  const ok = Boolean(body.ok !== false && blocker_count === 0 && res.ok !== false);
  const plain = Array.isArray(body.plain_language)
    ? (body.plain_language as string[])
    : [];
  const gate = (body.gate as LedgerAuditResult['gate']) ?? {
    hard_block_if_blockers: true,
    authorize_payout: false as const,
  };

  return {
    ok,
    ability: (body.ability as string) ?? ability,
    status,
    owns_ledger: false,
    owns_payouts: false,
    authorize_payout: false,
    read_only: true,
    provider: 'realai',
    summary: {
      ok,
      warning_count,
      blocker_count,
      finding_count: Number(
        summaryRaw.finding_count ?? findings.length + blockers.length + warnings.length,
      ),
    },
    warnings,
    blockers,
    findings,
    plain_language: plain,
    gate: {
      ...gate,
      authorize_payout: false,
      hard_block_if_blockers: gate.hard_block_if_blockers !== false,
    },
    fix_before_release: Array.isArray(body.fix_before_release)
      ? (body.fix_before_release as string[])
      : undefined,
    confidence:
      body.confidence != null ? Number(body.confidence) : undefined,
    ranks_match_standings:
      body.ranks_match_standings != null
        ? Boolean(body.ranks_match_standings)
        : undefined,
    split_check: body.split_check as Record<string, unknown> | undefined,
    totals: body.totals as Record<string, unknown> | undefined,
    raw: body,
    offline: false,
  };
}

/**
 * Read-only ledger audit. RealAI never authorizes or moves money.
 * Top-level snapshot fields are merged into payload per contract.
 */
export async function realaiLedgerAudit(
  snapshot: Record<string, unknown>,
): Promise<LedgerAuditResult> {
  const offline: LedgerAuditResult = {
    ok: true,
    ability: 'ledger_audit',
    status: 'pass',
    owns_ledger: false,
    owns_payouts: false,
    authorize_payout: false,
    read_only: true,
    provider: 'realai',
    summary: { ok: true, warning_count: 1, blocker_count: 0, finding_count: 1 },
    warnings: [
      {
        severity: 'warning',
        code: 'audit_offline',
        message:
          'RealAI ledger_audit unreachable — RackUp soft-passed with offline warning. Operator should re-run when RealAI is up.',
      },
    ],
    blockers: [],
    findings: [],
    plain_language: [
      'RealAI audit offline: proceeding as soft warning only (no blockers from RealAI).',
    ],
    gate: {
      recommend_before_auto_payout: true,
      hard_block_if_blockers: true,
      authorize_payout: false,
      note: 'Offline fallback is warnings-only; never authorize_payout.',
    },
    raw: { offline: true },
    offline: true,
  };

  try {
    const res = await invokeRackupCoach({
      ability: 'ledger_audit',
      player: {
        player_id: 'system',
        rating_system: 'rackup',
      },
      // Contract: top-level fields merged into payload
      payload: {
        ...snapshot,
        ability: 'ledger_audit',
        owns_ledger: false,
        authorize_payout: false,
        read_only: true,
      },
    });
    return normalizeAuditResponse('ledger_audit', res, offline);
  } catch {
    return offline;
  }
}

export async function realaiPayoutSanity(
  snapshot: Record<string, unknown>,
): Promise<LedgerAuditResult> {
  const offline: LedgerAuditResult = {
    ok: true,
    ability: 'payout_sanity',
    status: 'pass',
    owns_ledger: false,
    owns_payouts: false,
    authorize_payout: false,
    read_only: true,
    provider: 'realai',
    summary: { ok: true, warning_count: 1, blocker_count: 0, finding_count: 1 },
    warnings: [
      {
        severity: 'warning',
        code: 'payout_sanity_offline',
        message: 'RealAI payout_sanity unreachable — soft warning only.',
      },
    ],
    blockers: [],
    findings: [],
    plain_language: ['Payout sanity offline (warning only).'],
    gate: {
      hard_block_if_blockers: true,
      authorize_payout: false,
      release_safe: false,
    },
    confidence: 0,
    raw: { offline: true },
    offline: true,
  };

  try {
    const res = await invokeRackupCoach({
      ability: 'payout_sanity',
      player: { player_id: 'system', rating_system: 'rackup' },
      payload: {
        ...snapshot,
        ability: 'payout_sanity',
        authorize_payout: false,
        read_only: true,
      },
    });
    return normalizeAuditResponse('payout_sanity', res, offline);
  } catch {
    return offline;
  }
}

export async function realaiMoneyAnomaly(
  snapshot: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await invokeRackupCoach({
      ability: 'money_anomaly',
      player: {
        player_id: String(snapshot.subject_id ?? 'system'),
        rating_system: 'rackup',
      },
      payload: { ...snapshot, ability: 'money_anomaly', read_only: true },
    });
    return res.result ?? { ok: res.ok, raw: res };
  } catch {
    return null;
  }
}

