/**
 * One-shot regenerator for realistic SOTD catalogue diagrams.
 * Run: npx ts-node -T scripts/generate-sotd-maps.ts
 *
 * The catalogue TEXT (src/shots/shot-catalog.ts) is the spec: every layout below is built
 * so the diagram shows what the setup/steps/tips describe — the called ball and pocket, the
 * rails in order, the first-contact ball, the tip (draw/follow/stop/side) and the CB finish —
 * and nothing the text does not describe. Every map must also pass the route physics audit
 * (sotd-route-audit.ts) and the text-vs-map consistency check (sotd-text-consistency.ts).
 *
 * Frame: x 0–100 head→foot, y 0–50 near→far (inches on a 9-ft table), ball Ø 2.25.
 * Shooter-left = +y (far rail) when facing the foot rail.
 */
import * as fs from 'fs';
import * as path from 'path';

import { SHOT_CATALOG, type CatalogShot } from '../src/shots/shot-catalog';
import { SOTD_SHOT_MAPS, type SotdGhostBall, type SotdShotMap } from '../src/realai/v2/sotd-shot-maps';
import {
  type PocketId,
  type RailId,
  type SotdGeomPoint as Pt,
  type SotdShotGoal,
  BALL_DIAMETER,
  GHOST_BALL_DIAMETER,
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
  sampleQuadratic,
  scale,
  sub,
  validateSotdShotMap,
  formatGeomReport,
  type SotdPathKind,
} from '../src/realai/v2/sotd-shot-map-geometry';
import { auditSotdRoute, formatRouteAudit } from '../src/realai/v2/sotd-route-audit';
import { checkShotTextConsistency, formatConsistency } from '../src/realai/v2/sotd-text-consistency';

const COORDINATE_SYSTEM = {
  x: '0=head rail → 100=foot rail',
  y: '0=bottom long rail → 50=top long rail',
  units: 'normalized table percent (9-foot aspect 2:1)',
};

type BallRole = 'object' | 'blocker' | 'prop' | 'helper';
type BallSpec = { ballId: number; x: number; y: number; role?: BallRole };
type ExtraPath = { ballId: number; pts: Pt[]; faded?: boolean };

type LayoutKind = 'line' | 'cut' | 'bank' | 'kick' | 'carom' | 'curve' | 'jump' | 'explicit';

type Layout = {
  pocket: PocketId;
  kind: LayoutKind;
  cue?: Pt;
  cueGap?: number;
  /** Cut angle (deg) between cue→OB and OB→first leg. kind:'cut' and kind:'bank'. */
  cutDeg?: number;
  /** +1: OB goes right of the cue line; −1: OB goes left (shooter's view). */
  cutSign?: 1 | -1;
  balls: BallSpec[];
  rails?: RailId[];
  railCount?: number;
  via?: Pt[];
  /** Extra path points after the last object (before pocket), e.g. combo then bank. */
  afterObject?: Pt[];
  pocketPt?: Pt;
  jumpTakeoff?: Pt;
  jumpLanding?: Pt;
  /** Ground samples after the landing (jump-curve): landing → drawn ghost, exclusive. */
  landSamples?: Pt[];
  /** Renderer control of the post-landing curve (CB direction into the ghost). */
  landCtrl?: Pt;
  /** When true, leave balls where the layout put them. */
  lockBalls?: boolean;
  /** Rare pin — only when SPA auto-ghost would sit on the wrong ball/aim. */
  ghostBall?: SotdGhostBall;
  /** Explicit segment kinds for carom/explicit polylines. */
  pathKinds?: SotdPathKind[];
  /** Optional CB finish; otherwise estimated from tip zone + contact physics. */
  cbRest?: Pt;
  /** Override the CB finish travel (inches) for the physical estimate. */
  finishLen?: number;
  /** pocket (default) · spot (OB stops on a target) · path (CB-only tour). */
  goal?: SotdShotGoal;
  /** Spot target for the primary OB, or the CB end zone for a path goal. */
  targetPt?: Pt;
  /** Kick/rail-first: rebound widened (+) by running or shortened (−) by reverse english. */
  railBend?: number;
  /** Bank: OB rebound widened/shortened (deg) — spin transferred from the CB. */
  bankBend?: number;
  /** Other balls the shot moves on purpose (cluster split, butterfly wings, mirror bank). */
  extraPaths?: ExtraPath[];
};

