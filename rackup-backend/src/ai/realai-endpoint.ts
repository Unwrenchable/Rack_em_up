/**
 * REALAI_RACKUP_WIRING_CONTRACT — shared URL / envelope helpers.
 * Canonical: POST {REALAI_BASE_URL}/v1/plugins/rackup-coach
 * Alias:     POST {REALAI_BASE_URL}/v1/rackup/coach
 */

export const REALAI_DEFAULT_BASE = 'http://127.0.0.1:8001';
export const REALAI_CANONICAL_COACH_PATH = '/v1/plugins/rackup-coach';
export const REALAI_ALIAS_COACH_PATH = '/v1/rackup/coach';

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
