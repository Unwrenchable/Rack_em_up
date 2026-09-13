/**
 * REALAI_RACKUP_WIRING_CONTRACT — shared URL / envelope helpers.
 * Canonical: POST {REALAI_BASE_URL}/v1/plugins/rackup-coach
 * Alias:     POST {REALAI_BASE_URL}/v1/rackup/coach
 *
 * Local Hive / v3 orchestrator (:8001): POST /v1/plugins/rackup-coach is an
 * **expected 404**. Documented LIVE Nest path is POST /v1/tools/execute
 * { name: rackup_invoke, arguments: <ability/player/payload envelope> }
 * for video_analysis / coach. Render api_server stays plugin-first.
 */

export const REALAI_DEFAULT_BASE = 'http://127.0.0.1:8001';
export const REALAI_CANONICAL_COACH_PATH = '/v1/plugins/rackup-coach';
export const REALAI_ALIAS_COACH_PATH = '/v1/rackup/coach';
export const REALAI_TOOLS_EXECUTE_PATH = '/v1/tools/execute';
export const REALAI_HIVE_RACKUP_TOOL = 'rackup_invoke';

export function resolveRealAiBaseUrl(raw?: string): string {
  return (raw ?? process.env.REALAI_BASE_URL ?? REALAI_DEFAULT_BASE).replace(
    /\/$/,
    '',
  );
}

export function isForbiddenRealAiUiHost(url: string): boolean {
  return /realaiui\.vercel\.app/i.test(url);
}

