/**
 * One-shot regenerator for realistic SOTD catalogue diagrams.
 * Run: npx ts-node -T scripts/generate-sotd-maps.ts
 *
 * Layouts keep the intended corridor clear: extras sit off the cue→OB→pocket
 * (or bank/kick) lane unless they are real combo/carom contacts. Jump hops
 * go over a blocker on a dashed airborne segment — never a solid zigzag.
 */
import * as fs from 'fs';
import * as path from 'path';

import { SHOT_CATALOG } from '../src/shots/shot-catalog';
import { SOTD_SHOT_MAPS, type SotdShotMap } from '../src/realai/v2/sotd-shot-maps';
import {
  type PocketId,
  type RailId,
  type SotdGeomPoint as Pt,
  LANE_CLEARANCE,
  POCKETS,
  add,
  aimBehind,
  clampOnTable,
  dist,
  findRailChain,
  isOnTable,
  isPathContact,
  norm,
  pathFromPoints,
  perp,
  pointToSegmentDistance,
  railChain,
  roundPt,
  scale,
  sub,
  validateSotdShotMap,
  formatGeomReport,
  type SotdPathKind,
} from '../src/realai/v2/sotd-shot-map-geometry';

const COORDINATE_SYSTEM = {
  x: '0=head rail → 100=foot rail',
  y: '0=bottom long rail → 50=top long rail',
  units: 'normalized table percent (9-foot aspect 2:1)',
};

type BallRole = 'object' | 'blocker' | 'prop' | 'helper';
type BallSpec = { ballId: number; x: number; y: number; role?: BallRole };

type LayoutKind = 'line' | 'cut' | 'bank' | 'kick' | 'carom' | 'curve' | 'jump';

type Layout = {
  pocket: PocketId;
  kind: LayoutKind;
  cue?: Pt;
  cueGap?: number;
  /** Cut angle (deg) between cue→OB and OB→pocket. Used by kind:'cut'. */
  cutDeg?: number;
  cutSign?: 1 | -1;
  balls: BallSpec[];
  rails?: RailId[];
  railCount?: number;
  via?: Pt[];
  /** Extra path points after the last object (before pocket), e.g. combo then bank. */
  afterObject?: Pt[];
  /** Jump: override pocket (orch may aim at a rail, not a named corner). */
  pocketPt?: Pt;
  jumpTakeoff?: Pt;
  jumpApex?: Pt;
  jumpLanding?: Pt;
  /** When true, leave blocker/cue where the layout put them (orch coords). */
  lockBalls?: boolean;
};

const FOOT_SPOT: Pt = { x: 75, y: 25 };

