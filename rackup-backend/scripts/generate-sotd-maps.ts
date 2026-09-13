/**
 * One-shot regenerator for realistic SOTD catalogue diagrams.
 * Run: npx ts-node -T scripts/generate-sotd-maps.ts
 */
import * as fs from 'fs';
import * as path from 'path';

import { SHOT_CATALOG } from '../src/shots/shot-catalog';
import { SOTD_SHOT_MAPS, type SotdShotMap } from '../src/realai/v2/sotd-shot-maps';
import {
  type PocketId,
  type RailId,
  type SotdGeomPoint as Pt,
  POCKETS,
  add,
  aimBehind,
  clampOnTable,
  dist,
  findRailChain,
  norm,
  pathFromPoints,
  railChain,
  roundPt,
  scale,
  sub,
  validateSotdShotMap,
  formatGeomReport,
} from '../src/realai/v2/sotd-shot-map-geometry';

const COORDINATE_SYSTEM = {
  x: '0=head rail → 100=foot rail',
  y: '0=bottom long rail → 50=top long rail',
  units: 'normalized table percent (9-foot aspect 2:1)',
};

type BallSpec = { ballId: number; x: number; y: number; role?: 'object' | 'blocker' | 'prop' };

type LayoutKind = 'line' | 'bank' | 'kick' | 'carom' | 'curve';

type Layout = {
  pocket: PocketId;
  kind: LayoutKind;
  cue?: Pt;
  cueGap?: number;
  balls: BallSpec[];
  rails?: RailId[];
  railCount?: number;
  via?: Pt[];
  /** Extra path points after the last object (before pocket), e.g. combo then bank. */
  afterObject?: Pt[];
};

function lineToward(from: Pt, to: Pt, distance: number): Pt {
  return add(from, scale(norm(sub(to, from)), distance));
}

function linedBalls(
  pocket: Pt,
  start: Pt,
  ids: number[],
  spacing = 12,
): BallSpec[] {
  const away = norm(sub(start, pocket));
  return ids.map((ballId, i) => {
    const p = clampOnTable(add(start, scale(away, spacing * i)));
    return { ballId, x: p.x, y: p.y, role: 'object' as const };
  });
}

