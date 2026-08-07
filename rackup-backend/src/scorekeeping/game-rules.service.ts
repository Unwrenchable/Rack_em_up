import { BadRequestException, Injectable } from '@nestjs/common';

import { isRackupPyramid } from '../games/game-style';

export type PoolGame =
  | '8-ball'
  | '9-ball'
  | '10-ball'
  | 'one-pocket'
  | 'rackup-pyramid'
  | string;

export type GameRulesSnapshot = {
  game: PoolGame;
  raceTo: number;
  aScore: number;
  bScore: number;
  /** Winner if race complete, else null */
  winnerSide: 'A' | 'B' | null;
  isComplete: boolean;
  rules: {
    objectBalls: number;
    winByClearing: boolean;
    notes: string[];
  };
};

/**
 * Lightweight 8/9/10-ball rule helpers for scorekeeping validation.
 * Not a full physics sim — race/score integrity + game metadata for RealAI.
 */
@Injectable()
export class GameRulesService {
  normalizeGame(game?: string | null): PoolGame {
    if (isRackupPyramid(game)) return 'rackup-pyramid';
    const g = (game ?? '9-ball').toLowerCase().replace(/\s+/g, '-');
    if (g.includes('8')) return '8-ball';
    if (g.includes('10')) return '10-ball';
    if (g.includes('one') || g.includes('pocket')) return 'one-pocket';
    return '9-ball';
  }

  describe(game?: string | null): GameRulesSnapshot['rules'] {
    const g = this.normalizeGame(game);
    switch (g) {
      case 'rackup-pyramid':
        return {
          objectBalls: 15,
          winByClearing: false,
          notes: [
            '7ft → 10-ball rack; 9ft → 15-ball rack',
            'Classical scoring: ball number = points; 1-ball = 11',
            'First to skill target points wins (shared rating ladder, weighted K)',
            'Designated cue ball only',
          ],
        };
      case '8-ball':
        return {
          objectBalls: 7,
          winByClearing: true,
          notes: [
            'Solids vs stripes; 8-ball last legally wins',
            'Scratch on 8 loses (house rules may vary)',
            'Break: open table until group claimed',
          ],
        };
      case '10-ball':
        return {
          objectBalls: 10,
          winByClearing: true,
          notes: [
            'Call-shot rotation 1→10',
            '10-ball must be called; push-out after break allowed',
            'Early 10 illegally pocketed is loss (common WPA)',
          ],
        };
      case 'one-pocket':
        return {
          objectBalls: 8,
          winByClearing: false,
          notes: ['Race to designated pocket ball count', 'Defensive safety game'],
        };
      case '9-ball':
      default:
        return {
          objectBalls: 9,
          winByClearing: true,
          notes: [
            'Rotation lowest ball first; 9 wins on legal pocket',
            'Golden break / combo 9 legal when lowest ball contacted first',
            'Push-out optional after break (APA/WPA house variants)',
          ],
        };
    }
  }

  /**
   * Validate race scores. Throws BadRequestException on invalid state.
   */
  assertValidRaceScore(input: {
    game?: string | null;
    raceTo: number;
    aScore: number;
    bScore: number;
    allowIncomplete?: boolean;
  }): GameRulesSnapshot {
    const raceTo = Math.max(1, Math.floor(Number(input.raceTo) || 1));
    const aScore = Math.floor(Number(input.aScore));
    const bScore = Math.floor(Number(input.bScore));

    if (!Number.isFinite(aScore) || !Number.isFinite(bScore) || aScore < 0 || bScore < 0) {
      throw new BadRequestException('Scores must be non-negative integers');
    }
    const pyramid = isRackupPyramid(input.game);
    // Pyramid points can slightly exceed target on multi-ball pots; race games cannot pass race-to
    if (!pyramid && (aScore > raceTo || bScore > raceTo)) {
      throw new BadRequestException(`Score cannot exceed race-to ${raceTo}`);
    }
    if (aScore === raceTo && bScore === raceTo && !pyramid) {
      throw new BadRequestException('Both players cannot reach race-to');
    }

    const isComplete = pyramid
      ? aScore >= raceTo || bScore >= raceTo
      : aScore === raceTo || bScore === raceTo;
    if (!input.allowIncomplete && !isComplete) {
      // callers that only want final validation
    }
    if (isComplete && aScore === bScore) {
      throw new BadRequestException('Final scores cannot be tied at race-to');
    }

    const winnerSide: 'A' | 'B' | null = !isComplete
      ? null
      : aScore > bScore
        ? 'A'
        : bScore > aScore
          ? 'B'
          : null;

    return {
      game: this.normalizeGame(input.game),
      raceTo,
      aScore,
      bScore,
      winnerSide,
      isComplete,
      rules: this.describe(input.game),
    };
  }

  /** Foul classification helper for timeline events. */
  classifyFoul(code?: string): { code: string; severity: 'minor' | 'major'; label: string } {
    const c = (code ?? 'general').toLowerCase();
    if (c.includes('scratch') || c === 'cue_scratch') {
      return { code: 'scratch', severity: 'minor', label: 'Cue ball scratch' };
    }
    if (c.includes('wrong') || c.includes('bad_hit')) {
      return { code: 'bad_hit', severity: 'minor', label: 'Wrong ball first' };
    }
    if (c.includes('8') && c.includes('early')) {
      return { code: 'early_8', severity: 'major', label: 'Early 8-ball (loss risk)' };
    }
    if (c.includes('unsports')) {
      return { code: 'unsportsmanlike', severity: 'major', label: 'Unsportsmanlike' };
    }
    return { code: c, severity: 'minor', label: 'General foul' };
  }
}
