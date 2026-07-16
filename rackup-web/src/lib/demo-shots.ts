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
    difficulty: 'Hard',
    category: 'novelty',
    table: 'Three-ball butterfly on the foot spot',
    setup: [
      'Center ball on the foot spot (the “body”).',
      'Left wing ball ~½ diamond off center toward left corner line.',
      'Right wing ball mirrored toward right corner.',
      'CB in the kitchen, straightish into the center ball.',
    ],
    objectBall: 'Center ball (transfer into both wings)',
    pocket: 'Both corners — wings simultaneously if perfect',
    tipZone: 'center',
    tipDetail: 'Dead center of the cue ball for even energy left/right.',
    english: 'None. Any side spin biases one wing.',
    elevation: 'Level cue.',
    speed: 'firm',
    speedDetail: 'Firm, even stroke — both wings need similar pace.',
    bridge: 'Closed, locked.',
    steps: [
      'Square the wings so distances to each corner are equal.',
      'Hit the center ball full and square with center tip.',
      'Follow through straight; do not steer after contact.',
      'Watch both wings race toward opposite corners.',
    ],
    tips: [
      'Start with wings closer; widen as make rate climbs.',
      'Film from the foot of the table — classic exhibition angle.',
    ],
    commonMistakes: [
      'Hitting left or right of center on the CB — one wing dies.',
      'Wings not mirrored — fix geometry before blaming stroke.',
    ],
    successLooksLike: 'Both wing balls drop opposite corners on the same stroke.',
  },
};