/**
 * Standard solid/stripe pool ball colors (APA / BCA style).
 * Cue ball is always white — never use these for the cue.
 */
export type PoolBallStyle = {
  fill: string;
  stripe?: boolean;
  text: string;
  /** Darker rim for depth */
  stroke: string;
};

/** Solids 1–8, stripes 9–15 (same hue as solid counterpart). */
const SOLID: Record<number, { fill: string; text: string; stroke: string }> = {
  1: { fill: '#f5c518', text: '#1a1a1a', stroke: '#b8940a' }, // yellow
  2: { fill: '#1e5aa8', text: '#fff', stroke: '#0f3a70' }, // blue
  3: { fill: '#c62828', text: '#fff', stroke: '#8b1c1c' }, // red
  4: { fill: '#6a1b9a', text: '#fff', stroke: '#4a126c' }, // purple
  5: { fill: '#ef6c00', text: '#fff', stroke: '#a84a00' }, // orange
  6: { fill: '#2e7d32', text: '#fff', stroke: '#1b5e20' }, // green
  7: { fill: '#5d4037', text: '#fff', stroke: '#3e2723' }, // maroon / brown
  8: { fill: '#111111', text: '#fff', stroke: '#000000' }, // black
};

export function poolBallStyle(ballId: number): PoolBallStyle {
  const n = Math.abs(Math.floor(ballId)) || 1;
  if (n === 0) {
    return { fill: '#f5f5f5', text: '#222', stroke: '#bbb' };
  }
  const base = SOLID[((n - 1) % 8) + 1] ?? SOLID[1];
  if (n >= 9 && n <= 15) {
    return { ...base, stripe: true };
  }
  return base;
}

/** Cue ball — always white. */
export const CUE_BALL_STYLE: PoolBallStyle = {
  fill: '#f8f8f8',
  text: '#333',
  stroke: '#c9a227',
};
