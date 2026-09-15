/**
 * Name normalization + fuzzy score for cross-league identity (no extra deps).
 */

export function normalizePersonName(raw: string | null | undefined): string {
  const s = String(raw ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\.?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

export function nameTokens(raw: string | null | undefined): string[] {
  return normalizePersonName(raw).split(' ').filter((t) => t.length > 1);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/**
 * Similarity in [0, 1]. Exact normalized match is 1.
 * Mix of full-string edit distance and token Jaccard so "Shane Van Boening"
 * still matches "Van Boening, Shane".
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizePersonName(a);
  const nb = normalizePersonName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const maxLen = Math.max(na.length, nb.length);
  const edit = 1 - levenshtein(na, nb) / maxLen;

  const ta = new Set(nameTokens(na));
  const tb = new Set(nameTokens(nb));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = union ? inter / union : 0;

  // Same token bag ("Last, First" vs "First Last") is a unique person match.
  if (ta.size >= 2 && jaccard === 1) return 1;

  const contains =
    (na.includes(nb) || nb.includes(na)) && Math.min(na.length, nb.length) >= 5
      ? 0.9
      : 0;

  return Math.max(edit * 0.4 + jaccard * 0.6, contains);
}

/** Accept auto-merge at this score when the top candidate is unique enough. */
export const NAME_MATCH_THRESHOLD = 0.86;
export const NAME_MATCH_AMBIGUOUS_GAP = 0.08;
