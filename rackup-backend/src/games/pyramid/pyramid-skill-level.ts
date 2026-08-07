/**
 * RackUp Pyramid skill presets.
 * Table size → rack ball count; skill → points-to-win, call-shot, rating weight.
 */

export enum PyramidSkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  PRO = 'PRO',
}

/** American table sizes supported for Pyramid. */
export type PyramidTableSizeFt = 7 | 9;

export type CallShotMode = 'no' | 'optional' | 'yes';

export type PyramidSkillPreset = {
  skillLevel: PyramidSkillLevel;
  /** Points to win on 7 ft (10-ball rack) */
  points7ft: number;
  /** Points to win on 9 ft (15-ball rack) */
  points9ft: number;
  callShot: CallShotMode;
  /** Multiplier applied to Elo K for this skill tier */
  ratingWeight: number;
  label: string;
};

export const PYRAMID_SKILL_PRESETS: Record<PyramidSkillLevel, PyramidSkillPreset> = {
  [PyramidSkillLevel.BEGINNER]: {
    skillLevel: PyramidSkillLevel.BEGINNER,
    points7ft: 25,
    points9ft: 40,
    callShot: 'no',
    ratingWeight: 0.7,
    label: 'Beginner',
  },
  [PyramidSkillLevel.INTERMEDIATE]: {
    skillLevel: PyramidSkillLevel.INTERMEDIATE,
    points7ft: 35,
    points9ft: 55,
    callShot: 'no',
    ratingWeight: 0.85,
    label: 'Intermediate',
  },
  [PyramidSkillLevel.ADVANCED]: {
    skillLevel: PyramidSkillLevel.ADVANCED,
    points7ft: 45,
    points9ft: 71,
    callShot: 'optional',
    ratingWeight: 1.0,
    label: 'Advanced',
  },
  [PyramidSkillLevel.PRO]: {
    skillLevel: PyramidSkillLevel.PRO,
    points7ft: 50,
    points9ft: 71,
    callShot: 'yes',
    ratingWeight: 1.15,
    label: 'Pro',
  },
};

/** 7 ft → 10-ball rack; 9 ft → 15-ball rack */
export function rackBallCountForTable(tableSizeFt: PyramidTableSizeFt): 10 | 15 {
  return tableSizeFt === 7 ? 10 : 15;
}

export function pointsToWin(
  tableSizeFt: PyramidTableSizeFt,
  skill: PyramidSkillLevel,
): number {
  const preset = PYRAMID_SKILL_PRESETS[skill];
  return tableSizeFt === 7 ? preset.points7ft : preset.points9ft;
}

export function parsePyramidSkillLevel(raw?: string | null): PyramidSkillLevel {
  const s = (raw ?? 'INTERMEDIATE').toUpperCase();
  if (s in PYRAMID_SKILL_PRESETS) return s as PyramidSkillLevel;
  if (s.startsWith('BEG')) return PyramidSkillLevel.BEGINNER;
  if (s.startsWith('INT')) return PyramidSkillLevel.INTERMEDIATE;
  if (s.startsWith('ADV')) return PyramidSkillLevel.ADVANCED;
  if (s.startsWith('PRO')) return PyramidSkillLevel.PRO;
  return PyramidSkillLevel.INTERMEDIATE;
}

export function parseTableSizeFt(raw?: number | string | null): PyramidTableSizeFt {
  const n = Number(raw);
  if (n === 7) return 7;
  if (n === 9) return 9;
  throw new Error('tableSizeFt must be 7 or 9');
}

/** Full preset for a table + skill combo (balls from table, rest from skill). */
export function resolvePyramidConfig(
  tableSizeFt: PyramidTableSizeFt,
  skillLevel: PyramidSkillLevel,
) {
  const preset = PYRAMID_SKILL_PRESETS[skillLevel];
  const rackBalls = rackBallCountForTable(tableSizeFt);
  return {
    gameStyle: 'rackup-pyramid' as const,
    tableSizeFt,
    skillLevel,
    rackBalls,
    pointsToWin: pointsToWin(tableSizeFt, skillLevel),
    callShot: preset.callShot,
    ratingWeight: preset.ratingWeight,
    label: `${preset.label} · ${tableSizeFt}ft · ${rackBalls}-ball`,
  };
}
