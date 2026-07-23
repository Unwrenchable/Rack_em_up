// V2-only unified rating normalization.
// This is intentionally simple as a baseline; real mapping can be refined.

export function unifyRackupRating(_sourceName: string, externalRating: number): number {
  // Baseline normalization:
  // - Keep scale similar by clamping to a reasonable range.
  // - In future, apply true APA/Fargo transforms per source.
  const min = 0;
  const max = 3000;
  const v = Math.round(Math.max(min, Math.min(max, externalRating)));
  return v;
}