/** Canonical first, then alias. Env REALAI_COACH_PATH is tried first when set. */
export function realAiCoachPaths(): string[] {
  const primary = process.env.REALAI_COACH_PATH ?? REALAI_CANONICAL_COACH_PATH;
  const out: string[] = [];
  for (const p of [primary, REALAI_CANONICAL_COACH_PATH, REALAI_ALIAS_COACH_PATH]) {
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

export function isRenderRealAiHost(url: string): boolean {
  return /onrender\.com/i.test(url);
}

/**
 * Local Hive / orchestrator (loopback, :8001, hive/orchestrator host).
 * Render is never treated as Hive. REALAI_HIVE_TOOLS_FALLBACK=1|0 overrides.
 */
export function isHiveToolsFallbackEnabled(baseUrl: string): boolean {
  const flag = process.env.REALAI_HIVE_TOOLS_FALLBACK;
  if (flag === '0' || flag === 'false') return false;
  if (flag === '1' || flag === 'true') return true;
  if (isRenderRealAiHost(baseUrl)) return false;
  try {
    const u = new URL(baseUrl);
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return true;
    }
    if (host.endsWith('.local')) return true;
    if (host.includes('hive') || host.includes('orchestrator')) return true;
    if (u.port === '8001') return true;
    return false;
  } catch {
    return /127\.0\.0\.1|localhost|:8001/i.test(baseUrl);
  }
}

export function isMissingPluginRoute(status: number): boolean {
  return status === 404;
}

export type RackupCoachEnvelope = {
  ability: string;
  organs_enabled: boolean;
  player: Record<string, unknown>;
  payload: Record<string, unknown>;
  goal?: string;
};

/** Hive tools/execute body. `name` is canonical; `tool` is the accepted alias. */
export function buildHiveToolsExecuteBody(envelope: RackupCoachEnvelope): {
  name: string;
  tool: string;
  arguments: RackupCoachEnvelope;
} {
  return {
    name: REALAI_HIVE_RACKUP_TOOL,
    tool: REALAI_HIVE_RACKUP_TOOL,
    arguments: envelope,
  };
}

export type CoachEnvelopeLike = {
  ok: boolean;
  plugin?: string;
  ability?: string;
  result: Record<string, unknown> | null;
  organ_trace?: unknown;
  notes?: string;
  error?: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function looksLikeCoachEnvelope(rec: Record<string, unknown> | null): boolean {
  if (!rec) return false;
  if (rec.plugin === 'rackup-coach') return true;
  if (typeof rec.ability === 'string' && rec.result !== undefined) return true;
  if (
    rec.ok !== undefined &&
    rec.result != null &&
    typeof rec.result === 'object' &&
    !Array.isArray(rec.result) &&
    rec.tool == null
  ) {
    return true;
  }
  return false;
}

function fromCoachEnvelope(
  rec: Record<string, unknown>,
  ability: string,
): CoachEnvelopeLike {
  const nested = asRecord(rec.result);
  const result = nested
    ?? (typeof rec.result === 'string' ? { analysis: rec.result } : null);
  return {
    ok: rec.ok !== false,
    plugin: typeof rec.plugin === 'string' ? rec.plugin : 'rackup-coach',
    ability: typeof rec.ability === 'string' ? rec.ability : ability,
    result,
    organ_trace: rec.organ_trace,
    notes: typeof rec.notes === 'string' ? rec.notes : undefined,
    error: rec.error == null ? null : String(rec.error),
  };
}

/**
 * Hive POST /v1/tools/execute returns `{ tool, result }`.
 * `result` is either the rackup-coach envelope or the plugin result object.
 */
export function normalizeHiveToolsExecuteResponse(
  json: unknown,
  ability: string,
): CoachEnvelopeLike {
  const root = asRecord(json);
  if (!root) {
    throw new Error('Hive tools/execute returned non-object body');
  }

  const candidates = [asRecord(root.result), asRecord(root.data), root];
  for (const cand of candidates) {
    if (looksLikeCoachEnvelope(cand)) {
      return fromCoachEnvelope(cand!, ability);
    }
  }

  const inner = asRecord(root.result);
  if (inner) {
    const nested = asRecord(inner.result);
    if (nested) {
      return {
        ok: inner.ok !== false && root.ok !== false,
        plugin:
          typeof inner.plugin === 'string' ? inner.plugin : 'rackup-coach',
        ability: typeof inner.ability === 'string' ? inner.ability : ability,
        result: nested,
        organ_trace: inner.organ_trace,
        notes: typeof inner.notes === 'string' ? inner.notes : undefined,
        error: inner.error == null ? null : String(inner.error),
      };
    }
    const { ok: _ok, craft_action: _ca, tool: _tool, ...rest } = inner;
    return {
      ok: inner.ok !== false && root.ok !== false,
      plugin: typeof inner.plugin === 'string' ? inner.plugin : 'rackup-coach',
      ability: typeof inner.ability === 'string' ? inner.ability : ability,
      result: rest,
      organ_trace: inner.organ_trace,
      notes: typeof inner.notes === 'string' ? inner.notes : undefined,
      error: inner.error == null ? null : String(inner.error),
    };
  }

  throw new Error('Hive tools/execute missing plugin-shaped result');
}

export function renderCloudKeyHint(baseUrl: string): string | undefined {
  if (!/onrender\.com/i.test(baseUrl)) return undefined;
  return (
    'Render realai-api is plugin-only (no GGUF / default_llm). ' +
    'Set OPENAI_API_KEY or REALAI_OPENAI_API_KEY on the realai-api service. ' +
    'Use POST /v1/plugins/rackup-coach — not chat/completions.'
  );
}

/** Contract envelope. Never sets use_local / _use_local. */
export function buildRackupCoachEnvelope(input: {
  ability: string;
  player: Record<string, unknown>;
  payload?: Record<string, unknown>;
  goal?: string;
  organs_enabled?: boolean;
}): {
  ability: string;
  organs_enabled: boolean;
  player: Record<string, unknown>;
  payload: Record<string, unknown>;
  goal?: string;
} {
  const envelope: {
    ability: string;
    organs_enabled: boolean;
    player: Record<string, unknown>;
    payload: Record<string, unknown>;
    goal?: string;
  } = {
    ability: input.ability,
    organs_enabled: input.organs_enabled ?? true,
    player: input.player,
    payload: {
      prefer_local: false,
      allow_cloud_llm: true,
      ...(input.payload ?? {}),
    },
  };
  if (input.goal) envelope.goal = input.goal;
  return envelope;
}