const D = BALL_DIAMETER;
const R = D / 2;
/** Centre of a ball frozen to a cushion (validator keeps balls ≥ 1.2 from the nose). */
const FROZEN = 1.2;
const FOOT_SPOT: Pt = { x: 75, y: 25 };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
const dotP = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const crossZ = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x;
function dirDeg(d: number): Pt {
  return { x: Math.cos(toRad(d)), y: Math.sin(toRad(d)) };
}
function rotate(v: Pt, d: number): Pt {
  const c = Math.cos(toRad(d));
  const s = Math.sin(toRad(d));
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
function headingDeg(v: Pt): number {
  return toDeg(Math.atan2(v.y, v.x));
}
function angleBetween(a: Pt, b: Pt): number {
  const na = norm(a);
  const nb = norm(b);
  return toDeg(Math.acos(Math.max(-1, Math.min(1, dotP(na, nb)))));
}

/** Physical ghost: CB centre at contact, one ball diameter behind the OB on its first leg. */
function physicalGhost(ob: Pt, toward: Pt): Pt {
  return sub(ob, scale(norm(sub(toward, ob)), D));
}

/** Ghost the SPA draws (4.4 behind the OB, aimed at `aim`). */
function drawnGhostOf(ob: Pt, aim: Pt): Pt {
  return sub(ob, scale(norm(sub(aim, ob)), GHOST_BALL_DIAMETER));
}

/** Rolling-model CB direction after a cut (s: 1 natural roll, 0 stun, < 0 draw). */
function cbDeflect(a: Pt, u: Pt, s: number): Pt {
  const c = Math.max(-1, Math.min(1, dotP(a, u)));
  const phi = Math.acos(c);
  if (phi < 1e-6) return s >= 0 ? u : scale(u, -1);
  const t = norm(sub(a, scale(u, c)));
  return norm(add(scale(t, (5 + 2 * s) * Math.sin(phi)), scale(u, 2 * s * Math.cos(phi))));
}

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

/**
 * Cue `gap` behind the physical ghost on a line that makes a true `cutDeg` cut
 * (sign +1: OB goes right of the cue line, −1: left).
 */
function cutCue(ob: Pt, toward: Pt, cutDeg: number, gap: number, sign: 1 | -1 = 1): Pt {
  const incoming = rotate(norm(sub(toward, ob)), sign * cutDeg);
  return clampOnTable(sub(physicalGhost(ob, toward), scale(incoming, gap)));
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Rail contact on `rail` between `from` and `to` whose rebound is `bendDeg` wider (+, running
 * english) or shorter (−, reverse english) than a mirror reflection.
 */
function bentRailContact(from: Pt, to: Pt, rail: RailId, bendDeg: number): Pt {
  const alongX = rail === 'near' || rail === 'far';
  const line = rail === 'near' || rail === 'head' ? 0 : rail === 'far' ? 50 : 100;
  const dFrom = Math.abs(line - (alongX ? from.y : from.x));
  const dTo = Math.abs(line - (alongX ? to.y : to.x));
  const pFrom = alongX ? from.x : from.y;
  const pTo = alongX ? to.x : to.y;
  const f = (p: number) =>
    toDeg(Math.atan2(Math.abs(pTo - p), dTo)) - toDeg(Math.atan2(Math.abs(p - pFrom), dFrom)) - bendDeg;
  let lo = pFrom;
  let hi = pTo;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  const p = (lo + hi) / 2;
  return alongX ? { x: p, y: line } : { x: line, y: p };
}

/**
 * Cloth swerve/massé around a blocker, solved so the curve the SPA draws (quadratic,
 * control 18 off the chord when a blocker is present) straightens into the OB with the
 * requested cut. Returns OB, drawn ghost, control and blocker positions.
 */
function solveBlockerCurve(opts: {
  cue: Pt;
  pocket: Pt;
  chord: number;
  /** +1: bulge to the left of travel → curve finishes turning right (right english). */
  side: 1 | -1;
  cutDeg: number;
  cutSign: 1 | -1;
  blockerOffset?: number;
}): { ob: Pt; ghost: Pt; ctrl: Pt; blocker: Pt; samples: Pt[] } {
  let best: { err: number; ob: Pt; ghost: Pt; ctrl: Pt; n: Pt; mid: Pt } | null = null;
  for (let d = -180; d < 180; d += 0.02) {
    const dir = dirDeg(d);
    const ghost = add(opts.cue, scale(dir, opts.chord));
    const n = perp(dir);
    const mid = midpoint(opts.cue, ghost);
    const ctrl = add(mid, scale(n, 18 * opts.side));
    const tangent = norm(sub(ghost, ctrl));
    const u = rotate(tangent, -opts.cutSign * opts.cutDeg);
    const ob = add(ghost, scale(u, GHOST_BALL_DIAMETER));
    if (!isOnTable(ob, 3)) continue;
    const toPk = norm(sub(opts.pocket, ob));
    if (dotP(toPk, u) <= 0) continue;
    const err = Math.abs(crossZ(u, toPk));
    if (!best || err < best.err) best = { err, ob, ghost, ctrl, n, mid };
  }
  if (!best || best.err > 0.002) throw new Error('solveBlockerCurve: no solution');
  const blocker = sub(best.mid, scale(best.n, (opts.blockerOffset ?? 1.2) * opts.side));
  const samples = sampleQuadratic(opts.cue, best.ctrl, best.ghost, 12);
  return { ob: best.ob, ghost: best.ghost, ctrl: best.ctrl, blocker, samples };
}

/** Find the cue heading for a carom: CB hits `first` at `cutDeg`, rolls (s) onto `second`'s ghost. */
function solveCarom(first: Pt, second: Pt, pocket: Pt, cutDeg: number, side: 1 | -1, s: number) {
  const g2 = physicalGhost(second, pocket);
  let best: { err: number; a: Pt; u: Pt; g1: Pt } | null = null;
  for (let d = -180; d < 180; d += 0.01) {
    const a = dirDeg(d);
    const u = rotate(a, side * cutDeg);
    const g1 = sub(first, scale(u, D));
    const v = cbDeflect(a, u, s);
    const to = sub(g2, g1);
    if (dotP(v, to) <= 0) continue;
    const err = Math.abs(crossZ(v, norm(to)));
    if (!best || err < best.err) best = { err, a, u, g1 };
  }
  if (!best || best.err > 0.002) throw new Error('solveCarom: no solution');
  return { ...best, g2 };
}

// ── per-shot layouts (spec = catalogue text) ───────────────────────────────

const LAYOUTS: Record<string, Layout> = {
  'sotd-01': {
    // OB "~½ ball off the long rail, second diamond from the side pocket"; CB centre table one
    // diamond off the foot string; cross-side bank into the opposite side pocket.
    kind: 'bank',
    pocket: 'side-far',
    rails: ['near'],
    cue: { x: 87.5, y: 25 },
    lockBalls: true,
    balls: [{ ballId: 1, x: 75, y: 2.3, role: 'object' }],
  },
  'sotd-02': {
    // OB on the foot spot, CB one diamond back, straight into the near corner.
    kind: 'line',
    pocket: 'foot-near',
    balls: [{ ballId: 1, x: FOOT_SPOT.x, y: FOOT_SPOT.y, role: 'object' }],
    cueGap: 12.5,
  },
  'sotd-03': {
    // OB on foot spot, CB one diamond away, straight; CB comes back 1–2 diamonds.
    kind: 'line',
    pocket: 'foot-near',
    balls: [{ ballId: 1, x: FOOT_SPOT.x, y: FOOT_SPOT.y, role: 'object' }],
    cueGap: 12.5,
    finishLen: 18,
  },
  'sotd-04': (() => {
    // Lead ball pocketed with a nearly straight follow shot from behind the head string; the
    // natural-roll CB rolls on into balls 2 and 3 (a dead-straight follow would chase the OB).
    const pocket = POCKETS['foot-far'];
    const lead = { x: 76, y: 36 };
    const u = norm(sub(pocket, lead));
    const a = rotate(u, -12);
    const g = sub(lead, scale(u, D));
    const roll = cbDeflect(a, u, 1);
    const b2 = add(g, scale(roll, 11));
    const b3 = add(b2, scale(roll, D + 0.05));
    const cue = sub(lead, scale(a, (lead.x - 24.5) / a.x));
    return {
      kind: 'line' as const,
      pocket: 'foot-far' as const,
      cue,
      lockBalls: true,
      balls: [
        { ballId: 1, ...lead, role: 'object' as const },
        { ballId: 2, ...b2, role: 'prop' as const },
        { ballId: 3, ...b3, role: 'prop' as const },
      ],
      finishLen: 11,
    };
  })(),
  'sotd-05': {
    // OB near the foot rail, CB two diamonds away, 35° cut; OB goes right → right = inside.
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 35,
    cutSign: 1,
    cueGap: 25,
    balls: [{ ballId: 1, x: 90, y: 12, role: 'object' }],
  },
  'sotd-06': {
    // Same geometry as the inside-english cut, 30° cut, CB two diamonds out; left = outside.
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 30,
    cutSign: 1,
    cueGap: 25,
    balls: [{ ballId: 1, x: 90, y: 12, role: 'object' }],
  },
  'sotd-07': {
    // CB near the left (far-side) head corner; far long rail → near long rail → OB a diamond
    // and a half off the far foot corner.
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 14, y: 40 },
    rails: ['far', 'near'],
    balls: [{ ballId: 1, x: 84, y: 38, role: 'object' }],
  },
  'sotd-08': (() => {
    // A on the foot spot, B on the spot line toward the corner, CB one diamond behind A.
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
      cueGap: 12.5,
    };
  })(),
  'sotd-09': (() => {
    // Text: CB hits the 1 first, the 1 moves aside, the CB caroms into the 9 near the corner
    // jaw and kisses it in. Half-ball hit with natural roll (30° rule) onto the 9's ghost.
    const pocket = POCKETS['foot-near'];
    const b1 = { x: 70, y: 18 };
    const b9 = { x: 95.2, y: 3.6 };
    const sol = solveCarom(b1, b9, pocket, 30, 1, 1);
    const cue = sub(sol.g1, scale(sol.a, 30));
    return {
      kind: 'explicit' as const,
      pocket: 'foot-near' as const,
      cue,
      lockBalls: true,
      balls: [
        { ballId: 1, ...b1, role: 'object' as const },
        { ballId: 9, ...b9, role: 'object' as const },
      ],
      via: [sol.g1, sol.g2],
      pathKinds: ['ground', 'cue_after', 'object'] as SotdPathKind[],
      // Pin the (hidden) ghost on the CB's real line: the half-ball contact on the 1.
      ghostBall: { ...roundPt(sol.g1), show: false },
      cbRest: { x: 95.6, y: 6.6 },
      extraPaths: [{ ballId: 1, pts: [b1, add(b1, scale(sol.u, 9))], faded: true }],
    };
  })(),
  'sotd-10': {
    // OB frozen on the long rail between side and corner; CB mid-table; ⅛–¼ ball (≈55°) cut.
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 55,
    cutSign: -1,
    cueGap: 28,
    lockBalls: true,
    balls: [{ ballId: 1, x: 75, y: FROZEN, role: 'object' }],
    finishLen: 6,
  },
  'sotd-11': {
    // Long straight-ish follow from the head string; OB toward the foot corner; the CB keeps
    // rolling 2+ diamonds past contact (a 12° angle sends it toward the foot rail, not the pocket).
    kind: 'cut',
    pocket: 'foot-far',
    cutDeg: 12,
    cutSign: -1,
    cueGap: 52.2,
    balls: [{ ballId: 1, x: 74, y: 30, role: 'object' }],
    finishLen: 25.5,
  },
  'sotd-12': {
    // OB near the foot, CB 2–2.5 diamonds away straight; power draw back past the centre string.
    kind: 'line',
    pocket: 'foot-near',
    balls: [{ ballId: 1, x: 80, y: 15, role: 'object' }],
    cueGap: 28,
    finishLen: 38,
  },
  'sotd-13': {
    // 9 slightly off centre; long rail → short rail → far corner.
    kind: 'bank',
    pocket: 'head-far',
    rails: ['near', 'foot'],
    balls: [{ ballId: 9, x: 47, y: 17, role: 'object' }],
    cueGap: 16,
  },
  'sotd-14': (() => {
    // Straight-in OB to the corner; a blocker sits just off the CB's line; high-right swerve
    // bends around it and straightens into the OB.
    const pocket = POCKETS['foot-far'];
    const cue = { x: 50, y: 5 };
    const sol = solveBlockerCurve({ cue, pocket, chord: 38, side: 1, cutDeg: 2, cutSign: -1 });
    return {
      kind: 'curve' as const,
      pocket: 'foot-far' as const,
      cue,
      lockBalls: true,
      via: sol.samples.slice(1),
      balls: [
        { ballId: 1, ...sol.ob, role: 'object' as const },
        { ballId: 8, ...sol.blocker, role: 'blocker' as const },
      ],
      finishLen: 6,
    };
  })(),
  'sotd-15': (() => {
    // Short jump: blocker on the CB→OB line, OB close beyond it, straight into the nearby corner.
    const pocket = POCKETS['foot-near'];
    const ob = { x: 84, y: 10 };
    const u = norm(sub(pocket, ob));
    const cue = sub(ob, scale(u, 18));
    const blocker = add(cue, scale(u, 8.5));
    return {
      kind: 'jump' as const,
      pocket: 'foot-near' as const,
      cue,
      lockBalls: true,
      jumpTakeoff: sub(blocker, scale(u, 4)),
      jumpLanding: add(blocker, scale(u, 4)),
      balls: [
        { ballId: 1, ...ob, role: 'object' as const },
        { ballId: 7, ...blocker, role: 'blocker' as const },
      ],
    };
  })(),
  'sotd-16': (() => {
    // Massé: CB near the rail, OB one diamond away with the angle blocked; low-right steep cue
    // bananas the CB around the blocker into the OB.
    const pocket = POCKETS['side-near'];
    const cue = { x: 33, y: 4 };
    const sol = solveBlockerCurve({ cue, pocket, chord: 11, side: 1, cutDeg: 10, cutSign: -1 });
    return {
      kind: 'curve' as const,
      pocket: 'side-near' as const,
      cue,
      lockBalls: true,
      via: sol.samples.slice(1),
      balls: [
        { ballId: 1, ...sol.ob, role: 'object' as const },
        { ballId: 5, ...sol.blocker, role: 'blocker' as const },
      ],
      finishLen: 5,
    };
  })(),
};

