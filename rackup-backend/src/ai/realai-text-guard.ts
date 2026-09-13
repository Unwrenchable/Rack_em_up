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

/** True only for the Render/Hive “no local model / default_llm” placeholder. */
export function isDefaultLlmPlaceholder(text?: string | null): boolean {
  if (text == null) return false;
  const t = String(text);
  return UNUSABLE_PATTERNS.some((re) => re.test(t));
}

export function isUnusableRealAiText(text?: string | null): boolean {
  if (text == null) return true;
  const t = String(text).trim();
  if (!t) return true;
  return isDefaultLlmPlaceholder(t);
}

/**
 * Plugin HTTP 200 can still wrap the chat/completions placeholder in
 * error / notes / result. Treat that as a failed ability, not coaching.
 */
export function isUnusableCoachEnvelope(res: {
  ok?: boolean;
  error?: string | null;
  notes?: string;
  result?: unknown;
}): boolean {
  if (isDefaultLlmPlaceholder(res.error)) return true;
  if (isDefaultLlmPlaceholder(res.notes)) return true;
  if (typeof res.result === 'string' && isDefaultLlmPlaceholder(res.result)) {
    return true;
  }
  const rec = asRecord(res.result);
  if (!rec) return false;
  for (const key of ['error', 'message', 'analysis', 'text', 'notes', 'guidance']) {
    if (isDefaultLlmPlaceholder(rec[key] as string | undefined)) return true;
  }
  return false;
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
  'expectation',
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

  const structured = formatVideoAnalysisResult(rec);
  if (structured) return structured;

  const head = pickFirstUsableString(rec, TEXT_KEYS);
  const drills = formatRecommendedDrills(rec);
  if (head && drills) return `${head}\n\n${drills}`;
  if (head) return head;
  if (drills) return drills;

  if (rec.result) {
    const nested = coachingTextFromResult(rec.result);
    if (nested) return nested;
  }
  return null;
}

function pickFirstUsableString(
  rec: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
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
  return null;
}

/** Live rackup-coach video_analysis: expectation + findings + drills. */
function formatVideoAnalysisResult(rec: Record<string, unknown>): string | null {
  const hasShape =
    typeof rec.expectation === 'string' ||
    Array.isArray(rec.findings) ||
    Array.isArray(rec.format_coaching_notes);
  if (!hasShape) return null;

  const lines: string[] = [];
  if (typeof rec.expectation === 'string') {
    const s = rec.expectation.trim();
    if (s && !isDefaultLlmPlaceholder(s)) lines.push(s);
  }

  if (Array.isArray(rec.findings)) {
    for (const item of rec.findings) {
      const row = asRecord(item);
      if (!row) continue;
      const area = String(row.area ?? '').trim();
      const finding = String(row.finding ?? '').trim();
      const fix = String(row.fix ?? '').trim();
      if (finding && !isDefaultLlmPlaceholder(finding)) {
        lines.push(area ? `${area}: ${finding}` : finding);
      }
      if (fix && !isDefaultLlmPlaceholder(fix)) {
        lines.push(`Fix: ${fix}`);
      }
    }
  }

  if (Array.isArray(rec.format_coaching_notes)) {
    for (const n of rec.format_coaching_notes) {
      if (typeof n === 'string' && n.trim() && !isDefaultLlmPlaceholder(n)) {
        lines.push(n.trim());
      }
    }
  }

  const drills = formatRecommendedDrills(rec);
  if (drills) {
    lines.push('');
    lines.push(drills);
  }

  if (typeof rec.next_upload_prompt === 'string') {
    const next = rec.next_upload_prompt.trim();
    if (next && !isDefaultLlmPlaceholder(next)) {
      lines.push('');
      lines.push(next);
    }
  }

  const text = lines.join('\n').trim();
  return text && !isDefaultLlmPlaceholder(text) ? text : null;
}

function formatRecommendedDrills(rec: Record<string, unknown>): string | null {
  const raw = rec.recommended_drills ?? rec.drills ?? rec.fixes;
  if (!Array.isArray(raw) || !raw.length) return null;
  const lines: string[] = [];
  raw.slice(0, 6).forEach((item, i) => {
    if (typeof item === 'string' && item.trim() && !isDefaultLlmPlaceholder(item)) {
      lines.push(`${i + 1}. ${item.trim()}`);
      return;
    }
    const row = asRecord(item);
    if (!row) return;
    const title = String(row.title ?? row.drill ?? row.name ?? '').trim();
    const detail = String(row.description ?? row.notes ?? row.text ?? '').trim();
    const line = [title, detail].filter(Boolean).join(' — ');
    if (line && !isDefaultLlmPlaceholder(line)) lines.push(`${i + 1}. ${line}`);
  });
  return lines.length ? `Recommended drills:\n${lines.join('\n')}` : null;
}