function linedBalls(pocket: Pt, start: Pt, ids: number[], spacing = 12): BallSpec[] {
  const away = norm(sub(start, pocket));
  return ids.map((ballId, i) => {
    const p = add(start, scale(away, spacing * i));
    if (!isOnTable(p)) {
      throw new Error(`lined ball #${ballId} off table at ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return { ballId, x: p.x, y: p.y, role: 'object' as const };
  });
}

/** Cue sitting off the OB→pocket line by `cutDeg` (a real cut, not a crooked straight). */
function cutCue(ob: Pt, pocket: Pt, cutDeg: number, gap: number, sign: 1 | -1 = 1): Pt {
  const toPk = norm(sub(pocket, ob));
  const rad = (cutDeg * Math.PI) / 180;
  const incoming = {
    x: toPk.x * Math.cos(rad) - sign * toPk.y * Math.sin(rad),
    y: toPk.y * Math.cos(rad) + sign * toPk.x * Math.sin(rad),
  };
  return clampOnTable(sub(ob, scale(incoming, gap)));
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Arc waypoint so a jump/curve path goes around a blocker on the straight line. */
function arcVia(from: Pt, to: Pt, bulge: number, sign: 1 | -1 = 1): Pt {
  const mid = midpoint(from, to);
  const n = norm(perp(sub(to, from)));
  return clampOnTable(add(mid, scale(n, bulge * sign)));
}

const LAYOUTS: Record<string, Layout> = {
  'sotd-01': {
    kind: 'bank',
    pocket: 'side-far',
    rails: ['near'],
    balls: [
      { ballId: 1, x: 62.5, y: 3.4, role: 'object' },
      { ballId: 9, x: 86, y: 40, role: 'prop' },
    ],
    cueGap: 18,
  },
  'sotd-02': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [{ ballId: 1, x: FOOT_SPOT.x, y: FOOT_SPOT.y, role: 'object' }],
    cueGap: 14,
  },
  'sotd-03': {
    kind: 'line',
    pocket: 'foot-near',
    balls: [{ ballId: 1, x: FOOT_SPOT.x, y: FOOT_SPOT.y, role: 'object' }],
    cueGap: 13,
  },
  'sotd-04': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [
      { ballId: 1, x: 72, y: 22, role: 'object' },
      { ballId: 2, x: 78, y: 14, role: 'prop' },
      { ballId: 3, x: 84, y: 14, role: 'prop' },
    ],
    cueGap: 20,
  },
  'sotd-05': {
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 34,
    cutSign: 1,
    cueGap: 22,
    balls: [{ ballId: 1, x: 80, y: 16, role: 'object' }],
  },
  'sotd-06': {
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 28,
    cutSign: -1,
    cueGap: 18,
    balls: [{ ballId: 1, x: 72, y: 20, role: 'object' }],
  },
  'sotd-07': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 16, y: 10 },
    rails: ['near', 'foot'],
    balls: [{ ballId: 1, x: 84, y: 38, role: 'object' }],
  },
  'sotd-08': (() => {
    // Classic spot-to-corner: A on the foot spot, B on the same line to the corner.
    const pocket = 'foot-far' as const;
    const b1 = { x: FOOT_SPOT.x, y: FOOT_SPOT.y };
    const toward = norm(sub(POCKETS[pocket], b1));
    const b2 = add(b1, scale(toward, 12));
    return {
      kind: 'line' as const,
      pocket,
      balls: [
        { ballId: 1, x: b1.x, y: b1.y, role: 'object' as const },
        { ballId: 2, x: b2.x, y: b2.y, role: 'object' as const },
      ],
      cueGap: 14,
    };
  })(),
  'sotd-09': {
    kind: 'carom',
    pocket: 'foot-near',
    balls: [
      { ballId: 9, x: 58, y: 30, role: 'helper' },
      { ballId: 1, x: 76, y: 16, role: 'object' },
    ],
    cueGap: 16,
  },
  'sotd-10': {
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 62,
    cutSign: -1,
    cueGap: 20,
    balls: [{ ballId: 1, x: 86, y: 4.8, role: 'object' }],
  },
  'sotd-11': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [{ ballId: 1, x: 72, y: 22, role: 'object' }],
    cueGap: 28,
  },
  'sotd-12': {
    kind: 'line',
    pocket: 'foot-near',
    balls: [{ ballId: 1, x: 76, y: 30, role: 'object' }],
    cueGap: 22,
  },
  'sotd-13': {
    kind: 'bank',
    pocket: 'foot-far',
    rails: ['near', 'head'],
    balls: [{ ballId: 9, x: 38, y: 14, role: 'object' }],
    cueGap: 16,
  },
  'sotd-14': {
    kind: 'curve',
    pocket: 'foot-far',
    cue: { x: 28, y: 16 },
    via: [arcVia({ x: 28, y: 16 }, { x: 74, y: 36 }, 10, 1)],
    balls: [
      { ballId: 1, x: 74, y: 36, role: 'object' },
      { ballId: 8, x: 50, y: 26, role: 'blocker' },
    ],
  },
  'sotd-15': {
    kind: 'jump',
    pocket: 'foot-near',
    pocketPt: { x: 100, y: 25 },
    cue: { x: 24, y: 25.5 },
    lockBalls: true,
    jumpTakeoff: { x: 39, y: 25.4 },
    jumpApex: { x: 45, y: 30.5 },
    jumpLanding: { x: 51, y: 25.4 },
    balls: [
      { ballId: 1, x: 70, y: 25.2, role: 'object' },
      { ballId: 7, x: 45, y: 25.2, role: 'blocker' },
    ],
  },
  'sotd-16': {
    kind: 'curve',
    pocket: 'foot-far',
    cue: { x: 22, y: 12 },
    via: [
      { x: 20, y: 28 },
      { x: 36, y: 42 },
    ],
    balls: [
      { ballId: 1, x: 64, y: 36, role: 'object' },
      { ballId: 5, x: 40, y: 24, role: 'blocker' },
    ],
  },
  'sotd-17': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 16, y: 12 },
    rails: ['near'],
    balls: [{ ballId: 1, x: 80, y: 36, role: 'object' }],
  },
  'sotd-18': (() => {
    const pocket = POCKETS['foot-far'];
    const last = { x: 86, y: 42 };
    return {
      kind: 'line' as const,
      pocket: 'foot-far' as const,
      balls: linedBalls(pocket, last, [2, 1], 3.1).reverse(),
      cueGap: 14,
    };
  })(),
  'sotd-19': {
    kind: 'bank',
    pocket: 'head-far',
    rails: ['near'],
    balls: [{ ballId: 1, x: 70, y: 5.2, role: 'object' }],
    cueGap: 16,
  },
  'sotd-20': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [{ ballId: 1, x: 78, y: 32, role: 'object' }],
    cueGap: 36,
  },
  'sotd-21': {
    kind: 'bank',
    pocket: 'head-near',
    rails: ['far'],
    balls: [{ ballId: 1, x: 24, y: 18, role: 'object' }],
    cueGap: 14,
  },
  'sotd-22': {
    kind: 'kick',
    pocket: 'side-near',
    cue: { x: 20, y: 14 },
    rails: ['far'],
    balls: [{ ballId: 1, x: 54, y: 4.6, role: 'object' }],
  },
  'sotd-23': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [
      { ballId: 1, x: 70, y: 24, role: 'object' },
      { ballId: 2, x: 80, y: 16, role: 'prop' },
      { ballId: 3, x: 80, y: 10, role: 'prop' },
    ],
    cueGap: 18,
  },
  'sotd-24': {
    kind: 'kick',
    pocket: 'foot-near',
    cue: { x: 16, y: 24 },
    rails: ['near'],
    balls: [
      { ballId: 1, x: 74, y: 18, role: 'object' },
      { ballId: 8, x: 48, y: 40, role: 'prop' },
    ],
  },
  'sotd-25': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 64.2, y: 3.6 },
    balls: [{ ballId: 1, x: 70, y: 3.4, role: 'object' }],
  },
  'sotd-26': {
    kind: 'cut',
    pocket: 'side-near',
    cutDeg: 36,
    cutSign: 1,
    cueGap: 18,
    balls: [{ ballId: 1, x: 58, y: 14, role: 'object' }],
  },
  'sotd-27': {
    kind: 'bank',
    pocket: 'foot-far',
    rails: ['near'],
    balls: [{ ballId: 1, x: 48, y: 14, role: 'object' }],
    cueGap: 16,
  },
  'sotd-28': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 16, y: 10 },
    rails: ['near'],
    balls: [
      { ballId: 1, x: 80, y: 36, role: 'object' },
      { ballId: 8, x: 42, y: 40, role: 'prop' },
    ],
  },
  'sotd-29': {
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 40,
    cutSign: -1,
    cueGap: 16,
    balls: [{ ballId: 1, x: 74, y: 7.2, role: 'object' }],
  },
  'sotd-30': {
    kind: 'curve',
    pocket: 'foot-far',
    cue: { x: 28, y: 14 },
    via: [arcVia({ x: 28, y: 14 }, { x: 72, y: 36 }, 11, 1)],
    balls: [
      { ballId: 1, x: 72, y: 36, role: 'object' },
      { ballId: 8, x: 50, y: 24, role: 'blocker' },
    ],
  },
  'sotd-31': (() => {
    const pocket = POCKETS['foot-far'];
    const last = { x: 86, y: 42 };
    return {
      kind: 'line' as const,
      pocket: 'foot-far' as const,
      balls: linedBalls(pocket, last, [3, 2, 1], 11).reverse(),
      cueGap: 13,
    };
  })(),
  'sotd-32': {
    kind: 'jump',
    pocket: 'foot-far',
    cue: { x: 24, y: 16 },
    balls: [
      { ballId: 1, x: 76, y: 34, role: 'object' },
      { ballId: 7, x: 50, y: 24, role: 'blocker' },
    ],
  },
  'sotd-33': {
    kind: 'cut',
    pocket: 'side-near',
    cutDeg: 22,
    cutSign: 1,
    cueGap: 16,
    balls: [{ ballId: 1, x: 58, y: 4.8, role: 'object' }],
  },
  'sotd-34': {
    kind: 'bank',
    pocket: 'side-far',
    rails: ['near'],
    balls: [{ ballId: 1, x: 68, y: 4.0, role: 'object' }],
    cueGap: 17,
  },
  'sotd-35': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [{ ballId: 1, x: 78, y: 36, role: 'object' }],
    cueGap: 40,
  },
  'sotd-36': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 16, y: 12 },
    rails: ['far'],
    balls: [{ ballId: 1, x: 82, y: 36, role: 'object' }],
  },
  'sotd-37': {
    kind: 'kick',
    pocket: 'side-near',
    cue: { x: 22, y: 14 },
    rails: ['far'],
    balls: [{ ballId: 1, x: 56, y: 16, role: 'object' }],
  },
  'sotd-38': {
    kind: 'cut',
    pocket: 'foot-far',
    cutDeg: 32,
    cutSign: -1,
    cueGap: 18,
    balls: [{ ballId: 8, x: 70, y: 28, role: 'object' }],
  },
  'sotd-39': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 16, y: 12 },
    rails: ['far', 'foot', 'near', 'head'],
    balls: [{ ballId: 1, x: 70, y: 40, role: 'object' }],
  },
  'sotd-40': (() => {
    // Combo-bank: A drives B along the line of centers into a legal near-rail bank.
    const pocket = 'foot-far' as const;
    const b2 = { x: 62, y: 16 };
    const chain = railChain(b2, POCKETS[pocket], ['near']);
    if (!chain) throw new Error('sotd-40: no near-rail bank from B');
    const railHit = chain[1];
    const b1 = aimBehind(b2, railHit, 14);
    return {
      kind: 'line' as const,
      pocket,
      balls: [
        { ballId: 1, x: b1.x, y: b1.y, role: 'object' as const },
        { ballId: 2, x: b2.x, y: b2.y, role: 'object' as const },
      ],
      cueGap: 14,
      afterObject: [railHit],
    };
  })(),
  'sotd-41': {
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 26,
    cutSign: 1,
    cueGap: 18,
    balls: [
      { ballId: 1, x: 66, y: 18, role: 'object' },
      { ballId: 8, x: 66, y: 38, role: 'prop' },
    ],
  },
  'sotd-42': (() => {
    const pocket = POCKETS['foot-far'];
    const last = { x: 88, y: 43.2 };
    return {
      kind: 'line' as const,
      pocket: 'foot-far' as const,
      balls: linedBalls(pocket, last, [4, 3, 2, 1], 3.2).reverse(),
      cueGap: 12,
    };
  })(),
  'sotd-43': {
    kind: 'line',
    pocket: 'foot-far',
    cue: { x: 24, y: 26 },
    balls: [
      { ballId: 1, x: 78, y: 26, role: 'object' },
      { ballId: 8, x: 50, y: 20.5, role: 'blocker' },
      { ballId: 7, x: 50, y: 31.5, role: 'blocker' },
    ],
  },
  'sotd-44': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 20, y: 12 },
    rails: ['near', 'foot', 'far'],
    balls: [{ ballId: 1, x: 72, y: 36, role: 'object' }],
  },
  'sotd-45': {
    kind: 'jump',
    pocket: 'foot-near',
    cue: { x: 22, y: 28 },
    balls: [
      { ballId: 1, x: 80, y: 16, role: 'object' },
      { ballId: 7, x: 50, y: 22, role: 'blocker' },
    ],
  },
  'sotd-46': {
    kind: 'bank',
    pocket: 'foot-near',
    rails: ['near', 'far'],
    balls: [{ ballId: 1, x: 34, y: 10, role: 'object' }],
    cueGap: 15,
  },
  'sotd-47': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [
      { ballId: 1, x: 60, y: 24, role: 'object' },
      { ballId: 8, x: 60, y: 32, role: 'prop' },
    ],
    cueGap: 18,
  },
  'sotd-48': {
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 42,
    cutSign: -1,
    cueGap: 18,
    balls: [{ ballId: 1, x: 68, y: 26, role: 'object' }],
  },
  'sotd-49': {
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 68,
    cutSign: -1,
    cueGap: 22,
    balls: [{ ballId: 1, x: 84, y: 7.5, role: 'object' }],
  },
  'sotd-50': {
    kind: 'jump',
    pocket: 'foot-far',
    cue: { x: 24, y: 14 },
    balls: [
      { ballId: 1, x: 74, y: 34, role: 'object' },
      { ballId: 7, x: 48, y: 22, role: 'blocker' },
    ],
  },
  'sotd-51': {
    kind: 'bank',
    pocket: 'side-far',
    rails: ['near'],
    balls: [{ ballId: 1, x: 72, y: 4.2, role: 'object' }],
    cueGap: 17,
  },
  'sotd-52': {
    kind: 'cut',
    pocket: 'foot-far',
    cutDeg: 24,
    cutSign: 1,
    cueGap: 16,
    balls: [
      { ballId: 1, x: 74, y: 26, role: 'object' },
      { ballId: 8, x: 58, y: 40, role: 'prop' },
    ],
  },
};

function primaryOf(balls: BallSpec[]): BallSpec {
  return balls.find((b) => !b.role || b.role === 'object') ?? balls[0];
}

function resolveRails(from: Pt, to: Pt, layout: Layout): Pt[] {
  if (layout.rails?.length) {
    const pts = railChain(from, to, layout.rails);
    if (pts) return pts;
    throw new Error(`named rails ${layout.rails.join('→')} miss ${from.x},${from.y} → ${to.x},${to.y}`);
  }
  const n = layout.railCount ?? 1;
  const found = findRailChain(from, to, n);
  if (found) return found.pts;
  throw new Error(`no ${n}-rail path ${from.x},${from.y} → ${to.x},${to.y}`);
}

function nudgeOffLane(
  balls: BallSpec[],
  pts: Pt[],
  airborneSegs: number[] = [],
  minDist = LANE_CLEARANCE + 0.8,
): BallSpec[] {
  const air = new Set(airborneSegs);
  return balls.map((b) => {
    if (isPathContact(b, pts, 3)) return b;
    if (b.role === 'blocker') {
      const underAir = pts.some((_, i) => {
        if (!air.has(i) || i >= pts.length - 1) return false;
        return pointToSegmentDistance(b, pts[i], pts[i + 1]) < minDist + 1.2;
      });
      if (underAir) return b;
    }
    let { x, y } = b;
    for (let iter = 0; iter < 10; iter++) {
      let worst: { d: number; nx: number; ny: number } | null = null;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const c = pts[i + 1];
        const d = pointToSegmentDistance({ x, y }, a, c);
        if (d >= minDist) continue;
        const n = norm(perp(sub(c, a)));
        const mid = midpoint(a, c);
        const side = (x - mid.x) * n.x + (y - mid.y) * n.y;
        const sign = side < 0 ? -1 : 1;
        if (!worst || d < worst.d) worst = { d, nx: n.x * sign, ny: n.y * sign };
      }
      if (!worst) break;
      const pushed = clampOnTable(
        { x: x + worst.nx * (minDist - worst.d + 0.7), y: y + worst.ny * (minDist - worst.d + 0.7) },
        3,
      );
      x = pushed.x;
      y = pushed.y;
    }
    return { ...b, x, y };
  });
}

function placeBlockerOnLine(cue: Pt, ob: Pt, preferred: Pt): Pt {
  const t = 0.48;
  const onLine = { x: cue.x + (ob.x - cue.x) * t, y: cue.y + (ob.y - cue.y) * t };
  // Prefer the caller's x/y if they already sit on the line; otherwise snap to the line.
  if (pointToSegmentDistance(preferred, cue, ob) < 1.6) return clampOnTable(preferred);
  return clampOnTable(onLine);
}

function yOnLine(a: Pt, b: Pt, x: number): number {
  if (Math.abs(b.x - a.x) < 1e-6) return a.y;
  const t = (x - a.x) / (b.x - a.x);
  return a.y + t * (b.y - a.y);
}

function buildPath(layout: Layout): {
  cue: Pt;
  pocket: Pt;
  balls: BallSpec[];
  pts: Pt[];
  kinds: Array<SotdPathKind | undefined>;
} {
  const pocket = layout.pocketPt ? { ...layout.pocketPt } : POCKETS[layout.pocket];
  const balls = layout.balls.map((b) => ({ ...b }));
  const primary = primaryOf(balls);
  const ob = { x: primary.x, y: primary.y };
  const gap = layout.cueGap ?? 15;

  if (layout.kind === 'bank') {
    const bankPts = resolveRails(ob, pocket, layout);
    const firstHit = bankPts[1] ?? pocket;
    const cue = clampOnTable(layout.cue ?? aimBehind(ob, firstHit, gap));
    return { cue, pocket, balls, pts: [cue, ...bankPts], kinds: [] };
  }

  if (layout.kind === 'kick') {
    const cue = clampOnTable(layout.cue ?? { x: 18, y: 12 });
    const kickPts = resolveRails(cue, ob, layout);
    return { cue, pocket, balls, pts: [...kickPts, pocket], kinds: [] };
  }

  if (layout.kind === 'carom') {
    const helper = balls.find((b) => b.role === 'helper') ?? balls.find((b) => b.ballId !== primary.ballId);
    const helperPt = helper ? { x: helper.x, y: helper.y } : aimBehind(ob, pocket, 12);
    const cue = clampOnTable(layout.cue ?? aimBehind(helperPt, ob, gap));
    return { cue, pocket, balls, pts: [cue, helperPt, ob, pocket], kinds: [] };
  }

  if (layout.kind === 'jump') {
    const cue = layout.lockBalls && layout.cue
      ? { ...layout.cue }
      : clampOnTable(layout.cue ?? aimBehind(ob, pocket, gap));
    const blocker = balls.find((b) => b.role === 'blocker');
    const bx = blocker?.x ?? (cue.x + ob.x) / 2;
    const takeoffX = bx - 6;
    const landingX = bx + 6;
    const takeoff = layout.jumpTakeoff ?? {
      x: takeoffX,
      y: yOnLine(cue, ob, takeoffX),
    };
    const apex = layout.jumpApex ?? { x: bx, y: cue.y + 5 };
    const landing = layout.jumpLanding ?? {
      x: landingX,
      y: yOnLine(cue, ob, landingX),
    };
    return {
      cue,
      pocket,
      balls,
      pts: [cue, takeoff, apex, landing, ob, pocket],
      kinds: ['ground', 'airborne', 'airborne', 'ground', 'object'],
    };
  }

  if (layout.kind === 'curve') {
    const cue = clampOnTable(layout.cue ?? aimBehind(ob, pocket, gap));
    const via = (layout.via ?? []).map((p) => clampOnTable(p));
    const blocker = balls.find((b) => b.role === 'blocker');
    if (blocker && via.length) {
      const snapped = placeBlockerOnLine(cue, ob, blocker);
      blocker.x = snapped.x;
      blocker.y = snapped.y;
    }
    return { cue, pocket, balls, pts: [cue, ...via, ob, pocket], kinds: [] };
  }

  if (layout.kind === 'cut') {
    const deg = layout.cutDeg ?? 32;
    const sign = layout.cutSign ?? 1;
    const cue = clampOnTable(layout.cue ?? cutCue(ob, pocket, deg, gap, sign));
    return { cue, pocket, balls, pts: [cue, ob, pocket], kinds: [] };
  }

  const objects = balls.filter((b) => !b.role || b.role === 'object');
  const objectPts = objects.map((b) => ({ x: b.x, y: b.y }));
  const aim = objectPts[0] ?? ob;
  const toward = objectPts[1] ?? pocket;
  const cue = clampOnTable(layout.cue ?? aimBehind(aim, toward, gap));
  const after = layout.afterObject ?? [];
  return { cue, pocket, balls, pts: [cue, ...objectPts, ...after, pocket], kinds: [] };
}

function estimateCbRest(tip: string, cue: Pt, ob: Pt, pocket: Pt): Pt {
  const t = tip.toLowerCase();
  const line = norm(sub(ob, cue));
  const toPk = norm(sub(pocket, ob));
  let end: Pt;
  if (t.includes('6') || t.includes('low') || t.includes('draw')) {
    end = add(ob, scale(line, -14));
  } else if (t.includes('12') || t.includes('high') || t.includes('follow')) {
    end = add(ob, scale(line, 14));
  } else if (t.includes('3') || t.includes('right')) {
    end = add(ob, add(scale(line, 6), { x: 0, y: 8 }));
  } else if (t.includes('9') || t.includes('left')) {
    end = add(ob, add(scale(line, 6), { x: 0, y: -8 }));
  } else {
    end = add(ob, scale(toPk, -6));
  }
  return roundPt(clampOnTable(end, 3));
}

function renderAscii(cue: Pt, balls: BallSpec[], pts: Pt[], pocket: Pt): string {
  const cols = 39;
  const rows = 13;
  const grid: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ' '));
  const toCell = (p: Pt) => ({
    c: Math.max(0, Math.min(cols - 1, Math.round((p.x / 100) * (cols - 1)))),
    r: Math.max(0, Math.min(rows - 1, Math.round(((50 - p.y) / 50) * (rows - 1)))),
  });
  const set = (p: Pt, ch: string) => {
    const { c, r } = toCell(p);
    grid[r][c] = ch;
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const steps = Math.max(2, Math.round(dist(a, b) / 4));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      set({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, '·');
    }
  }
  set(pocket, 'O');
  for (const b of balls) {
    const ch = b.role === 'blocker' ? 'X' : b.role === 'helper' ? 'H' : String(b.ballId % 10);
    set(b, ch);
  }
  set(cue, 'C');
  const inner = grid.map((row) => `│${row.join('')}│`).join('\n');
  const rail = `O${'─'.repeat(cols)}O`;
  return `${rail}\n${inner}\n${rail}\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path`;
}

function assemble(prev: SotdShotMap, layout: Layout): SotdShotMap {
  const built = buildPath(layout);
  const airIdx = built.kinds
    .map((k, i) => (k === 'airborne' ? i : -1))
    .filter((i) => i >= 0);
  const nudgedBalls = layout.lockBalls
    ? built.balls
    : nudgeOffLane(built.balls, built.pts, airIdx);
  const { cue, pocket, pts, kinds } = built;
  const roundedBalls = nudgedBalls.map((b) => ({
    ballId: b.ballId,
    x: roundPt(b).x,
    y: roundPt(b).y,
    role: b.role ?? 'object',
  }));
  const primary = primaryOf(roundedBalls);
  return {
    id: prev.id,
    name: prev.name,
    difficulty: prev.difficulty,
    difficulty_rating: prev.difficulty_rating,
    category: prev.category,
    speed_category: prev.speed_category,
    tip_zone: prev.tip_zone,
    cue_ball_start: roundPt(cue),
    object_ball_positions: roundedBalls,
    intended_path: pathFromPoints(pts, kinds.length ? kinds : undefined),
    english: prev.english,
    landing_zones: [
      { ...roundPt(pocket), label: 'pocket' },
      { ...estimateCbRest(prev.tip_zone, cue, primary, pocket), label: 'cb_rest' },
    ],
    pocket_target: roundPt(pocket),
    coordinate_system: COORDINATE_SYSTEM,
    source: 'catalogue',
    ascii_table: renderAscii(cue, roundedBalls, pts, pocket),
  };
}

function fileHeader(): string {
  return `/**
 * Structured Shot-of-the-Day maps for all 52 catalogue shots.
 * Internal geometry only (x 0–100 head→foot, y 0–50 near→far). Offline-safe Rack catalogue.
 * Frontend renders instructor-style diagrams with original drill tokens (not cards),
 * dual paths (cue + object), real ball colors, and human coaching — never raw coords/legends.
 * Geometry is validated locally (sotd-shot-map-geometry.ts). Do not generate maps via RealAI.
 */

export type SotdPoint = { x: number; y: number };

export type SotdObjectBall = SotdPoint & {
  ballId: number;
  role?: 'object' | 'blocker' | 'prop' | 'helper';
};

export type SotdPathStyle = 'solid' | 'dashed';
export type SotdPathKind = 'ground' | 'airborne' | 'object' | 'cue_after';

export type SotdPathSegment = {
  from: SotdPoint;
  to: SotdPoint;
  style?: SotdPathStyle;
  kind?: SotdPathKind;
};

export type SotdEnglish = {
  tip_zone: string;
  sidespin: number;
  backspin: number;
  follow: number;
  label: string;
};

export type SotdLandingZone = SotdPoint & { label: string };

export type SotdMapSource = 'catalogue' | 'realai';

export type SotdShotMap = {
  id: string;
  name: string;
  difficulty: string;
  difficulty_rating: number;
  category: string;
  speed_category: string;
  tip_zone: string;
  cue_ball_start: SotdPoint;
  object_ball_positions: SotdObjectBall[];
  intended_path: SotdPathSegment[];
  english: SotdEnglish;
  landing_zones: SotdLandingZone[];
  pocket_target: SotdPoint;
  coordinate_system: { x: string; y: string; units: string };
  source: SotdMapSource;
  ascii_table: string;
};

export const SOTD_SHOT_MAPS: SotdShotMap[] = `;
}

function fileFooter(): string {
  return `;

export function getSotdMapById(id: string): SotdShotMap | undefined {
  return SOTD_SHOT_MAPS.find((m) => m.id === id);
}

export function listSotdMaps(): SotdShotMap[] {
  return SOTD_SHOT_MAPS;
}

export function sotdMapCount(): number {
  return SOTD_SHOT_MAPS.length;
}
`;
}

function main() {
  const catalogIds = new Set(SHOT_CATALOG.map((s) => s.id));
  const next: SotdShotMap[] = [];
  const failures: string[] = [];

  for (const prev of SOTD_SHOT_MAPS) {
    const layout = LAYOUTS[prev.id];
    if (!layout) {
      failures.push(`${prev.id}: missing layout spec`);
      continue;
    }
    if (!catalogIds.has(prev.id)) {
      failures.push(`${prev.id}: not in shot catalog`);
    }
    try {
      const map = assemble(prev, layout);
      const report = validateSotdShotMap(map);
      if (!report.ok) {
        failures.push(formatGeomReport(map, report));
      }
      next.push(map);
    } catch (e) {
      failures.push(`${prev.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (failures.length) {
    console.error(`Validation failed for ${failures.length} map(s):\n${failures.join('\n')}`);
    process.exitCode = 1;
    console.error('Canonical sotd-shot-maps.ts was not overwritten.');
    return;
  }

  if (next.length !== SOTD_SHOT_MAPS.length) {
    console.error(`Expected ${SOTD_SHOT_MAPS.length} maps, built ${next.length}. Not writing.`);
    process.exitCode = 1;
    return;
  }

  const out = fileHeader() + JSON.stringify(next, null, 2) + fileFooter();
  const dest = path.join(__dirname, '../src/realai/v2/sotd-shot-maps.ts');
  fs.writeFileSync(dest, out);
  console.log(`All ${next.length} maps pass geometry validation.`);
  console.log(`Wrote ${dest}`);
}

main();