Object.assign(LAYOUTS, {
  'sotd-17': (() => {
    // Snookered on the 8: the opponent's ball blocks the direct line. One-rail kick that
    // thin-touches the 8 (it barely moves) — a legal hit, no pocket.
    const cue = { x: 18, y: 26 };
    const ob = { x: 70, y: 29 };
    const blocker = { x: 44, y: 27.5 };
    let best: { err: number; u: Pt; contact: Pt } | null = null;
    for (let h = -180; h < 180; h += 0.05) {
      const u = dirDeg(h);
      const g = sub(ob, scale(u, D));
      const chain = railChain(cue, g, ['near']);
      if (!chain) continue;
      const a = norm(sub(g, chain[1]));
      if (crossZ(a, u) <= 0) continue;
      const err = Math.abs(angleBetween(a, u) - 65);
      if (!best || err < best.err) best = { err, u, contact: chain[1] };
    }
    if (!best) throw new Error('sotd-17: no kick');
    return {
      kind: 'explicit' as const,
      pocket: 'foot-far' as const,
      goal: 'spot' as const,
      targetPt: add(ob, scale(best.u, 4)),
      cue,
      lockBalls: true,
      via: [best.contact, ob],
      balls: [
        { ballId: 8, ...ob, role: 'object' as const },
        { ballId: 3, ...blocker, role: 'blocker' as const },
      ],
    };
  })(),
  'sotd-18': (() => {
    // B frozen on the long rail near the corner, A frozen to B slightly off the rail line,
    // CB with a ¾-ball hit on A; B slides along the rail into the corner.
    const b = { x: 88, y: 48.8 };
    const u = dirDeg(8);
    const a = sub(b, scale(u, D + 0.06));
    return {
      kind: 'line' as const,
      pocket: 'foot-far' as const,
      lockBalls: true,
      cue: cutCue(a, b, 14.5, 14, 1),
      balls: [
        { ballId: 1, ...a, role: 'object' as const },
        { ballId: 2, ...b, role: 'object' as const },
      ],
    };
  })(),
  'sotd-19': {
    // OB a diamond off the long (side) rail; cut-bank off that rail into the opposite corner.
    kind: 'bank',
    pocket: 'head-far',
    rails: ['near'],
    cutDeg: 35,
    cutSign: 1,
    cueGap: 20,
    lockBalls: true,
    balls: [{ ballId: 1, x: 70, y: 12.5, role: 'object' }],
  },
  'sotd-20': {
    // Long straight stop: CB just past the head string, OB on the foot string, into the corner.
    kind: 'line',
    pocket: 'foot-far',
    cue: { x: 27, y: 13.5 },
    lockBalls: true,
    balls: [{ ballId: 1, x: 75, y: 37.5, role: 'object' }],
  },
  'sotd-21': {
    // OB near the far long rail, short cross-bank into the near (head) corner; reverse english
    // shortens the rebound (bank comes off ~7° shorter than the mirror line).
    kind: 'bank',
    pocket: 'head-near',
    rails: ['far'],
    bankBend: -7,
    cueGap: 15,
    lockBalls: true,
    balls: [{ ballId: 1, x: 34, y: 40, role: 'object' }],
  },
  'sotd-22': {
    // Hanger just off the side jaw; one-rail kick off the far rail nicks it in (thin hit).
    kind: 'kick',
    pocket: 'side-near',
    cue: { x: 20, y: 14 },
    rails: ['far'],
    lockBalls: true,
    balls: [{ ballId: 1, x: 52.8, y: 2.6, role: 'object' }],
    finishLen: 5,
  },
  'sotd-23': (() => {
    // Three-ball cluster mid-table; soft stun into the key ball splits the two back balls
    // while the key ball barely moves.
    const key = { x: 56, y: 25 };
    const b2 = add(key, scale(dirDeg(30), 2.3));
    const b3 = add(key, scale(dirDeg(-30), 2.3));
    return {
      kind: 'explicit' as const,
      pocket: 'foot-far' as const,
      goal: 'spot' as const,
      targetPt: { x: 57, y: 25 },
      cue: { x: 40, y: 25 },
      lockBalls: true,
      via: [key],
      balls: [
        { ballId: 1, ...key, role: 'object' as const },
        { ballId: 2, ...b2, role: 'object' as const },
        { ballId: 3, ...b3, role: 'object' as const },
      ],
      extraPaths: [
        { ballId: 2, pts: [b2, add(b2, scale(dirDeg(30), 9))] },
        { ballId: 3, pts: [b3, add(b3, scale(dirDeg(-30), 9))] },
      ],
    };
  })(),
  'sotd-24': (() => {
    // Dead-straight 6-inch pot with the bridge hand on the rail (rail assist).
    const pocket = POCKETS['foot-near'];
    const ob = { x: 94.2, y: 1.4 };
    const u = norm(sub(pocket, ob));
    return {
      kind: 'line' as const,
      pocket: 'foot-near' as const,
      cue: sub(ob, scale(u, 8.4)),
      lockBalls: true,
      balls: [{ ballId: 1, ...ob, role: 'object' as const }],
    };
  })(),
  'sotd-25': (() => {
    // CB almost touching a rail-frozen OB: a full hit double-kisses. Thin free instead — the
    // OB runs down the rail to the corner and the CB rebounds off the cushion away from it.
    const pocket = POCKETS['foot-near'];
    const ob = { x: 80, y: FROZEN };
    const g = physicalGhost(ob, pocket);
    return {
      kind: 'line' as const,
      pocket: 'foot-near' as const,
      cue: { x: 77.5, y: 2.0 },
      lockBalls: true,
      balls: [{ ballId: 1, ...ob, role: 'object' as const }],
      ghostBall: { ...roundPt(g), show: false },
      finishLen: 8,
    };
  })(),
  'sotd-26': {
    // OB one diamond out from the side pocket; CB farther out to one side; 38° cut into the side.
    kind: 'cut',
    pocket: 'side-near',
    cutDeg: 38,
    cutSign: 1,
    cueGap: 18,
    balls: [{ ballId: 1, x: 52, y: 12.5, role: 'object' }],
  },
  'sotd-27': {
    // OB near the centre diamond; full-ish hit into the long rail, then the far corner.
    kind: 'bank',
    pocket: 'foot-far',
    rails: ['near'],
    cueGap: 16,
    balls: [{ ballId: 1, x: 50, y: 24, role: 'object' }],
  },
  'sotd-28': (() => {
    // Safety: 8 in the centre, your ball free. Thin stun touch barely moves your ball; the CB
    // rolls along the tangent and dies just short of the 8.
    const eight = { x: 50, y: 25 };
    const ob = { x: 62, y: 32 };
    const phi = 62;
    const options = [90, -90].map((turn) => {
      let t = norm(sub(eight, ob));
      let u = rotate(t, turn);
      for (let i = 0; i < 30; i++) {
        const g = sub(ob, scale(u, D));
        t = norm(sub(eight, g));
        u = rotate(t, turn);
      }
      const g = sub(ob, scale(u, D));
      const a = norm(add(scale(u, Math.cos(toRad(phi))), scale(t, Math.sin(toRad(phi)))));
      const cue = sub(g, scale(a, 16));
      const margin = Math.min(cue.x, 100 - cue.x, cue.y, 50 - cue.y);
      return { u, t, g, cue, margin };
    });
    const best = options.sort((p, q) => q.margin - p.margin)[0];
    return {
      kind: 'explicit' as const,
      pocket: 'foot-far' as const,
      goal: 'spot' as const,
      targetPt: add(ob, scale(best.u, 3)),
      cue: best.cue,
      lockBalls: true,
      via: [ob],
      balls: [
        { ballId: 3, ...ob, role: 'object' as const },
        { ballId: 8, ...eight, role: 'prop' as const },
      ],
      cbRest: sub(eight, scale(best.t, 2.6)),
    };
  })(),
  'sotd-29': {
    // CB a couple of inches off the rail, OB straight-ish ahead near the pocket; elevated
    // draw pulls the CB back off the rail.
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 10,
    cutSign: 1,
    cueGap: 20,
    lockBalls: true,
    balls: [{ ballId: 1, x: 86, y: 2.4, role: 'object' }],
  },
  'sotd-30': (() => {
    // CB mid-table, OB almost straight to the corner, blocker forces a gentle right bend.
    const pocket = POCKETS['foot-near'];
    const cue = { x: 45, y: 25 };
    const sol = solveBlockerCurve({ cue, pocket, chord: 45, side: 1, cutDeg: 9, cutSign: -1 });
    return {
      kind: 'curve' as const,
      pocket: 'foot-near' as const,
      cue,
      lockBalls: true,
      via: sol.samples.slice(1),
      balls: [
        { ballId: 1, ...sol.ob, role: 'object' as const },
        { ballId: 8, ...sol.blocker, role: 'blocker' as const },
      ],
      finishLen: 4.5,
    };
  })(),
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
  'sotd-32': (() => {
    // Small hop over a chalk cube / paper ring (no ball), short pot in the near corner, draw back.
    const pocket = POCKETS['foot-near'];
    const ob = { x: 88, y: 10 };
    const u = norm(sub(pocket, ob));
    const cue = sub(ob, scale(u, 16));
    return {
      kind: 'jump' as const,
      pocket: 'foot-near' as const,
      cue,
      lockBalls: true,
      jumpTakeoff: add(cue, scale(u, 4)),
      jumpLanding: add(cue, scale(u, 9)),
      balls: [{ ballId: 1, ...ob, role: 'object' as const }],
    };
  })(),
  'sotd-33': {
    // CB comes down-table rail-first (far rail) into an OB near the near side pocket for a
    // natural; low-left is reverse on this rail, shortening the rebound, and the low hit holds
    // the CB up-table (back toward the head) instead of racing on toward the foot.
    kind: 'kick',
    pocket: 'side-near',
    cue: { x: 18, y: 30 },
    rails: ['far'],
    railBend: -6,
    lockBalls: true,
    balls: [{ ballId: 1, x: 45, y: 6, role: 'object' }],
  },
  'sotd-34': {
    kind: 'bank',
    pocket: 'side-far',
    rails: ['near'],
    balls: [{ ballId: 1, x: 68, y: 4.0, role: 'object' }],
    cueGap: 17,
  },
  'sotd-35': {
    // Diamond to diamond: CB on the head string, OB on the foot string, straight to the corner.
    kind: 'line',
    pocket: 'foot-far',
    cue: { x: 25, y: 12.5 },
    lockBalls: true,
    balls: [{ ballId: 1, x: 75, y: 37.5, role: 'object' }],
  },
  'sotd-36': {
    // Blocker dead on the CB→OB line; OB past it near a corner; one-rail kick (comfortable
    // ~9° cut on arrival).
    kind: 'kick',
    pocket: 'foot-far',
    cue: { x: 20, y: 24 },
    rails: ['near'],
    lockBalls: true,
    balls: [
      { ballId: 1, x: 86, y: 40, role: 'object' },
      { ballId: 7, x: 53, y: 32, role: 'blocker' },
    ],
  },
  'sotd-37': {
    // Rail-first (far rail) natural into the side; running english widens the rebound.
    kind: 'kick',
    pocket: 'side-near',
    cue: { x: 22, y: 14 },
    rails: ['far'],
    railBend: 8,
    lockBalls: true,
    balls: [{ ballId: 1, x: 56, y: 16, role: 'object' }],
  },
  'sotd-38': {
    // 8 mid-table, 40° cut to the corner.
    kind: 'cut',
    pocket: 'foot-far',
    cutDeg: 40,
    cutSign: -1,
    cueGap: 18,
    balls: [{ ballId: 8, x: 62, y: 27, role: 'object' }],
  },
  'sotd-39': (() => {
    // CB only: four called rails (far → foot → near → head), parking near the foot spot.
    const cue = { x: 9, y: 46 };
    const end = { x: 70, y: 28 };
    const chain = railChain(cue, end, ['far', 'foot', 'near', 'head']);
    if (!chain) throw new Error('sotd-39: no four-rail tour');
    return {
      kind: 'explicit' as const,
      pocket: 'foot-far' as const,
      goal: 'path' as const,
      targetPt: end,
      cue,
      lockBalls: true,
      via: chain.slice(1, -1),
      balls: [],
    };
  })(),
  'sotd-40': (() => {
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
  'sotd-41': (() => {
    // Butterfly: body on the foot spot, wings ~½ diamond out on the corner lines, CB in the
    // kitchen straight into the body; the body stops where it meets both wings, wings fly to
    // opposite corners.
    const body = { ...FOOT_SPOT };
    const meet = { x: 79, y: 25 };
    const far = POCKETS['foot-far'];
    const near = POCKETS['foot-near'];
    const left = add(meet, scale(norm(sub(far, meet)), D));
    const right = add(meet, scale(norm(sub(near, meet)), D));
    return {
      kind: 'explicit' as const,
      pocket: 'foot-far' as const,
      goal: 'spot' as const,
      targetPt: meet,
      cue: { x: 20, y: 25 },
      lockBalls: true,
      via: [body],
      balls: [
        { ballId: 1, ...body, role: 'object' as const },
        { ballId: 2, ...left, role: 'object' as const },
        { ballId: 3, ...right, role: 'object' as const },
      ],
      extraPaths: [
        { ballId: 2, pts: [left, far] },
        { ballId: 3, pts: [right, near] },
      ],
    };
  })(),
  'sotd-42': (() => {
    // Four balls in a line, ¼-inch gaps, CB one diamond behind the first ball.
    const pocket = POCKETS['foot-far'];
    const last = { x: 88, y: 43.2 };
    return {
      kind: 'line' as const,
      pocket: 'foot-far' as const,
      balls: linedBalls(pocket, last, [4, 3, 2, 1], 2.5).reverse(),
      cueGap: 12.5,
    };
  })(),
  'sotd-43': (() => {
    // Two blockers form a gate slightly wider than a ball on the straight line to a target
    // near the corner; feather the CB through the gate.
    const pocket = POCKETS['foot-far'];
    const ob = { x: 90, y: 42 };
    const u = norm(sub(pocket, ob));
    const g = sub(ob, scale(u, D));
    const gate = sub(g, scale(u, 22));
    const n = perp(u);
    return {
      kind: 'line' as const,
      pocket: 'foot-far' as const,
      cue: sub(g, scale(u, 50)),
      lockBalls: true,
      balls: [
        { ballId: 1, ...ob, role: 'object' as const },
        { ballId: 8, ...add(gate, scale(n, 2.65)), role: 'blocker' as const },
        { ballId: 7, ...sub(gate, scale(n, 2.65)), role: 'blocker' as const },
      ],
    };
  })(),
  'sotd-44': {
    kind: 'kick',
    pocket: 'head-far',
    cue: { x: 20, y: 12 },
    rails: ['far', 'foot', 'near'],
    balls: [{ ballId: 1, x: 2.7, y: 46.3, role: 'object' }],
  },
  'sotd-45': (() => {
    // Hop over a towel roll / jump aid (no ball), OB just beyond, near corner.
    const pocket = POCKETS['foot-near'];
    const ob = { x: 86, y: 8 };
    const u = norm(sub(pocket, ob));
    const cue = sub(ob, scale(u, 18));
    return {
      kind: 'jump' as const,
      pocket: 'foot-near' as const,
      cue,
      lockBalls: true,
      jumpTakeoff: add(cue, scale(u, 5)),
      jumpLanding: add(cue, scale(u, 12)),
      balls: [{ ballId: 1, ...ob, role: 'object' as const }],
    };
  })(),
  'sotd-46': {
    // OB a ball off the long rail: rail → out → rail → corner (two rails before the pocket).
    kind: 'bank',
    pocket: 'foot-near',
    rails: ['near', 'far'],
    balls: [{ ballId: 1, x: 12, y: 3.4, role: 'object' }],
    cueGap: 13,
    lockBalls: true,
  },
  'sotd-47': (() => {
    // Marker pad near the corner line; CB one diamond back, straight; stun the OB to stop dead
    // on the marker.
    const ob = { x: 70, y: 30 };
    const u = norm(sub(POCKETS['foot-far'], ob));
    return {
      kind: 'line' as const,
      pocket: 'foot-far' as const,
      goal: 'spot' as const,
      targetPt: add(ob, scale(u, 10)),
      cueGap: 12.5,
      lockBalls: true,
      balls: [{ ballId: 1, ...ob, role: 'object' as const }],
    };
  })(),
  'sotd-48': {
    // OB near the corner, 55° cut; right english is outside here and swings the CB up-table.
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 55,
    cutSign: -1,
    cueGap: 20,
    lockBalls: true,
    balls: [{ ballId: 1, x: 90, y: 12, role: 'object' }],
    finishLen: 16,
  },
  'sotd-49': {
    // OB frozen on the long rail, CB nearly straight out from it; edge-only (76°) cut.
    kind: 'cut',
    pocket: 'foot-near',
    cutDeg: 75,
    cutSign: -1,
    cueGap: 21,
    lockBalls: true,
    balls: [{ ballId: 1, x: 80, y: FROZEN, role: 'object' }],
    finishLen: 5,
  },
  'sotd-50': (() => {
    // Short hop over a soft obstacle (no ball), land, then a slight right swerve into an OB
    // offset from the landing line; near corner.
    const pocket = POCKETS['foot-near'];
    const ob = { x: 84, y: 14 };
    const u = norm(sub(pocket, ob));
    const ghost = drawnGhostOf(ob, pocket);
    const h = 6;
    const chord = 20;
    const tangent = rotate(u, 8);
    const c = dirDeg(headingDeg(tangent) + toDeg(Math.atan2(2 * h, chord)));
    const land = sub(ghost, scale(c, chord));
    const ctrl = add(midpoint(land, ghost), scale(perp(c), h));
    const dj = norm(sub(ctrl, land));
    const takeoff = sub(land, scale(dj, 7));
    const cue = sub(takeoff, scale(dj, 4));
    return {
      kind: 'jump' as const,
      pocket: 'foot-near' as const,
      cue,
      lockBalls: true,
      jumpTakeoff: takeoff,
      jumpLanding: land,
      landSamples: sampleQuadratic(land, ctrl, ghost, 10).slice(1),
      landCtrl: ctrl,
      balls: [{ ballId: 1, ...ob, role: 'object' as const }],
    };
  })(),
  'sotd-51': (() => {
    // Mirror pair: cross-side bank from the left half, and the identical bank from the right half.
    const ob = { x: 28, y: 4.2 };
    const mirror = { x: 72, y: 4.2 };
    const chain = railChain(mirror, POCKETS['side-far'], ['near']);
    if (!chain) throw new Error('sotd-51: no mirror bank');
    return {
      kind: 'bank' as const,
      pocket: 'side-far' as const,
      rails: ['near'] as RailId[],
      cueGap: 17,
      lockBalls: true,
      balls: [
        { ballId: 1, ...ob, role: 'object' as const },
        { ballId: 2, ...mirror, role: 'prop' as const },
      ],
      extraPaths: [{ ballId: 2, pts: chain, faded: true }],
    };
  })(),
  'sotd-52': {
    // OB on the foot spot, CB on a kitchen mark, same corner every rep.
    kind: 'cut',
    pocket: 'foot-far',
    cue: { x: 18, y: 10 },
    lockBalls: true,
    balls: [{ ballId: 1, x: FOOT_SPOT.x, y: FOOT_SPOT.y, role: 'object' }],
  },
} as Record<string, Layout>);

function primaryOf<T extends { role?: string }>(balls: T[]): T {
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

function buildPath(layout: Layout): {
  cue: Pt;
  pocket: Pt;
  balls: BallSpec[];
  pts: Pt[];
  kinds: Array<SotdPathKind | undefined>;
} {
  const pocket = layout.targetPt
    ? { ...layout.targetPt }
    : layout.pocketPt
      ? { ...layout.pocketPt }
      : { ...POCKETS[layout.pocket] };
  const balls = layout.balls.map((b) => ({ ...b }));

  if (layout.kind === 'explicit') {
    if (!layout.cue) throw new Error('explicit layout needs a cue');
    const cue = { ...layout.cue };
    const pts = [cue, ...(layout.via ?? []).map((p) => ({ ...p })), pocket];
    const kinds: Array<SotdPathKind | undefined> = [...(layout.pathKinds ?? [])];
    if (kinds.length) while (kinds.length < pts.length - 1) kinds.unshift('ground');
    return { cue, pocket, balls, pts, kinds };
  }

  const primary = primaryOf(balls);
  const ob = { x: primary.x, y: primary.y };
  const gap = layout.cueGap ?? 15;

  if (layout.kind === 'bank') {
    let bankPts = resolveRails(ob, pocket, layout);
    if (layout.bankBend && layout.rails?.length === 1) {
      bankPts = [ob, bentRailContact(ob, pocket, layout.rails[0], layout.bankBend), pocket];
    }
    const firstHit = bankPts[1] ?? pocket;
    const cue = layout.cue
      ? { ...layout.cue }
      : layout.cutDeg
        ? cutCue(ob, firstHit, layout.cutDeg, gap, layout.cutSign ?? 1)
        : clampOnTable(aimBehind(ob, firstHit, gap));
    return { cue, pocket, balls, pts: [cue, ...bankPts], kinds: [] };
  }

  if (layout.kind === 'kick') {
    const cue = clampOnTable(layout.cue ?? { x: 18, y: 12 });
    // Rails mirror onto the ghost-ball position (not the OB centre) so the last cushion leg
    // arrives on the contact line that actually sends the OB to the pocket.
    const ghost = physicalGhost(ob, pocket);
    const kickPts =
      layout.railBend && layout.rails?.length === 1
        ? [cue, bentRailContact(cue, ghost, layout.rails[0], layout.railBend), ghost]
        : resolveRails(cue, ghost, layout);
    kickPts[kickPts.length - 1] = ob;
    return { cue, pocket, balls, pts: [...kickPts, pocket], kinds: [] };
  }

  if (layout.kind === 'carom') {
    const helper = balls.find((b) => b.role === 'helper') ?? balls.find((b) => b.ballId !== primary.ballId);
    const first = { x: primary.x, y: primary.y };
    const second = helper ? { x: helper.x, y: helper.y } : null;
    const cue = layout.cue ? { ...layout.cue } : clampOnTable(aimBehind(first, second ?? pocket, gap));
    const via = (layout.via ?? []).map((p) => ({ ...p }));
    const pts = [cue, ...via, pocket];
    const kinds: Array<SotdPathKind | undefined> = [...(layout.pathKinds ?? [])];
    while (kinds.length < Math.max(0, pts.length - 1)) kinds.unshift('ground');
    return { cue, pocket, balls, pts, kinds };
  }

  if (layout.kind === 'jump') {
    if (!layout.cue || !layout.jumpTakeoff || !layout.jumpLanding) {
      throw new Error('jump layout needs cue, takeoff and landing');
    }
    const cue = { ...layout.cue };
    const blocker = balls.find((b) => b.role === 'blocker');
    const pts: Pt[] = [cue, { ...layout.jumpTakeoff }];
    const kinds: SotdPathKind[] = ['ground'];
    if (blocker) {
      pts.push({ x: blocker.x, y: blocker.y });
      kinds.push('airborne');
    }
    pts.push({ ...layout.jumpLanding });
    kinds.push('airborne');
    for (const s of layout.landSamples ?? []) {
      pts.push({ ...s });
      kinds.push('ground');
    }
    pts.push(ob);
    kinds.push('ground');
    pts.push(pocket);
    kinds.push('object');
    return { cue, pocket, balls, pts, kinds };
  }

  if (layout.kind === 'curve') {
    if (!layout.cue || !layout.via?.length) throw new Error('curve layout needs cue + samples');
    const cue = { ...layout.cue };
    return { cue, pocket, balls, pts: [cue, ...layout.via.map((p) => ({ ...p })), ob, pocket], kinds: [] };
  }

  if (layout.kind === 'cut') {
    const deg = layout.cutDeg ?? 32;
    const sign = layout.cutSign ?? 1;
    const cue = layout.cue ? { ...layout.cue } : clampOnTable(cutCue(ob, pocket, deg, gap, sign));
    return { cue, pocket, balls, pts: [cue, ob, pocket], kinds: [] };
  }

  const objects = balls.filter((b) => !b.role || b.role === 'object');
  const objectPts = objects.map((b) => ({ x: b.x, y: b.y }));
  const aim = objectPts[0] ?? ob;
  const toward = objectPts[1] ?? pocket;
  const cue = layout.cue ? { ...layout.cue } : clampOnTable(aimBehind(aim, toward, gap));
  const after = layout.afterObject ?? [];
  return { cue, pocket, balls, pts: [cue, ...objectPts, ...after, pocket], kinds: [] };
}

type SpinKind = 'follow' | 'draw' | 'stun';

function spinKind(tip: string): SpinKind {
  const t = tip.toLowerCase();
  if (t.includes('6') || t.includes('low') || t.includes('draw') || t.includes('4:30') || t.includes('7:30')) {
    return 'draw';
  }
  if (t.includes('12') || t.includes('high') || t.includes('follow') || t.includes('1:30') || t.includes('10:30')) {
    return 'follow';
  }
  return 'stun'; // center, or side english at centre height
}

/** Spin ratio used for the CB finish (1 = natural roll, negative = draw). */
const FINISH_SPIN: Record<SpinKind, number> = { follow: 1.0, draw: -1.2, stun: 0 };
const FINISH_LEN: Record<SpinKind, number> = { follow: 11, draw: 9, stun: 7 };

function nearRailPad(p: Pt, pad: number): boolean {
  return p.x <= pad || p.x >= 100 - pad || p.y <= pad || p.y >= 50 - pad;
}

/** Port of rackup-web clothCurveControl so the CB finish uses the drawn curve's last tangent. */
function rendererCurveControl(start: Pt, end: Pt, vias: Pt[], blocker?: Pt): Pt {
  const chord = sub(end, start);
  const n = norm(perp(chord));
  const mid = midpoint(start, end);
  let side = 1;
  const probe = vias.find((v) => dist(v, start) > 2 && dist(v, end) > 2) ?? blocker;
  if (probe) {
    const sd = (probe.x - mid.x) * n.x + (probe.y - mid.y) * n.y;
    if (sd < 0) side = -1;
  }
  let bulge = 10;
  if (blocker) {
    const clearance = pointToSegmentDistance(blocker, start, end);
    bulge = Math.max(9, GHOST_BALL_DIAMETER + 4.5 - Math.min(clearance, 4));
  } else if (vias.length) {
    const far = Math.max(...vias.map((v) => pointToSegmentDistance(v, start, end)));
    bulge = Math.min(16, Math.max(8, far * 0.85));
  }
  return add(mid, scale(n, 2 * bulge * side));
}

const RAIL_NORMALS: Array<{ n: Pt; d: (p: Pt) => number }> = [
  { n: { x: 0, y: 1 }, d: (p) => p.y },
  { n: { x: 0, y: -1 }, d: (p) => 50 - p.y },
  { n: { x: 1, y: 0 }, d: (p) => p.x },
  { n: { x: -1, y: 0 }, d: (p) => 100 - p.x },
];

/**
 * Physically plausible CB finish after contact.
 * The CB leaves along the tangent line (stun), bends forward with follow (natural-roll
 * 30° rule) or back with draw — never straight through the OB on a cut, never back along
 * its own incoming line. When contact happens against a cushion (frozen-rail cuts) and the
 * CB would head into it, it rebounds immediately (mirror). The finish is shortened
 * (direction kept) to stay on the cloth and clear of balls and pockets.
 */
function physicalCbRest(tip: string, from: Pt, ob: Pt, firstLeg: Pt, others: Pt[], lenOverride?: number): Pt {
  const kind = spinKind(tip);
  const u = norm(sub(firstLeg, ob));
  const g = sub(ob, scale(u, D));
  const a = norm(sub(g, from));
  const cos = Math.max(-1, Math.min(1, a.x * u.x + a.y * u.y));
  const phi = Math.acos(cos);
  let dir: Pt;
  let len = lenOverride ?? FINISH_LEN[kind];
  if (phi < (6 * Math.PI) / 180) {
    if (kind === 'follow') dir = u;
    else if (kind === 'draw') dir = scale(u, -1);
    else {
      dir = scale(u, -1);
      len = 1.6; // stop shot: CB stays at contact (just past the renderer's 1.5 threshold)
    }
  } else {
    dir = cbDeflect(a, u, FINISH_SPIN[kind]);
  }
  for (const r of RAIL_NORMALS) {
    if (r.d(g) < R + 0.9 && dotP(dir, r.n) < 0) dir = sub(dir, scale(r.n, 2 * dotP(dir, r.n)));
  }
  const ok = (p: Pt) =>
    p.x >= 2.2 &&
    p.x <= 97.8 &&
    p.y >= 1.6 &&
    p.y <= 48.4 &&
    !(p.x < 15 && p.y < 10) &&
    others.every((o) => pointToSegmentDistance(o, g, p) >= D + 0.3) &&
    Object.values(POCKETS).every((pk) => pointToSegmentDistance(pk, g, p) >= 3.2);
  for (let l = len; l >= 1.7; l -= 0.25) {
    const p = roundPt(add(g, scale(dir, l)));
    if (ok(p)) return p;
  }
  return roundPt(add(g, scale(dir, 1.7)));
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

const ENGLISH: Record<string, { sidespin: number; backspin: number; follow: number; label: string }> = {
  center: { sidespin: 0, backspin: 0, follow: 0, label: 'none' },
  '12-high': { sidespin: 0, backspin: 0, follow: 0.7, label: 'follow' },
  '6-low': { sidespin: 0, backspin: 0.75, follow: 0, label: 'draw' },
  '3-right': { sidespin: 0.65, backspin: 0, follow: 0, label: 'right' },
  '9-left': { sidespin: -0.65, backspin: 0, follow: 0, label: 'left' },
  '1:30-high-right': { sidespin: 0.45, backspin: 0, follow: 0.5, label: 'high-right' },
  '10:30-high-left': { sidespin: -0.45, backspin: 0, follow: 0.5, label: 'high-left' },
  '4:30-low-right': { sidespin: 0.4, backspin: 0.55, follow: 0, label: 'low-right' },
  '7:30-low-left': { sidespin: -0.4, backspin: 0.55, follow: 0, label: 'low-left' },
};

function englishFor(tip: string): SotdShotMap['english'] {
  const e = ENGLISH[tip];
  if (!e) throw new Error(`unknown tip zone ${tip}`);
  return { tip_zone: tip, ...e };
}

function assemble(prev: SotdShotMap, layout: Layout, shot: CatalogShot): SotdShotMap {
  const goal: SotdShotGoal = layout.goal ?? 'pocket';
  const built = buildPath(layout);
  const airIdx = built.kinds
    .map((k, i) => (k === 'airborne' ? i : -1))
    .filter((i) => i >= 0);
  const nudgedBalls = layout.lockBalls ? built.balls : nudgeOffLane(built.balls, built.pts, airIdx);
  const { cue, pocket, pts, kinds } = built;
  const roundedBalls = nudgedBalls.map((b) => ({
    ballId: b.ballId,
    x: roundPt(b).x,
    y: roundPt(b).y,
    role: b.role ?? 'object',
  }));
  const base = {
    id: prev.id,
    name: shot.name,
    difficulty: shot.difficulty,
    difficulty_rating: prev.difficulty_rating,
    category: shot.category,
    speed_category: shot.speed,
    tip_zone: shot.tipZone,
    cue_ball_start: roundPt(cue),
  };
  const extra = layout.extraPaths?.map((e) => ({
    ballId: e.ballId,
    pts: e.pts.map((p) => roundPt(p)),
    ...(e.faded ? { faded: true } : {}),
  }));

  if (goal === 'path') {
    const end = roundPt(pocket);
    return {
      ...base,
      object_ball_positions: [],
      intended_path: pathFromPoints(pts),
      english: englishFor(shot.tipZone),
      landing_zones: [
        { ...end, label: 'end_zone' },
        { ...end, label: 'cb_rest' },
      ],
      pocket_target: end,
      shot_goal: 'path',
      coordinate_system: COORDINATE_SYSTEM,
      source: 'catalogue',
      ascii_table: renderAscii(cue, [], pts, pocket),
    };
  }

  const primary = primaryOf(roundedBalls);
  const contactIdx = pts.reduce(
    (best, p, i) => (dist(p, primary) < dist(pts[best], primary) ? i : best),
    0,
  );
  const firstLeg = pts[contactIdx + 1] ?? pocket;
  let from = pts[Math.max(0, contactIdx - 1)] ?? cue;
  if (layout.kind === 'curve') {
    const drawnGhost = drawnGhostOf(primary, pocket);
    const vias = pts.filter(
      (p, i) => i > 0 && i < contactIdx && dist(p, cue) > 2 && dist(p, primary) > 4 && !nearRailPad(p, 2.4),
    );
    const blocker = roundedBalls.find((b) => b.role === 'blocker');
    from = rendererCurveControl(cue, drawnGhost, vias, blocker);
  } else if (layout.landCtrl) {
    from = layout.landCtrl;
  }
  const others = roundedBalls.filter((b) => b !== primary);
  // Bank: the SPA auto-ghost aims at the pocket; pin it on the OB's real first leg (bank line).
  let ghostPin: SotdGhostBall | undefined = layout.ghostBall;
  if (!ghostPin && layout.kind === 'bank') {
    const gp = roundPt(sub(primary, scale(norm(sub(firstLeg, primary)), GHOST_BALL_DIAMETER)));
    const g = physicalGhost(primary, firstLeg);
    const a = norm(sub(g, from));
    const u = norm(sub(firstLeg, primary));
    const cut = angleBetween(a, u);
    ghostPin = { x: gp.x, y: gp.y, show: cut > 12 && cut < 78 };
  }
  const rest = layout.cbRest
    ? roundPt(layout.cbRest)
    : physicalCbRest(shot.tipZone, from, primary, firstLeg, others, layout.finishLen);
  return {
    ...base,
    object_ball_positions: roundedBalls,
    intended_path: pathFromPoints(pts, kinds.length ? kinds : undefined),
    english: englishFor(shot.tipZone),
    landing_zones: [
      { ...roundPt(pocket), label: goal === 'spot' ? 'target' : 'pocket' },
      { ...rest, label: 'cb_rest' },
    ],
    pocket_target: roundPt(pocket),
    ...(goal !== 'pocket' ? { shot_goal: goal } : {}),
    ...(extra?.length ? { extra_object_paths: extra } : {}),
    ...(ghostPin ? { ghost_ball: ghostPin } : {}),
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
 * Geometry is validated locally (sotd-shot-map-geometry.ts), physics by sotd-route-audit.ts,
 * and text agreement by sotd-text-consistency.ts. Do not generate maps via RealAI.
 * Regenerate with: npx ts-node -T scripts/generate-sotd-maps.ts
 */

export type SotdPoint = { x: number; y: number };

export type SotdGhostBall = SotdPoint & {
  radius?: number;
  show?: boolean;
};

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

/** pocket (default): OB to pocket_target · spot: OB stops on pocket_target · path: CB-only tour. */
export type SotdShotGoal = 'pocket' | 'spot' | 'path';

/** Another ball the shot moves on purpose (cluster split, butterfly wing, mirror bank). */
export type SotdExtraObjectPath = { ballId: number; pts: SotdPoint[]; faded?: boolean };

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
  /** Omit for a normal pot. */
  shot_goal?: SotdShotGoal;
  extra_object_paths?: SotdExtraObjectPath[];
  /** Rare pin — omit so SPA derives ghost = OB − normalize(aim − OB)×4.4 */
  ghost_ball?: SotdGhostBall;
  /** Rare pin — omit so SPA uses midpoint(ghost, OB). */
  contact_point?: SotdPoint;
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
  const next: SotdShotMap[] = [];
  const failures: string[] = [];

  for (const prev of SOTD_SHOT_MAPS) {
    const layout = LAYOUTS[prev.id];
    const shot = SHOT_CATALOG.find((s) => s.id === prev.id);
    if (!layout) {
      failures.push(`${prev.id}: missing layout spec`);
      continue;
    }
    if (!shot) {
      failures.push(`${prev.id}: not in shot catalog`);
      continue;
    }
    try {
      const map = assemble(prev, layout, shot);
      const report = validateSotdShotMap(map);
      if (!report.ok) failures.push(formatGeomReport(map, report));
      // Physics: real reflections, ghost-ball contact, enterable pockets, honest CB finish.
      const route = auditSotdRoute(map);
      if (route.status === 'fail') failures.push(formatRouteAudit(route));
      // Text agreement: the diagram shows what the catalogue text describes.
      const text = checkShotTextConsistency(shot, map);
      if (!text.ok) failures.push(formatConsistency(text));
      next.push(map);
    } catch (e) {
      failures.push(`${prev.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (failures.length) {
    console.error(`Validation failed for ${failures.length} map(s):\n${failures.join('\n')}`);
    process.exitCode = 1;
    console.error('Canonical sotd-shot-maps.ts was not overwritten.');
    if (process.env.SOTD_DUMP) fs.writeFileSync(process.env.SOTD_DUMP, JSON.stringify(next, null, 2));
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
  console.log(`All ${next.length} maps pass geometry validation, the route audit and the text check.`);
  console.log(`Wrote ${dest}`);
}

main();
