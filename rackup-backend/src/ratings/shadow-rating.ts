/**
 * RackUpRate shadow — Fargo-like (rating / robustness / CI) derived from
 * ROC Glicko-2 state. Parallel display only.
 *
 * PIN MAP:
 * - Input is `users.rating` / `rd` / `matches` (ROC Glicko-2, default 500 / 175).
 * - Output must NEVER be written to `users.rating`.
 * - Do not run this through `unifyRackupRating()` (0–3000 import scale).
 *
 * Robustness (0–1000) blends RD-confidence with rated-match count so a brand-new
 * player (0 matches, RD 175) is robustness 0 / provisional. Glicko 95% CI is
 * rating ± 1.96·RD. Provisional when matches < 20 or robustness < 200
 * (Fargo-like “not yet established”, not an official Fargo rule).
 */

import {
  ROC_DEFAULT_RATING,
  ROC_DEFAULT_RD,
  ROC_MAX_RD,
  ROC_MIN_RD,
} from '../users/rating-display';
import {
  RACKUP_SHADOW_LABEL,
  type RackupShadow,
} from './player-card.types';

export const SHADOW_GAMES_TAU = 20;
export const SHADOW_PROVISIONAL_MATCHES = 20;
export const SHADOW_PROVISIONAL_ROBUSTNESS = 200;
export const SHADOW_Z_95 = 1.96;

function finiteOr(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * RD confidence in [0, 1]: ROC_MAX_RD (350) → 0, ROC_MIN_RD (30) → 1.
 */
export function rdConfidence(rd: number): number {
  const span = ROC_MAX_RD - ROC_MIN_RD;
  const clamped = Math.max(ROC_MIN_RD, Math.min(ROC_MAX_RD, rd));
  return 1 - (clamped - ROC_MIN_RD) / span;
}

/** Games factor in [0, 1): 0 matches → 0, ~20 matches → 0.63, 50+ → ~0.92. */
export function gamesFactor(matches: number, tau = SHADOW_GAMES_TAU): number {
  const m = Math.max(0, matches);
  return 1 - Math.exp(-m / tau);
}

export function computeRackupShadow(input: {
  rating?: number | null;
  rd?: number | null;
  matches?: number | null;
  volatility?: number | null;
}): RackupShadow {
  const rating = finiteOr(input.rating, ROC_DEFAULT_RATING);
  const rd = finiteOr(input.rd, ROC_DEFAULT_RD);
  const matches = Math.max(0, Math.floor(finiteOr(input.matches, 0)));

  const robustness = Math.round(
    1000 * Math.max(0, Math.min(1, rdConfidence(rd) * gamesFactor(matches))),
  );
  const provisional =
    matches < SHADOW_PROVISIONAL_MATCHES || robustness < SHADOW_PROVISIONAL_ROBUSTNESS;

  return {
    rating: Math.round(rating),
    robustness,
    provisional,
    confidence_low: Math.round(rating - SHADOW_Z_95 * rd),
    confidence_high: Math.round(rating + SHADOW_Z_95 * rd),
    official: false,
    source: 'rackup_glicko_shadow',
    label: RACKUP_SHADOW_LABEL,
  };
}
