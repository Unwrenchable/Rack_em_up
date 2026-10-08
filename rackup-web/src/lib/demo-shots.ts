import type { ShotOfTheDay } from './types';

/** Offline SOTD sample (Massey-style butterfly). */
export const DEMO_SHOT_OF_DAY: ShotOfTheDay = {
  date: new Date().toISOString().slice(0, 10),
  cycleLength: 52,
  daysUntilRepeat: 52,
  positionInCycle: 0,
  note: 'Demo catalog sample — live API rotates 50+ shots without repeats until the cycle ends.',
  shot: {
    id: 'sotd-41',
    name: 'Butterfly Spread',
    tagline: 'Massey-style wing: two outer balls fly to opposite corners',
    what: 'Hit the 1 full so its wing balls, the 2 and 3, fly into opposite foot corners.',
    why: 'A crowd-pleasing exhibition shot that rewards a perfectly centered hit.',
    difficulty: 'Hard',
    category: 'novelty',
    table: 'Three-ball butterfly on the foot spot',
    setup: [
      '1-ball: on the foot spot (the body).',
      '2-ball: 5.4 inches past the foot string, 1.7 inches from the long string on the left side.',
      '3-ball: 5.4 inches past the foot string, 1.7 inches from the long string on the right side.',
      'Cue ball: on the long string, behind the head string, straight into the 1.',
    ],
    objectBall: '1-ball (drives the 2 and 3)',
    pocket: 'Both foot corners: the 2 in the foot-left corner, the 3 in the foot-right corner',
    tipZone: 'center',
    tipDetail: 'Dead center for even energy left/right.',
    english: 'None. Any side spin biases one wing.',
    elevation: 'Level.',
    speed: 'firm',
    speedDetail: 'Firm, even stroke — both wings need similar pace.',
    bridge: 'Closed, locked.',
    steps: [
      'Square the wings so distances to each corner are equal.',
      'Hit the 1 full and square with center tip.',
      'Follow through straight; do not steer after contact.',
      'Watch the 2 and 3 race toward opposite corners.',
    ],
    tips: [
      'Start with the wings 4.5 inches past the foot string; widen as your make rate climbs.',
      'Film from the foot of the table — classic exhibition angle.',
    ],
    commonMistakes: [
      'Hitting left or right of center on the CB — one wing dies.',
      'Wings not mirrored — fix geometry before blaming stroke.',
    ],
    successLooksLike: 'The 2 drops in the foot-left corner and the 3 in the foot-right corner on the same stroke.',
  },
};