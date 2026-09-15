/**
 * Unified Player Card — separate rating continua (ROC pin map).
 *
 * Canonical ROC Glicko-2 ladder lives on `users.rating` / `rd` / `volatility` /
 * `matches` / `ratingBand` / `ratingDisplay` and is mirrored here as
 * `rackup_stats`. Never copy leagues-v2 0–3000 `unifyRackupRating()` output
 * onto `users.rating` (that helper is import-mapping only).
 *
 * Continua:
 * - rackup_stats     = ROC Glicko-2 (users.*)
 * - fargo_rating     = FargoRate public API read (never invented)
 * - rackup_shadow    = Fargo-like approximation from Glicko; NOT official Fargo
 * - apa_sl / bca_elo / tap_stats = external league fields
 */

import type { GlickoPublicPayload } from '../users/rating-display';

export const RACKUP_SHADOW_LABEL = 'RackUpRate (shadow, not official Fargo)';

export const RACKUP_SHADOW_DISCLAIMER =
  'RackUpRate is RackUp’s Glicko-derived approximation of a Fargo-like rating, not official FargoRate.';

export type TapStats = {
  skill?: number | null;
  charter_points?: number | null;
  division?: string | null;
  notes?: string | null;
  imported_at?: string | null;
  raw?: Record<string, unknown> | null;
};

export type RackupLadderStats = GlickoPublicPayload & {
  /** Mirror of users.lastMatchDelta — ROC ladder only. */
  last_match_delta?: number | null;
  wins?: number;
  losses?: number;
  completed_matches?: number;
};

export type RackupShadow = {
  rating: number;
  robustness: number;
  provisional: boolean;
  confidence_low: number;
  confidence_high: number;
  /** Always false — this is not FargoRate. */
  official: false;
  source: 'rackup_glicko_shadow';
  label: typeof RACKUP_SHADOW_LABEL;
};

export type PlayerExternalIds = {
  fargo_id?: string | null;
  fargo_readable_id?: string | null;
  apa_member_id?: string | null;
  bca_id?: string | null;
  tap_id?: string | null;
};

/**
 * Wire schema for console/coach. `player.unified_id` is the resolver key.
 * Rating numbers on this card are NOT interchangeable with each other.
 */
export type UnifiedPlayerCard = {
  player: {
    name: string;
    apa_sl: number | null;
    fargo_rating: number | null;
    fargo_robustness: number | null;
    bca_elo: number | null;
    tap_stats: TapStats | null;
    rackup_stats: RackupLadderStats | null;
    unified_id: string;
    rackup_shadow: RackupShadow | null;
    fargo_id?: string | null;
    fargo_readable_id?: string | null;
    apa_member_id?: string | null;
    bca_id?: string | null;
    tap_id?: string | null;
  };
  display: {
    /** e.g. `FargoRate: 520 (rob 410)` — omitted when Fargo was not returned. */
    fargo: string | null;
    /** e.g. `RackUpRate: 512 (rob 180)` — always labeled shadow / not official. */
    rackup_shadow: string | null;
    disclaimer: typeof RACKUP_SHADOW_DISCLAIMER;
  };
  meta: {
    user_id: string | null;
    fargo_fetched_at: string | null;
    shadow_computed_at: string | null;
    /** How identity was chosen (exact id, user, fuzzy name, created). */
    resolve_method?: string;
    notes: string[];
  };
};

export function formatFargoPair(
  rating: number | null | undefined,
  robustness: number | null | undefined,
): string | null {
  if (rating == null || !Number.isFinite(rating)) return null;
  const rob =
    robustness != null && Number.isFinite(robustness) ? String(Math.round(robustness)) : '—';
  return `FargoRate: ${Math.round(rating)} (rob ${rob})`;
}

export function formatShadowPair(shadow: RackupShadow | null | undefined): string | null {
  if (!shadow) return null;
  return `RackUpRate: ${Math.round(shadow.rating)} (rob ${Math.round(shadow.robustness)})`;
}