const LAYOUTS: Record<string, Layout> = {
  'sotd-01': {
    kind: 'bank',
    pocket: 'side-far',
    rails: ['near'],
    balls: [
      { ballId: 1, x: 62.5, y: 4.2, role: 'object' },
      { ballId: 9, x: 78, y: 38, role: 'object' },
    ],
    cueGap: 18,
  },
  'sotd-02': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [{ ballId: 1, x: 75, y: 28, role: 'object' }],
    cueGap: 14,
  },
  'sotd-03': {
    kind: 'line',
    pocket: 'foot-near',
    balls: [{ ballId: 1, x: 75, y: 22, role: 'object' }],
    cueGap: 12,
  },
  'sotd-04': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [
      { ballId: 1, x: 66, y: 28, role: 'object' },
      { ballId: 2, x: 76, y: 35, role: 'prop' },
      { ballId: 3, x: 84, y: 41, role: 'prop' },
    ],
    cueGap: 16,
  },
  'sotd-05': {
    kind: 'line',
    pocket: 'foot-far',
    cue: { x: 30, y: 16 },
    balls: [
      { ballId: 1, x: 64, y: 30, role: 'object' },
      { ballId: 8, x: 46, y: 20, role: 'blocker' },
    ],
  },
  'sotd-06': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 38, y: 34 },
    balls: [{ ballId: 1, x: 70, y: 20, role: 'object' }],
  },
  'sotd-07': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 14, y: 10 },
    railCount: 2,
    balls: [{ ballId: 1, x: 86, y: 38, role: 'object' }],
  },
  'sotd-08': (() => {
    const pocket = POCKETS['foot-far'];
    const last = { x: 78, y: 38 };
    const balls = linedBalls(pocket, last, [2, 1], 13).reverse();
    return { kind: 'line' as const, pocket: 'foot-far' as const, balls, cueGap: 14 };
  })(),
  'sotd-09': {
    kind: 'carom',
    pocket: 'foot-near',
    balls: [
      { ballId: 9, x: 74, y: 16, role: 'object' },
      { ballId: 1, x: 54, y: 28, role: 'object' },
    ],
    cueGap: 16,
  },
  'sotd-10': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 46, y: 24 },
    balls: [{ ballId: 1, x: 84, y: 5.5, role: 'object' }],
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
    railCount: 2,
    balls: [
      { ballId: 9, x: 36, y: 12, role: 'object' },
      { ballId: 1, x: 58, y: 30, role: 'object' },
    ],
    cueGap: 16,
  },
  'sotd-14': {
    kind: 'curve',
    pocket: 'foot-far',
    cue: { x: 26, y: 18 },
    via: [
      { x: 38, y: 10 },
      { x: 54, y: 16 },
    ],
    balls: [
      { ballId: 1, x: 72, y: 34, role: 'object' },
      { ballId: 8, x: 50, y: 26, role: 'blocker' },
    ],
  },
  'sotd-15': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 26, y: 24 },
    balls: [
      { ballId: 1, x: 78, y: 20, role: 'object' },
      { ballId: 7, x: 50, y: 22, role: 'blocker' },
    ],
  },
  'sotd-16': {
    kind: 'curve',
    pocket: 'foot-far',
    cue: { x: 34, y: 14 },
    via: [
      { x: 24, y: 28 },
      { x: 40, y: 42 },
    ],
    balls: [
      { ballId: 1, x: 64, y: 36, role: 'object' },
      { ballId: 5, x: 48, y: 28, role: 'blocker' },
    ],
  },
  'sotd-17': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 16, y: 12 },
    rails: ['near'],
    balls: [{ ballId: 1, x: 80, y: 36, role: 'object' }],
  },
  'sotd-18': {
    kind: 'line',
    pocket: 'foot-far',
    balls: (() => {
      const pocket = POCKETS['foot-far'];
      const last = { x: 80, y: 39 };
      return linedBalls(pocket, last, [2, 1], 3.2).reverse();
    })(),
    cueGap: 14,
  },
  'sotd-19': {
    kind: 'bank',
    pocket: 'head-far',
    rails: ['near'],
    balls: [
      { ballId: 1, x: 70, y: 6.5, role: 'object' },
      { ballId: 9, x: 42, y: 34, role: 'object' },
    ],
    cueGap: 16,
  },
  'sotd-20': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [{ ballId: 1, x: 70, y: 32, role: 'object' }],
    cueGap: 40,
  },
  'sotd-21': {
    kind: 'bank',
    pocket: 'head-near',
    rails: ['far'],
    balls: [
      { ballId: 1, x: 22, y: 18, role: 'object' },
      { ballId: 9, x: 48, y: 32, role: 'object' },
    ],
    cueGap: 14,
  },
  'sotd-22': {
    kind: 'kick',
    pocket: 'side-near',
    cue: { x: 20, y: 14 },
    rails: ['far'],
    balls: [{ ballId: 1, x: 52.5, y: 4.4, role: 'object' }],
  },
  'sotd-23': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [
      { ballId: 1, x: 72, y: 26, role: 'object' },
      { ballId: 2, x: 76, y: 22, role: 'prop' },
      { ballId: 3, x: 76, y: 30, role: 'prop' },
    ],
    cueGap: 18,
  },
  'sotd-24': {
    kind: 'kick',
    pocket: 'foot-near',
    cue: { x: 16, y: 24 },
    rails: ['near'],
    balls: [
      { ballId: 1, x: 72, y: 20, role: 'object' },
      { ballId: 8, x: 60, y: 34, role: 'object' },
    ],
  },
  'sotd-25': {
    kind: 'carom',
    pocket: 'foot-near',
    balls: [
      { ballId: 9, x: 70, y: 15, role: 'object' },
      { ballId: 1, x: 52, y: 26, role: 'object' },
    ],
    cueGap: 15,
  },
  'sotd-26': {
    kind: 'line',
    pocket: 'side-near',
    cue: { x: 34, y: 32 },
    balls: [{ ballId: 1, x: 58, y: 16, role: 'object' }],
  },
  'sotd-27': {
    kind: 'bank',
    pocket: 'foot-far',
    rails: ['near'],
    balls: [
      { ballId: 1, x: 35, y: 8, role: 'object' },
      { ballId: 9, x: 62, y: 36, role: 'object' },
    ],
    cueGap: 16,
  },
  'sotd-28': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 16, y: 10 },
    rails: ['near'],
    balls: [
      { ballId: 1, x: 78, y: 36, role: 'object' },
      { ballId: 8, x: 58, y: 22, role: 'prop' },
    ],
  },
  'sotd-29': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 46, y: 22 },
    balls: [{ ballId: 1, x: 72, y: 7.5, role: 'object' }],
  },
  'sotd-30': {
    kind: 'curve',
    pocket: 'foot-far',
    cue: { x: 28, y: 16 },
    via: [
      { x: 40, y: 9 },
      { x: 56, y: 14 },
    ],
    balls: [
      { ballId: 1, x: 70, y: 34, role: 'object' },
      { ballId: 8, x: 50, y: 24, role: 'blocker' },
    ],
  },
  'sotd-31': (() => {
    const pocket = POCKETS['foot-far'];
    const last = { x: 82, y: 40 };
    const balls = linedBalls(pocket, last, [3, 2, 1], 12).reverse();
    return { kind: 'line' as const, pocket: 'foot-far' as const, balls, cueGap: 13 };
  })(),
  'sotd-32': {
    kind: 'line',
    pocket: 'foot-far',
    cue: { x: 24, y: 18 },
    balls: [
      { ballId: 1, x: 76, y: 34, role: 'object' },
      { ballId: 7, x: 50, y: 26, role: 'blocker' },
    ],
  },
  'sotd-33': {
    kind: 'line',
    pocket: 'side-near',
    cue: { x: 30, y: 20 },
    balls: [{ ballId: 1, x: 56, y: 4.6, role: 'object' }],
  },
  'sotd-34': {
    kind: 'bank',
    pocket: 'side-far',
    rails: ['near'],
    balls: [
      { ballId: 1, x: 68, y: 4.4, role: 'object' },
      { ballId: 9, x: 82, y: 34, role: 'object' },
    ],
    cueGap: 17,
  },
  'sotd-35': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [{ ballId: 1, x: 74, y: 34, role: 'object' }],
    cueGap: 42,
  },
  'sotd-36': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 14, y: 14 },
    rails: ['far'],
    balls: [{ ballId: 1, x: 82, y: 36, role: 'object' }],
  },
  'sotd-37': {
    kind: 'kick',
    pocket: 'side-near',
    cue: { x: 22, y: 14 },
    rails: ['far'],
    balls: [
      { ballId: 1, x: 58, y: 16, role: 'object' },
      { ballId: 8, x: 40, y: 28, role: 'blocker' },
    ],
  },
  'sotd-38': {
    kind: 'line',
    pocket: 'foot-far',
    cue: { x: 40, y: 16 },
    balls: [{ ballId: 8, x: 72, y: 30, role: 'object' }],
  },
  'sotd-39': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 18, y: 12 },
    railCount: 4,
    balls: [{ ballId: 1, x: 70, y: 34, role: 'object' }],
  },
  'sotd-40': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [
      { ballId: 1, x: 48, y: 22, role: 'object' },
      { ballId: 2, x: 62, y: 12, role: 'object' },
    ],
    cueGap: 14,
    // B banks after the combo — filled in at build time if needed
  },
  'sotd-41': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 30, y: 25 },
    balls: [
      { ballId: 1, x: 64, y: 18, role: 'object' },
      { ballId: 8, x: 64, y: 32, role: 'object' },
    ],
  },
  'sotd-42': (() => {
    const pocket = POCKETS['foot-far'];
    const last = { x: 84, y: 41 };
    const balls = linedBalls(pocket, last, [3, 2, 1], 11).reverse();
    return { kind: 'line' as const, pocket: 'foot-far' as const, balls, cueGap: 13 };
  })(),
  'sotd-43': {
    kind: 'line',
    pocket: 'foot-far',
    cue: { x: 36, y: 22 },
    balls: [
      { ballId: 1, x: 70, y: 26, role: 'object' },
      { ballId: 8, x: 64, y: 31.5, role: 'blocker' },
      { ballId: 7, x: 64, y: 20.5, role: 'blocker' },
    ],
  },
  'sotd-44': {
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 20, y: 10 },
    railCount: 3,
    balls: [{ ballId: 1, x: 68, y: 36, role: 'object' }],
  },
  'sotd-45': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 22, y: 28 },
    balls: [
      { ballId: 1, x: 80, y: 18, role: 'object' },
      { ballId: 7, x: 50, y: 24, role: 'blocker' },
    ],
  },
  'sotd-46': {
    kind: 'bank',
    pocket: 'foot-near',
    railCount: 2,
    balls: [
      { ballId: 1, x: 32, y: 8, role: 'object' },
      { ballId: 9, x: 55, y: 30, role: 'object' },
    ],
    cueGap: 15,
  },
  'sotd-47': {
    kind: 'line',
    pocket: 'foot-far',
    balls: [
      { ballId: 1, x: 60, y: 24, role: 'object' },
      { ballId: 8, x: 64.8, y: 24, role: 'prop' },
    ],
    cueGap: 18,
  },
  'sotd-48': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 38, y: 38 },
    balls: [{ ballId: 1, x: 68, y: 26, role: 'object' }],
  },
  'sotd-49': {
    kind: 'line',
    pocket: 'foot-near',
    cue: { x: 42, y: 34 },
    balls: [{ ballId: 1, x: 82, y: 8, role: 'object' }],
  },
  'sotd-50': {
    kind: 'curve',
    pocket: 'foot-far',
    cue: { x: 24, y: 16 },
    via: [{ x: 40, y: 9 }],
    balls: [
      { ballId: 1, x: 74, y: 34, role: 'object' },
      { ballId: 7, x: 48, y: 24, role: 'blocker' },
    ],
  },
  'sotd-51': {
    kind: 'bank',
    pocket: 'side-far',
    rails: ['near'],
    balls: [
      { ballId: 1, x: 72, y: 4.6, role: 'object' },
      { ballId: 9, x: 40, y: 32, role: 'object' },
    ],
    cueGap: 17,
  },
  'sotd-52': {
    kind: 'line',
    pocket: 'foot-far',
    cue: { x: 38, y: 14 },
    balls: [
      { ballId: 1, x: 75, y: 25, role: 'object' },
      { ballId: 8, x: 62, y: 36, role: 'object' },
    ],
  },
};

