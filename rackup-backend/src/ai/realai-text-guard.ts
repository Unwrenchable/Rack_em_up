/**
 * Render realai-api is plugin-only (no GGUF / default_llm).
 * Local Hive GPU lives on the operator PC. Chat/completions that demand
 * default_llm must never be shown as “coach tips”.
 */

const UNUSABLE_PATTERNS = [
  /default_llm/i,
  /no local model/i,
  /not configured\/loaded/i,
  /register a local model/i,
  /set it as default_llm/i,
  /llama-server/i,
];

export function isUnusableRealAiText(text?: string | null): boolean {
  if (text == null) return true;
  const t = String(text).trim();
  if (!t) return true;
  return UNUSABLE_PATTERNS.some((re) => re.test(t));
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

const TEXT_KEYS = [
  'analysis',
  'advice',
  'coaching_summary',
  'guidance',
  'feedback',
  'summary',
  'notes',
  'text',
  'plain_language',
  'message',
  'result_text',
];

/** Pull human coaching text from a rackup-coach result. Rejects default_llm errors. */
export function coachingTextFromResult(result: unknown): string | null {
  if (result == null) return null;
  if (typeof result === 'string') {
    const s = result.trim();
    return s && !isUnusableRealAiText(s) ? s : null;
  }
  const rec = asRecord(result);
  if (!rec) return null;

  for (const key of TEXT_KEYS) {
    const v = rec[key];
    if (typeof v === 'string') {
      const s = v.trim();
      if (s && !isUnusableRealAiText(s)) return s;
    }
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      const s = (v as string[]).join('\n').trim();
      if (s && !isUnusableRealAiText(s)) return s;
    }
  }

  if (rec.result) {
    const nested = coachingTextFromResult(rec.result);
    if (nested) return nested;
  }
  return null;
}
