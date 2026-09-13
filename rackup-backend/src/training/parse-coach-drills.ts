/**
 * Turn a RealAI rackup-coach `coach` result (or chat text) into today's drills.
 * RealAI often wraps plans as practice_plan.blocks, drills[], or fenced JSON —
 * the old chat-completions path required a bare JSON array and falsely fell back.
 */

export type DrillPlan = {
  id: string;
  title: string;
  focus: string;
  minutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  source: 'rules' | 'realai';
};

const DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

export function normalizeDifficulty(raw: unknown): DrillPlan['difficulty'] {
  const s = String(raw ?? '').trim();
  if (DIFFICULTIES.has(s)) return s as DrillPlan['difficulty'];
  const lower = s.toLowerCase();
  if (lower === 'easy' || lower === 'beginner') return 'Easy';
  if (lower === 'hard' || lower === 'advanced' || lower === 'pro') return 'Hard';
  return 'Medium';
}

/** Pull the first JSON array/object out of markdown fences or prose. */
export function extractJsonValue(text: string): unknown {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();

  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const direct = tryParse(candidate);
  if (direct != null) return direct;

  const arrStart = candidate.indexOf('[');
  const arrEnd = candidate.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) {
    const parsed = tryParse(candidate.slice(arrStart, arrEnd + 1));
    if (parsed != null) return parsed;
  }

  const objStart = candidate.indexOf('{');
  const objEnd = candidate.lastIndexOf('}');
  if (objStart >= 0 && objEnd > objStart) {
    return tryParse(candidate.slice(objStart, objEnd + 1));
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function pickString(row: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return fallback;
}

function rowToDrill(row: unknown, index: number): DrillPlan | null {
  if (typeof row === 'string' && row.trim()) {
    return {
      id: `ai-${index + 1}`,
      title: row.trim().slice(0, 80),
      focus: 'Fundamentals',
      minutes: 10,
      difficulty: 'Medium',
      description: row.trim(),
      source: 'realai',
    };
  }
  const r = asRecord(row);
  if (!r) return null;
  const title = pickString(r, ['title', 'drill', 'name', 'skill'], '');
  const description = pickString(
    r,
    ['description', 'notes', 'detail', 'instructions', 'summary', 'drill', 'text'],
    title,
  );
  if (!title && !description) return null;
  const minutesRaw = Number(r.minutes ?? r.duration_minutes ?? r.mins ?? r.duration);
  return {
    id: `ai-${index + 1}`,
    title: title || `Drill ${index + 1}`,
    focus: pickString(r, ['focus', 'skill', 'category', 'theme'], 'Fundamentals'),
    minutes: Number.isFinite(minutesRaw) && minutesRaw > 0 ? minutesRaw : 10,
    difficulty: normalizeDifficulty(r.difficulty ?? r.level),
    description: description || title,
    source: 'realai',
  };
}

function collectCandidateArrays(root: unknown): unknown[][] {
  const out: unknown[][] = [];
  const visit = (node: unknown, depth: number) => {
    if (node == null || depth > 5) return;
    if (Array.isArray(node)) {
      if (node.length) out.push(node);
      return;
    }
    const rec = asRecord(node);
    if (!rec) return;
    for (const key of [
      'drills',
      'blocks',
      'plan',
      'sessions',
      'items',
      'exercises',
      'practice',
    ]) {
      if (Array.isArray(rec[key])) out.push(rec[key] as unknown[]);
    }
    if (rec.practice_plan) visit(rec.practice_plan, depth + 1);
    if (rec.result) visit(rec.result, depth + 1);
    if (rec.coaching) visit(rec.coaching, depth + 1);
    if (rec.plan && !Array.isArray(rec.plan)) visit(rec.plan, depth + 1);
  };
  visit(root, 0);
  return out;
}

/** Map a rackup-coach `coach` result (or similar) to 1–3 drills. */
export function drillsFromCoachResult(result: unknown): DrillPlan[] | null {
  if (result == null) return null;
  if (typeof result === 'string') return drillsFromChatContent(result);

  for (const arr of collectCandidateArrays(result)) {
    const drills = arr.map(rowToDrill).filter((d): d is DrillPlan => !!d);
    if (drills.length) return drills.slice(0, 3);
  }

  const rec = asRecord(result);
  if (rec) {
    const prose = pickString(
      rec,
      ['coaching_summary', 'guidance', 'advice', 'summary', 'notes', 'text'],
      '',
    );
    if (prose) {
      const fromProse = drillsFromProse(prose);
      if (fromProse?.length) return fromProse;
    }
  }
  return null;
}

/** Parse chat-completions text: fenced JSON, bare array, or numbered prose. */
export function drillsFromChatContent(content: string): DrillPlan[] | null {
  if (!content || !content.trim()) return null;
  const parsed = extractJsonValue(content);
  if (parsed != null) {
    const fromJson = drillsFromCoachResult(parsed);
    if (fromJson?.length) return fromJson;
  }
  return drillsFromProse(content);
}

function drillsFromProse(text: string): DrillPlan[] | null {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s+/, '').trim())
    .filter((l) => l.length > 8);
  if (lines.length < 2) return null;
  const drills = lines.slice(0, 3).map((line, i) => rowToDrill(line, i));
  const ok = drills.filter((d): d is DrillPlan => !!d);
  return ok.length ? ok : null;
}