function primaryOf(balls: BallSpec[]): BallSpec {
  return balls.find((b) => b.role !== 'blocker' && b.role !== 'prop') ?? balls[0];
}

function resolveRails(from: Pt, to: Pt, layout: Layout): Pt[] {
  if (layout.rails?.length) {
    const pts = railChain(from, to, layout.rails);
    if (pts) return pts;
  }
  const n = layout.railCount ?? layout.rails?.length ?? 1;
  const found = findRailChain(from, to, n);
  if (found) return found.pts;
  if (n > 1) {
    const fewer = findRailChain(from, to, 1);
    if (fewer) return fewer.pts;
  }
  throw new Error(`no rail path ${from.x},${from.y} → ${to.x},${to.y}`);
}

function buildPath(layout: Layout): { cue: Pt; pocket: Pt; balls: BallSpec[]; pts: Pt[] } {
  const pocket = POCKETS[layout.pocket];
  const balls = layout.balls.map((b) => ({ ...b }));
  const primary = primaryOf(balls);
  const ob = { x: primary.x, y: primary.y };
  const gap = layout.cueGap ?? 15;

  if (layout.kind === 'bank') {
    const bankPts = resolveRails(ob, pocket, layout);
    const firstHit = bankPts[1] ?? pocket;
    const cue = clampOnTable(layout.cue ?? aimBehind(ob, firstHit, gap));
    return { cue, pocket, balls, pts: [cue, ...bankPts] };
  }

  if (layout.kind === 'kick') {
    const cue = clampOnTable(layout.cue ?? { x: 18, y: 12 });
    const kickPts = resolveRails(cue, ob, layout);
    return { cue, pocket, balls, pts: [...kickPts, pocket] };
  }

  if (layout.kind === 'carom') {
    const helper = balls.find((b) => b.ballId !== primary.ballId && b.role !== 'blocker') ?? balls[1];
    const helperPt = helper ? { x: helper.x, y: helper.y } : aimBehind(ob, pocket, 12);
    const cue = clampOnTable(layout.cue ?? aimBehind(helperPt, ob, gap));
    return { cue, pocket, balls, pts: [cue, helperPt, ob, pocket] };
  }

  if (layout.kind === 'curve') {
    const cue = clampOnTable(layout.cue ?? aimBehind(ob, pocket, gap));
    const via = (layout.via ?? []).map((p) => clampOnTable(p));
    return { cue, pocket, balls, pts: [cue, ...via, ob, pocket] };
  }

  // line / combo: cue → each object (in listed order, skip blocker/prop) → pocket
  const objects = balls.filter((b) => b.role !== 'blocker' && b.role !== 'prop');
  const objectPts = objects.map((b) => ({ x: b.x, y: b.y }));
  const aim = objectPts[0] ?? ob;
  const toward = objectPts[1] ?? pocket;
  const cue = clampOnTable(layout.cue ?? aimBehind(aim, toward, gap));
  const after = layout.afterObject ?? [];
  return { cue, pocket, balls, pts: [cue, ...objectPts, ...after, pocket] };
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
    const ch = b.role === 'blocker' ? 'X' : String(b.ballId % 10);
    set(b, ch);
  }
  set(cue, 'C');
  const inner = grid.map((row) => `│${row.join('')}│`).join('\n');
  const rail = `O${'─'.repeat(cols)}O`;
  return `${rail}\n${inner}\n${rail}\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path`;
}

