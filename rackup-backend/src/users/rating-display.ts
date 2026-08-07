/**
 * ROC Glicko-2 display helpers (labels only — never for matchmaking math).
 * Contract: ROC_GLICKO2_RATING_CONTRACT.md
 *
 * Prefer RealAI `display` / `band` from rating_update when present.
 * These helpers are for offline UI and local seed defaults.
 */

export const ROC_DEFAULT_RATING = 500;
export const ROC_DEFAULT_RD = 175;
export const ROC_DEFAULT_VOLATILITY = 0.06;
export const ROC_MIN_RD = 30;
export const ROC_MAX_RD = 350;

export type RocRatingBand =
  | 'Novice'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert'
  | 'Elite';

/** Display bands — labels only (locked). */
export function bandForRating(rating: number): RocRatingBand {
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 400) return 'Novice';
  if (r < 500) return 'Intermediate';
  if (r < 600) return 'Advanced';
  if (r < 700) return 'Expert';
  return 'Elite';
}

/**
 * Canonical chip: "Advanced • 547"
 * Integer display of continuous rating (round half up via Math.round).
 */
export function formatRatingDisplay(
  rating: number,
  band?: string | null,
): string {
  const r = Number.isFinite(rating) ? Math.round(rating) : ROC_DEFAULT_RATING;
  const b = (band && String(band).trim()) || bandForRating(r);
  return `${b} • ${r}`;
}

export type GlickoPublicPayload = {
  rating: number;
  rd: number;
  volatility: number;
  matches: number;
  band: RocRatingBand;
  display: string;
  ladder: 'roc_glicko2';
};

export function toGlickoPublic(input: {
  rating?: number | null;
  rd?: number | null;
  volatility?: number | null;
  matches?: number | null;
  band?: string | null;
  display?: string | null;
}): GlickoPublicPayload {
  const rating =
    input.rating != null && Number.isFinite(Number(input.rating))
      ? Number(input.rating)
      : ROC_DEFAULT_RATING;
  const rd =
    input.rd != null && Number.isFinite(Number(input.rd))
      ? Number(input.rd)
      : ROC_DEFAULT_RD;
  const volatility =
    input.volatility != null && Number.isFinite(Number(input.volatility))
      ? Number(input.volatility)
      : ROC_DEFAULT_VOLATILITY;
  const matches =
    input.matches != null && Number.isFinite(Number(input.matches))
      ? Math.max(0, Math.floor(Number(input.matches)))
      : 0;
  const band = (input.band as RocRatingBand) || bandForRating(rating);
  const display = input.display?.trim() || formatRatingDisplay(rating, band);
  return {
    rating,
    rd,
    volatility,
    matches,
    band,
    display,
    ladder: 'roc_glicko2',
  };
}
