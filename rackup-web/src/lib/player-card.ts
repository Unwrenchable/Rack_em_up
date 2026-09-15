/**
 * Unified Player Card display helpers — Nest #47 wire shape
 * (`player.rackup_stats` / `fargo_rating` / `rackup_shadow`).
 *
 * RealAI contract pin: unified_player_card.v1 (parallel continua, never invent
 * Fargo, leagues-v2 does not overwrite ROC). Nest card keys differ; this UI
 * follows the live GET /users/:id/player-card payload.
 *
 * Canonical competitive rating is ROC Glicko-2 on `users.rating`.
 */

import type { RackupShadow, UnifiedPlayerCard } from './types';

export const ROC_DEFAULT_RATING = 500;
export const ROC_DEFAULT_RD = 175;
export const ROC_MIN_RD = 30;
export const ROC_MAX_RD = 350;

export const RACKUP_SHADOW_LABEL = 'RackUpRate (shadow, not official Fargo)';
export const RACKUP_SHADOW_DISCLAIMER =
  'RackUpRate is RackUp’s Glicko-derived approximation of a Fargo-like rating, not official FargoRate.';

export type PlayerCard = UnifiedPlayerCard;

export type RocRatingBand =
  | 'Novice'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert'
  | 'Elite';

export function bandForRating(rating: number): RocRatingBand {
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 400) return 'Novice';
  if (r < 500) return 'Intermediate';
  if (r < 600) return 'Advanced';
  if (r < 700) return 'Expert';
  return 'Elite';
}

/** Canonical chip: "Advanced • 547" */
export function formatRatingDisplay(rating: number, band?: string | null): string {
  const r = Number.isFinite(rating) ? Math.round(rating) : ROC_DEFAULT_RATING;
  const b = (band && String(band).trim()) || bandForRating(r);
  return `${b} • ${r}`;
}

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

/** Published Fargo number for chips/search — never invent; effectiveRating is official Fargo. */
export function publishedFargoRating(input: {
  rating?: number | null;
  effective_rating?: number | null;
  fargo_rating?: number | null;
}): number | null {
  for (const v of [input.rating, input.fargo_rating, input.effective_rating]) {
    if (v != null && Number.isFinite(v) && v >= 0) return v;
  }
  return null;
}

export function computeRackupShadow(input: {
  rating?: number | null;
  rd?: number | null;
  matches?: number | null;
}): RackupShadow {
  const rating = Number.isFinite(Number(input.rating)) ? Number(input.rating) : ROC_DEFAULT_RATING;
  const rd = Number.isFinite(Number(input.rd)) ? Number(input.rd) : ROC_DEFAULT_RD;
  const matches = Math.max(0, Math.floor(Number(input.matches) || 0));
  const span = ROC_MAX_RD - ROC_MIN_RD;
  const clamped = Math.max(ROC_MIN_RD, Math.min(ROC_MAX_RD, rd));
  const rdConfidence = 1 - (clamped - ROC_MIN_RD) / span;
  const gamesFactor = 1 - Math.exp(-matches / 20);
  const robustness = Math.round(1000 * Math.max(0, Math.min(1, rdConfidence * gamesFactor)));
  const provisional = matches < 20 || robustness < 200;
  return {
    rating: Math.round(rating),
    robustness,
    provisional,
    confidence_low: Math.round(rating - 1.96 * rd),
    confidence_high: Math.round(rating + 1.96 * rd),
    official: false,
    source: 'rackup_glicko_shadow',
    label: RACKUP_SHADOW_LABEL,
  };
}

export function buildUnifiedPlayerCard(input: {
  name: string;
  unifiedId: string;
  userId?: string | null;
  rating: number;
  rd?: number;
  matches?: number;
  band?: string | null;
  ratingDisplay?: string | null;
  fargo?: number | null;
  fargoRobustness?: number | null;
  fargoId?: string | null;
  fargoReadableId?: string | null;
  apaSl?: number | null;
  apaMemberId?: string | null;
  bcaElo?: number | null;
  tapSkill?: number | null;
}): UnifiedPlayerCard {
  const band = input.band || bandForRating(input.rating);
  const display = input.ratingDisplay?.trim() || formatRatingDisplay(input.rating, band);
  const rd = input.rd ?? (input.rating >= 600 ? 70 : 110);
  const matches = input.matches ?? (input.rating >= 600 ? 28 : 8);
  const shadow = computeRackupShadow({ rating: input.rating, rd, matches });
  const fargo = input.fargo != null && Number.isFinite(input.fargo) ? input.fargo : null;
  const fargoRob =
    input.fargoRobustness != null && Number.isFinite(input.fargoRobustness)
      ? input.fargoRobustness
      : null;
  return {
    player: {
      name: input.name,
      apa_sl: input.apaSl ?? null,
      fargo_rating: fargo,
      fargo_robustness: fargo != null ? fargoRob : null,
      bca_elo: input.bcaElo ?? null,
      tap_stats: input.tapSkill != null ? { skill: input.tapSkill } : null,
      rackup_stats: {
        rating: input.rating,
        rd,
        volatility: 0.06,
        matches,
        band,
        display,
        ladder: 'roc_glicko2',
      },
      unified_id: input.unifiedId,
      rackup_shadow: shadow,
      fargo_id: fargo != null ? input.fargoId ?? null : null,
      fargo_readable_id: fargo != null ? input.fargoReadableId ?? null : null,
      apa_member_id: input.apaSl != null ? input.apaMemberId ?? null : null,
    },
    display: {
      fargo: formatFargoPair(fargo, fargoRob),
      rackup_shadow: formatShadowPair(shadow),
      disclaimer: RACKUP_SHADOW_DISCLAIMER,
    },
    meta: {
      user_id: input.userId ?? null,
      fargo_fetched_at: fargo != null ? new Date().toISOString() : null,
      shadow_computed_at: new Date().toISOString(),
      resolve_method: 'demo',
      notes: [
        'ROC Glicko-2 is rackup_stats only; RackUpRate shadow is not official Fargo.',
        'Fargo is read-only and never invented.',
      ],
    },
  };
}

export function rocChipLabel(input: {
  rating?: number | null;
  ratingDisplay?: string | null;
  band?: string | null;
  playerCard?: UnifiedPlayerCard | null;
}): string {
  const fromCard = input.playerCard?.player.rackup_stats?.display?.trim();
  if (fromCard) return fromCard;
  const stored = input.ratingDisplay?.trim();
  if (stored) return stored;
  return formatRatingDisplay(Number(input.rating ?? ROC_DEFAULT_RATING), input.band);
}

export function applyRackupStatsToUser<T extends {
  rating?: number;
  rd?: number;
  matches?: number;
  band?: string;
  ratingDisplay?: string;
  playerCard?: UnifiedPlayerCard;
}>(user: T, card: UnifiedPlayerCard): T {
  const stats = card.player.rackup_stats;
  return {
    ...user,
    playerCard: card,
    ...(stats
      ? {
          rating: stats.rating,
          rd: stats.rd,
          matches: stats.matches,
          band: stats.band,
          ratingDisplay: stats.display,
        }
      : {}),
  };
}

export function isUnifiedPlayerCard(raw: unknown): raw is UnifiedPlayerCard {
  if (!raw || typeof raw !== 'object') return false;
  const player = (raw as { player?: unknown }).player;
  if (!player || typeof player !== 'object') return false;
  return typeof (player as { unified_id?: unknown }).unified_id === 'string';
}
