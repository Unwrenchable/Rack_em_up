/**
 * In-event chip stacks scaled by skill (not a wallet / payment rail).
 *
 * Formula id: `band_v1`
 * Weaker bands start with more chips so a chip-race is a fair handicap.
 *
 * | Band          | Typical rating | Starting chips |
 * |---------------|----------------|----------------|
 * | Novice        | < 400          | 16,000         |
 * | Intermediate  | 400–499        | 13,000         |
 * | Advanced      | 500–599        | 10,000         |
 * | Expert        | 600–699        | 7,500          |
 * | Elite         | 700+           | 5,000          |
 *
 * Band is preferred when present (RealAI `ratingBand`); otherwise derived
 * from rating via `bandForRating`. Default unrated player = Advanced / 10,000.
 *
 * Match pot (chip events): 1,000 chips from loser → winner, capped by the
 * loser's remaining stack. Bust (0 chips) sits out further CHIP_RACE rounds.
 */

import { bandForRating, type RocRatingBand } from '../../users/rating-display';

export const CHIP_FORMULA_ID = 'band_v1';
/** Product lock: chips are tournament counters, never wallet cash. */
export const CHIP_SCOPE = 'in_event_stacks' as const;
export const CHIP_BASE_STACK = 10_000;
export const CHIP_MATCH_POT = 1_000;

export const CHIP_BAND_STACKS: Record<RocRatingBand, number> = {
  Novice: 16_000,
  Intermediate: 13_000,
  Advanced: 10_000,
  Expert: 7_500,
  Elite: 5_000,
};

const BAND_ALIASES: Record<string, RocRatingBand> = {
  novice: 'Novice',
  beginner: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
  elite: 'Elite',
  pro: 'Elite',
};

export function normalizeRatingBand(raw?: string | null): RocRatingBand | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed in CHIP_BAND_STACKS) return trimmed as RocRatingBand;
  return BAND_ALIASES[trimmed.toLowerCase()] ?? null;
}

export function startingChipsForSkill(input: {
  rating?: number | null;
  ratingBand?: string | null;
}): { chips: number; band: RocRatingBand; rating: number; formula: string } {
  const rating =
    input.rating != null && Number.isFinite(Number(input.rating))
      ? Number(input.rating)
      : 500;
  const band = normalizeRatingBand(input.ratingBand) ?? bandForRating(rating);
  const chips = CHIP_BAND_STACKS[band] ?? CHIP_BASE_STACK;
  return { chips, band, rating, formula: CHIP_FORMULA_ID };
}

export function isChipBySkillEnabled(
  mode: string | undefined,
  formatConfig?: Record<string, unknown> | null,
): boolean {
  if (mode === 'CHIP_RACE') return true;
  if (formatConfig?.chipBySkill === true) return true;
  return false;
}

export function chipTransferAmount(
  loserChips: number,
  pot: number = CHIP_MATCH_POT,
): number {
  const stack = Number.isFinite(loserChips) ? Math.max(0, loserChips) : 0;
  const p = Number.isFinite(pot) && pot > 0 ? pot : CHIP_MATCH_POT;
  return Math.min(p, stack);
}