function specialAfter(id: string, layout: Layout, built: ReturnType<typeof buildPath>): Pt[] | null {
  if (id !== 'sotd-40') return null;
  const b2 = built.balls.find((b) => b.ballId === 2);
  if (!b2) return null;
  const chain = railChain({ x: b2.x, y: b2.y }, built.pocket, ['near']);
  if (!chain) return null;
  return chain.slice(1, -1);
}

function assemble(prev: SotdShotMap, layout: Layout): SotdShotMap {
  let built = buildPath(layout);
  const extra = specialAfter(prev.id, layout, built);
  if (extra) {
    built = buildPath({ ...layout, afterObject: extra });
  }
  const { cue, pocket, balls, pts } = built;
  const roundedBalls = balls.map((b) => ({
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
    intended_path: pathFromPoints(pts),
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
  role?: 'object' | 'blocker' | 'prop';
};

export type SotdPathSegment = {
  from: SotdPoint;
  to: SotdPoint;
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
  } else {
    console.log(`All ${next.length} maps pass geometry validation.`);
  }

  const out =
    fileHeader() + JSON.stringify(next, null, 2) + fileFooter();
  const dest = path.join(__dirname, '../src/realai/v2/sotd-shot-maps.ts');
  // Only write if we have a full set — even with failures we write so we can inspect.
  if (next.length === SOTD_SHOT_MAPS.length) {
    fs.writeFileSync(dest, out);
    console.log(`Wrote ${dest}`);
  }
}

main();
