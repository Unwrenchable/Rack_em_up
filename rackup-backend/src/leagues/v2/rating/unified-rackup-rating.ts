/**
 * Unified RackUp rating normalization (0–3000 scale aligned with users.rating Elo proxy).
 *
 * Source-aware transforms:
 * - fargo / fargo-rate: pass-through (already skill continuum), clamp
 * - apa / apa-skill: skill level ~2–7 mapped into 700–2200 band
 * - bca / scp: rough scale ×10 then clamp
 * - default: clamp external value
 */

export const UNIFIED_RATING_MIN = 100;
export const UNIFIED_RATING_MAX = 3000;

function clampUnified(v: number): number {
  return Math.round(Math.max(UNIFIED_RATING_MIN, Math.min(UNIFIED_RATING_MAX, v)));
}

export function unifyRackupRating(sourceName: string, externalRating: number): number {
  if (!Number.isFinite(externalRating)) return UNIFIED_RATING_MIN;

  const s = (sourceName ?? '').toLowerCase().trim();

  if (s.includes('apa')) {
    // APA skill levels commonly 2–7 (sometimes 1–9).
    const skill = externalRating;
    if (skill >= 1 && skill <= 9) {
      return clampUnified(400 + skill * 250);
    }
    return clampUnified(externalRating);
  }

  if (s.includes('fargo')) {
    // FargoRate typically ~200–800 for amateurs; keep absolute.
    return clampUnified(externalRating);
  }

  if (s.includes('bca') || s.includes('scp')) {
    return clampUnified(externalRating * 10);
  }

  if (s.includes('elo') || s.includes('rackup')) {
    return clampUnified(externalRating);
  }

  return clampUnified(externalRating);
}

/** Map a unified rating back into a coarse skill band (for UI / matchmaking windows). */
export function unifiedToSkillBand(unified: number): 'novice' | 'intermediate' | 'advanced' | 'pro' {
  const u = clampUnified(unified);
  if (u < 900) return 'novice';
  if (u < 1500) return 'intermediate';
  if (u < 2100) return 'advanced';
  return 'pro';
}
