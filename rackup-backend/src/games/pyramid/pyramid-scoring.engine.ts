import { BadRequestException } from '@nestjs/common';
import {
  pointsToWin,
  PyramidSkillLevel,
  PyramidTableSizeFt,
  rackBallCountForTable,
  resolvePyramidConfig,
} from './pyramid-skill-level';

/**
 * Classical Pyramid scoring:
 * - Pocketed ball scores its number
 * - Exception: 1-ball is worth 11 points
 * - Designated cue ball only (cue never scores)
 * - First to points-to-win wins
 */

export type PyramidLiveState = {
  tableSizeFt: PyramidTableSizeFt;
  skillLevel: PyramidSkillLevel;
  rackBalls: 10 | 15;
  pointsToWin: number;
  callShot: string;
  ratingWeight: number;
  /** Balls still on table (object balls only) */
  ballsRemaining: number[];
  /** Balls pocketed this match: ballNumber → player side A|B */
  pocketed: Record<string, 'A' | 'B'>;
  aPoints: number;
  bPoints: number;
  winnerSide: 'A' | 'B' | null;
  isComplete: boolean;
};

/** Point value of an object ball (1-ball = 11). */
export function ballPointValue(ballNumber: number): number {
  if (ballNumber === 1) return 11;
  if (ballNumber < 1 || ballNumber > 15) {
    throw new BadRequestException(`Invalid ball number: ${ballNumber}`);
  }
  return ballNumber;
}

export function initialObjectBalls(rackBalls: 10 | 15): number[] {
  const n = rackBalls;
  return Array.from({ length: n }, (_, i) => i + 1);
}

export function createInitialPyramidState(
  tableSizeFt: PyramidTableSizeFt,
  skillLevel: PyramidSkillLevel,
): PyramidLiveState {
  const cfg = resolvePyramidConfig(tableSizeFt, skillLevel);
  const balls = initialObjectBalls(cfg.rackBalls);
  return {
    tableSizeFt,
    skillLevel,
    rackBalls: cfg.rackBalls,
    pointsToWin: cfg.pointsToWin,
    callShot: cfg.callShot,
    ratingWeight: cfg.ratingWeight,
    ballsRemaining: balls,
    pocketed: {},
    aPoints: 0,
    bPoints: 0,
    winnerSide: null,
    isComplete: false,
  };
}

export function recomputePoints(state: PyramidLiveState): {
  aPoints: number;
  bPoints: number;
} {
  let aPoints = 0;
  let bPoints = 0;
  for (const [ballStr, side] of Object.entries(state.pocketed)) {
    const pts = ballPointValue(Number(ballStr));
    if (side === 'A') aPoints += pts;
    else bPoints += pts;
  }
  return { aPoints, bPoints };
}

/**
 * Apply pocketed balls for one side. Idempotent for already-pocketed balls (throws).
 */
export function pocketBalls(
  state: PyramidLiveState,
  side: 'A' | 'B',
  ballNumbers: number[],
): PyramidLiveState {
  if (state.isComplete) {
    throw new BadRequestException('Match already complete');
  }
  const next: PyramidLiveState = {
    ...state,
    ballsRemaining: [...state.ballsRemaining],
    pocketed: { ...state.pocketed },
  };

  for (const raw of ballNumbers) {
    const ball = Math.floor(Number(raw));
    if (!Number.isFinite(ball) || ball < 1 || ball > state.rackBalls) {
      throw new BadRequestException(
        `Ball ${raw} not in this rack (1–${state.rackBalls})`,
      );
    }
    if (next.pocketed[String(ball)]) {
      throw new BadRequestException(`Ball ${ball} already pocketed`);
    }
    if (!next.ballsRemaining.includes(ball)) {
      throw new BadRequestException(`Ball ${ball} is not on the table`);
    }
    next.pocketed[String(ball)] = side;
    next.ballsRemaining = next.ballsRemaining.filter((b) => b !== ball);
  }

  const { aPoints, bPoints } = recomputePoints(next);
  next.aPoints = aPoints;
  next.bPoints = bPoints;

  // First to reach target wins (can exceed target mid-run of multi-ball pocket)
  if (aPoints >= state.pointsToWin && bPoints >= state.pointsToWin) {
    // Simultaneous reach: higher score wins; if equal, last pocketing side wins
    if (aPoints !== bPoints) {
      next.winnerSide = aPoints > bPoints ? 'A' : 'B';
    } else {
      next.winnerSide = side;
    }
    next.isComplete = true;
  } else if (aPoints >= state.pointsToWin) {
    next.winnerSide = 'A';
    next.isComplete = true;
  } else if (bPoints >= state.pointsToWin) {
    next.winnerSide = 'B';
    next.isComplete = true;
  }

  return next;
}

export function scoreboardFromState(state: PyramidLiveState) {
  const remainingPoints = state.ballsRemaining.reduce(
    (sum, b) => sum + ballPointValue(b),
    0,
  );
  return {
    gameStyle: 'rackup-pyramid',
    tableSizeFt: state.tableSizeFt,
    skillLevel: state.skillLevel,
    rackBalls: state.rackBalls,
    pointsToWin: state.pointsToWin,
    callShot: state.callShot,
    ratingWeight: state.ratingWeight,
    aPoints: state.aPoints,
    bPoints: state.bPoints,
    ballsRemaining: [...state.ballsRemaining].sort((a, b) => a - b),
    ballsRemainingCount: state.ballsRemaining.length,
    remainingPointsOnTable: remainingPoints,
    pocketed: { ...state.pocketed },
    winnerSide: state.winnerSide,
    isComplete: state.isComplete,
    /** Convenience for UI progress bars */
    aProgress: Math.min(1, state.aPoints / state.pointsToWin),
    bProgress: Math.min(1, state.bPoints / state.pointsToWin),
  };
}

/** Max theoretical points from a full rack (sanity). */
export function maxRackPoints(rackBalls: 10 | 15): number {
  let t = 0;
  for (let i = 1; i <= rackBalls; i++) t += ballPointValue(i);
  return t;
}

// re-export helpers used by match layer
export { pointsToWin, rackBallCountForTable, resolvePyramidConfig };
