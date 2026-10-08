/**
 * Physics route audit for SOTD catalogue maps — no RealAI, no deps.
 *
 * validateSotdShotMap() checks that a diagram is well-formed. This audit checks that the
 * route is something a real ball can do, using the same picture rackup-web draws
 * (deriveShotGeometry: cue path → auto ghost, object path, cue-after to cb_rest):
 *
 *  1. placement — balls on the cloth, not in a pocket mouth, no overlaps
 *  2. object path — clear of other balls, ends in a real pocket, enterable angle
 *     (side ≤ 60° from perpendicular; corner not near-parallel unless it is a rail ball)
 *  3. contact — the cue path's last leg reaches the PHYSICAL ghost (OB − u·2.25 on the OB's
 *     first leg) from the correct side; cut ≤ 80°; the drawn ghost sits on that leg
 *  4. cushions — every bounce on a nose line, mirror reflection (±15°, ±25° with side spin),
 *     not inside a pocket mouth / jaw, no leg through a pocket or a ball, no unexplained kinks
 *  5. cue after contact — leaves along the tangent line (stun), bends forward with follow
 *     (natural-roll 30° rule), back with draw; never through the OB line or to the wrong side
 *  6. style — jump hop over the blocker, massé bends toward its spin side, combos line up,
 *     category matches the drawn story, no stacked layers
 *
 * Coordinates: cloth 100 × 50 (inches on a 9-ft table), x head→foot, y near→far.
 * The box-side reference implementation is audit.py (same thresholds).
 */
import {
  BALL_DIAMETER,
  GHOST_BALL_DIAMETER,
  POCKETS,
  type SotdGeomPoint as Pt,
} from './sotd-shot-map-geometry';

type Ball = Pt & { ballId: number; role?: string };
type Seg = { from: Pt; to: Pt; style?: string; kind?: string };

export type SotdRouteMap = {
  id: string;
  name: string;
  category: string;
  tip_zone: string;
  cue_ball_start: Pt;
  object_ball_positions: Ball[];
  intended_path: Seg[];
  english?: { tip_zone?: string; sidespin?: number; backspin?: number; follow?: number };
  landing_zones?: Array<Pt & { label: string }>;
  pocket_target: Pt;
  ghost_ball?: Pt & { show?: boolean };
};

export type RouteIssue = { code: string; severity: 'fail' | 'warn'; message: string };
export type RouteAudit = {
  id: string;
  status: 'pass' | 'warn' | 'fail';
  issues: RouteIssue[];
  cutDeg: number | null;
};

const L = 100;
const W = 50;
const D = BALL_DIAMETER;
const R = D / 2;
const CORNER_JAW = 4.5 / Math.SQRT2; // 4.5" corner mouth: nose ends this far along each rail
const SIDE_JAW = 2.5; // 5" side mouth

export const ROUTE_LIMITS = {
  cutFail: 80,
  cutWarn: 75,
  reflectFail: 15,
  reflectFailSpin: 25,
  sideEntryFail: 60,
  sideEntryWarn: 55,
  cornerEntryFail: 10,
  cornerEntryWarn: 16,
  kinkFail: 28,
};

/** Shots whose teaching intent is ambiguous — reviewed by a human, not auto-fixed. */
export const ROUTE_AUDIT_EXEMPT: Record<string, string> = {
  'sotd-15':
    'Jump drill deliberately aims the OB at the foot-rail centre (cloth-edge target, pinned by v2-routes smoke test); not a pocket.',
  'sotd-25':
    'Double-kiss escape is drawn as a stylised OB rail rebound + second kiss (pinned by v2-routes smoke test); needs a human redesign.',
};

// ── vectors ──────────────────────────────────────────────────────────────
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Pt, s: number): Pt => ({ x: a.x * s, y: a.y * s });
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const cross = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x;
const len = (a: Pt) => Math.hypot(a.x, a.y);
const dist = (a: Pt, b: Pt) => len(sub(a, b));
const norm = (a: Pt): Pt => {
  const n = len(a) || 1;
  return { x: a.x / n, y: a.y / n };
};
const perp = (a: Pt): Pt => ({ x: -a.y, y: a.x });
const deg = (r: number) => (r * 180) / Math.PI;
const ang = (a: Pt, b: Pt) => deg(Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))));
const P = (p: Pt): Pt => ({ x: Number(p.x), y: Number(p.y) });
const fmt = (p: Pt) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`;

function segDist(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < 1e-12) return dist(p, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, add(a, mul(ab, t)));
}

type RailId = 'near' | 'far' | 'head' | 'foot';
const RAIL_N: Record<RailId, Pt> = { near: { x: 0, y: 1 }, far: { x: 0, y: -1 }, head: { x: 1, y: 0 }, foot: { x: -1, y: 0 } };

function railOf(p: Pt, pad = 0.35): RailId | null {
  const c: Array<[RailId, number]> = [
    ['near', Math.abs(p.y)],
    ['far', Math.abs(p.y - W)],
    ['head', Math.abs(p.x)],
    ['foot', Math.abs(p.x - L)],
    ['near', Math.abs(p.y - R)],
    ['far', Math.abs(p.y - (W - R))],
    ['head', Math.abs(p.x - R)],
    ['foot', Math.abs(p.x - (L - R))],
  ];
  c.sort((a, b) => a[1] - b[1]);
  return c[0][1] <= pad ? c[0][0] : null;
}
const nearRail = (p: Pt, pad: number) => p.x <= pad || p.x >= L - pad || p.y <= pad || p.y >= W - pad;
const reflect = (v: Pt, n: Pt) => sub(v, mul(n, 2 * dot(v, n)));

function nearestPocket(p: Pt): { id: string; pt: Pt; d: number } {
  let best = { id: '', pt: { x: 0, y: 0 }, d: Infinity };
  for (const [id, pt] of Object.entries(POCKETS)) {
    const d = dist(p, pt);
    if (d < best.d) best = { id, pt, d };
  }
  return best;
}
const jawLen = (id: string) => (id.startsWith('side') ? SIDE_JAW : CORNER_JAW);

type Spin = { tip: string; follow: boolean; draw: boolean; side: number; stun: boolean };
function spinOf(m: SotdRouteMap): Spin {
  const tip = (m.tip_zone || m.english?.tip_zone || 'center').toLowerCase();
  const e = m.english ?? {};
  const draw = /6-|low|4:30|7:30/.test(tip) || (e.backspin ?? 0) > 0.2;
  const follow = !draw && (/12|high|1:30|10:30/.test(tip) || (e.follow ?? 0) > 0.2);
  let side = 0;
  if (/right|3-/.test(tip) || (e.sidespin ?? 0) > 0.2) side = 1;
  if (/left|9-/.test(tip) || (e.sidespin ?? 0) < -0.2) side = -1;
  return { tip, follow, draw, side, stun: !follow && !draw };
}

// ── port of rackup-web deriveShotGeometry (what the site draws) ──────────
const isAir = (s: Seg) => s.kind === 'airborne' || s.style === 'dashed';
function pathPoints(segs: Seg[]): Pt[] {
  if (!segs.length) return [];
  const pts = [P(segs[0].from)];
  for (const s of segs) {
    if (dist(pts[pts.length - 1], s.from) > 0.4) pts.push(P(s.from));
    pts.push(P(s.to));
  }
  return pts;
}
function dedupe(pts: Pt[], eps = 0.8): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) if (!out.length || dist(out[out.length - 1], p) > eps) out.push(p);
  return out;
}
function quad(a: Pt, c: Pt, b: Pt, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
  }
  return out;
}
function curveControl(start: Pt, end: Pt, vias: Pt[], blocker?: Pt): Pt {
  const n = norm(perp(sub(end, start)));
  const mid = mul(add(start, end), 0.5);
  let side = 1;
  const probe = vias.find((v) => dist(v, start) > 2 && dist(v, end) > 2) ?? blocker;
  if (probe && dot(sub(probe, mid), n) < 0) side = -1;
  let bulge = 10;
  if (blocker) bulge = Math.max(9, GHOST_BALL_DIAMETER + 4.5 - Math.min(segDist(blocker, start, end), 4));
  else if (vias.length) bulge = Math.min(16, Math.max(8, Math.max(...vias.map((v) => segDist(v, start, end))) * 0.85));
  return add(mid, mul(n, 2 * bulge * side));
}

function primaryOf(m: SotdRouteMap): Ball {
  const balls = m.object_ball_positions;
  return balls.find((b) => !b.role || b.role === 'object') ?? balls[0];
}

function comboBalls(m: SotdRouteMap, pts: Pt[], pad = 3.4): Ball[] {
  return m.object_ball_positions
    .filter((b) => !b.role || b.role === 'object' || b.role === 'helper')
    .map((b) => {
      let idx = 0;
      let best = Infinity;
      pts.forEach((p, i) => {
        const d = dist(p, b);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      return { b, idx, d: best };
    })
    .filter((x) => x.d <= pad)
    .sort((a, b) => a.idx - b.idx)
    .map((x) => x.b);
}

type Derived = {
  cat: string;
  pts: Pt[];
  start: Pt;
  pocket: Pt;
  prim: Ball;
  pp: Pt;
  contactIdx: number;
  combo: Ball[];
  isCombo: boolean;
  isCarom: boolean;
  pocketObj: Ball;
  aim: Pt;
  ghostDrawn: Pt;
  hasAir: boolean;
  air: Pt[];
  clothCurve: boolean;
  ctrl: Pt | null;
  approach: Pt[];
  objPath: Pt[];
  cueAfter: Pt[];
  blocker?: Ball;
};

function derive(m: SotdRouteMap): Derived {
  const cat = (m.category || '').toLowerCase();
  let segs = [...(m.intended_path ?? [])];
  const blocker = m.object_ball_positions.find((b) => b.role === 'blocker');
  if (cat === 'jump' && !segs.some(isAir) && blocker) {
    segs = segs.map((s) => (segDist(blocker, s.from, s.to) < 3.6 ? { ...s, kind: 'airborne', style: 'dashed' } : s));
  }
  const pts = pathPoints(segs);
  const start = P(m.cue_ball_start);
  const pocket = P(m.pocket_target);
  const prim = primaryOf(m);
  const pp = P(prim);
  let contactIdx = 0;
  pts.forEach((p, i) => {
    if (dist(p, pp) < dist(pts[contactIdx], pp)) contactIdx = i;
  });
  const combo = comboBalls(m, pts);
  const isCombo = cat === 'combo' && combo.length >= 2;
  const isCarom = cat === 'carom' && combo.length >= 2;
  const pocketObj = isCombo || isCarom ? combo[combo.length - 1] : prim;
  const aim = isCombo || isCarom ? P(combo[1]) : pocket;
  let ghostDrawn = sub(pp, mul(norm(sub(aim, pp)), GHOST_BALL_DIAMETER));
  if (m.ghost_ball && Number.isFinite(m.ghost_ball.x)) ghostDrawn = P(m.ghost_ball);
  const contact = mul(add(ghostDrawn, pp), 0.5);
  let railFirst = false;
  for (let i = 0; i < contactIdx; i++) {
    if (nearRail(pts[i], 3) && dist(pts[i], pp) > 8 && dist(pts[i], start) > 2) railFirst = true;
  }
  if ((cat === 'kick' || /rail.?first/i.test(m.name)) && pts.length > 1 && nearRail(pts[1], 3)) railFirst = true;
  const hasAir = segs.some(isAir);
  const vias = pts.filter(
    (p, i) => i > 0 && i < contactIdx && dist(p, start) > 2 && dist(p, pp) > 4 && !nearRail(p, 2.4),
  );
  const clothCurve = (cat === 'masse' || cat === 'curve') && !railFirst && !hasAir && (!!blocker || vias.length > 0);
  let ctrl: Pt | null = null;
  let air: Pt[] = [];
  let approach: Pt[];
  if (hasAir) {
    const run: Seg[] = [];
    for (const s of segs) {
      if (isAir(s) || s.kind === 'object' || s.kind === 'cue_after') break;
      run.push(s);
    }
    approach = dedupe(pathPoints(run));
    const aSegs: Seg[] = [];
    let seen = false;
    for (const s of segs) {
      if (isAir(s)) {
        aSegs.push(s);
        seen = true;
      } else if (seen) break;
    }
    air = pathPoints(aSegs);
    if (air.length >= 2) {
      const a0 = air[0];
      const a1 = air[air.length - 1];
      if (!blocker) air = [a0, a1];
      else {
        const o = P(blocker);
        const q = [a0];
        if (dist(a0, o) > 0.4) q.push(o);
        if (dist(a1, o) > 0.4 && dist(a1, a0) > 0.4) q.push(a1);
        air = q;
      }
    }
    if (approach.length < 2) approach = dedupe([start, air[0] ?? contact]);
  } else if (clothCurve) {
    ctrl = curveControl(start, ghostDrawn, vias, blocker ? P(blocker) : undefined);
    approach = quad(start, ctrl, ghostDrawn);
  } else {
    const ap = [start];
    for (let i = 0; i < contactIdx; i++) {
      if (dist(pts[i], pp) <= 4 || dist(pts[i], start) <= 2) continue;
      ap.push(pts[i]);
    }
    ap.push(ghostDrawn);
    approach = dedupe(ap);
  }
  let pc = 0;
  pts.forEach((p, i) => {
    if (dist(p, pocketObj) < dist(pts[pc], pocketObj)) pc = i;
  });
  const afterPts = pts.slice((isCombo || isCarom ? pc : contactIdx) + 1);
  const afterRails = afterPts.filter((p) => nearRail(p, 2.4) && dist(p, pocket) > 6);
  let objPath: Pt[];
  if (afterRails.length && cat !== 'jump' && cat !== 'masse') {
    objPath = dedupe([P(pocketObj), ...afterPts, pocket]);
    if (dist(objPath[0], objPath[objPath.length - 1]) < 4) objPath = [P(pocketObj), pocket];
  } else objPath = [P(pocketObj), pocket];
  // cue after (estimateCueAfter port, rest zone path)
  const rest = (m.landing_zones ?? []).find((z) => /cb|rest|cue/i.test(z.label));
  let cueAfter: Pt[];
  if (isCarom) {
    const tgt = P(combo[combo.length - 1]);
    cueAfter = dedupe(rest && dist(rest, tgt) > 2.5 ? [contact, tgt, P(rest)] : [contact, tgt]);
  } else if (rest && dist(rest, contact) > 1.5 && rest.x > 2 && rest.x < 98 && rest.y > 1 && rest.y < 49 && !(rest.x < 15 && rest.y < 10)) {
    cueAfter = [contact, P(rest)];
  } else {
    cueAfter = [contact]; // renderer falls back to its spin model; nothing pinned to audit
  }
  return {
    cat, pts, start, pocket, prim, pp, contactIdx, combo, isCombo, isCarom, pocketObj, aim,
    ghostDrawn, hasAir, air, clothCurve, ctrl, approach, objPath, cueAfter, blocker,
  };
}

// ── checks ────────────────────────────────────────────────────────────────
class Rep {
  issues: RouteIssue[] = [];
  fail(code: string, message: string) {
    this.issues.push({ code, severity: 'fail', message });
  }
  warn(code: string, message: string) {
    this.issues.push({ code, severity: 'warn', message });
  }
}

function checkRoute(rep: Rep, label: string, route: Pt[], tol: number, others: Ball[], skip?: Ball) {
  for (const p of route) {
    if (p.x < -0.05 || p.x > L + 0.05 || p.y < -0.05 || p.y > W + 0.05) {
      rep.fail('off_cloth', `${label} vertex ${fmt(p)} is outside the cushions`);
    }
  }
  for (let i = 1; i < route.length - 1; i++) {
    const p = route[i];
    const vin = sub(p, route[i - 1]);
    const vout = sub(route[i + 1], p);
    if (len(vin) < 0.8 || len(vout) < 0.8) continue;
    const rail = railOf(p);
    if (rail) {
      const pk = nearestPocket(p);
      const along = Math.abs(p.x - pk.pt.x) + Math.abs(p.y - pk.pt.y);
      if (along < jawLen(pk.id) + R) {
        rep.fail('rail_in_pocket', `${label} rail contact ${fmt(p)} is in the ${pk.id} pocket mouth (${along.toFixed(1)} from the point)`);
      } else if (along < jawLen(pk.id) + R + 1.2) {
        rep.warn('rail_near_jaw', `${label} rail contact ${fmt(p)} is on the ${pk.id} jaw (${along.toFixed(1)} from the point)`);
      }
      const err = ang(reflect(vin, RAIL_N[rail]), vout);
      const msg = `${label} ${rail}-rail bounce at ${fmt(p)} is ${err.toFixed(1)}° off a mirror reflection`;
      if (err > tol) rep.fail('bad_reflection', msg);
      else if (err > tol * 0.6) rep.warn('loose_reflection', msg);
    } else if (nearRail(p, 2.6) && nearestPocket(p).d > 5) {
      rep.fail('rail_off_nose', `${label} vertex ${fmt(p)} is near a rail but not on the cushion nose line`);
    } else {
      const a = ang(vin, vout);
      if (a > ROUTE_LIMITS.kinkFail && !others.some((b) => dist(p, b) <= 3.4)) {
        rep.fail('kink', `${label} bends ${a.toFixed(0)}° at ${fmt(p)} with no rail or ball there`);
      }
    }
  }
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    for (const [id, pk] of Object.entries(POCKETS)) {
      if (i === route.length - 2 && dist(b, pk) < 1) continue;
      const lim = id.startsWith('side') ? 2.6 : 3.0;
      const d = segDist(pk, a, b);
      if (d < lim && dist(a, pk) > 1) {
        rep.fail('through_pocket', `${label} segment ${fmt(a)}→${fmt(b)} runs through the ${id} pocket (${d.toFixed(1)} from it)`);
      }
    }
    for (const ob of others) {
      if (skip && ob === skip) continue;
      if (dist(ob, a) < 0.5 || dist(ob, b) < 0.5) continue;
      const d = segDist(ob, a, b);
      if (d < D - 0.01) rep.fail('through_ball', `${label} segment ${fmt(a)}→${fmt(b)} passes through ball #${ob.ballId} (centre gap ${d.toFixed(2)})`);
      else if (d < D + 0.25) rep.warn('ball_tight', `${label} segment ${fmt(a)}→${fmt(b)} grazes ball #${ob.ballId}`);
    }
  }
}

function pocketEntry(rep: Rep, from: Pt, pocket: Pt, ball: Pt): number | null {
  const pk = nearestPocket(pocket);
  if (pk.d > 1) {
    rep.fail('no_pocket', `object ball ends at ${fmt(pocket)}, ${pk.d.toFixed(1)} from the nearest pocket mouth`);
    return null;
  }
  const v = sub(pocket, from);
  if (pk.id.startsWith('side')) {
    const th = ang(v, pocket.y < 1 ? { x: 0, y: -1 } : { x: 0, y: 1 });
    const msg = `object ball enters ${pk.id} at ${th.toFixed(0)}° from perpendicular`;
    if (th > ROUTE_LIMITS.sideEntryFail) rep.fail('side_angle', `${msg} — the side pocket rejects it`);
    else if (th > ROUTE_LIMITS.sideEntryWarn) rep.warn('side_angle', msg);
    return th;
  }
  const aLong = deg(Math.atan2(Math.abs(v.y), Math.abs(v.x)));
  const a = Math.min(aLong, 90 - aLong);
  const railDist = aLong < 45 ? Math.abs(ball.y - pocket.y) : Math.abs(ball.x - pocket.x);
  const msg = `object ball enters ${pk.id} ${a.toFixed(0)}° off the rail`;
  if (a < ROUTE_LIMITS.cornerEntryFail && railDist > 2.5) rep.fail('corner_angle', `${msg} from ${railDist.toFixed(1)} off it — too parallel to drop`);
  else if (a < ROUTE_LIMITS.cornerEntryWarn && railDist > 2.5) rep.warn('corner_angle', msg);
  return a;
}

/** Spin ratio s (+follow/−draw, 1 = natural roll) that sends the CB along rd after a cut φ. */
export function impliedSpin(a: Pt, u: Pt, rd: Pt, cutDeg: number): number | null {
  const t = norm(sub(a, mul(u, dot(a, u))));
  const rt = dot(rd, t);
  const ru = dot(rd, u);
  const phi = (cutDeg * Math.PI) / 180;
  const den = 2 * (rt * Math.cos(phi) - ru * Math.sin(phi));
  if (Math.abs(den) < 1e-9) return null;
  const s = (5 * ru * Math.sin(phi)) / den;
  if ((5 + 2 * s) * rt < 0 && Math.abs(rt) > 0.05) return null;
  return s;
}

const SPIN_RANGES: Record<'stun' | 'follow' | 'draw', [number, number, number, number]> = {
  stun: [-0.6, -0.3, 0.6, 1.0],
  follow: [0.0, 0.3, 1.6, 2.2],
  draw: [-2.4, -1.9, -0.2, 0.0],
};

function afterDirection(rep: Rep, label: string, a: Pt, u: Pt, rd: Pt, spin: Spin, cut: number, travel: number) {
  if (cut < 6) {
    const f = dot(rd, u);
    if (spin.follow && f < Math.cos(Math.PI / 6)) rep.fail('cb_after', `${label}: near-straight follow but CB leaves ${ang(rd, u).toFixed(0)}° off the shot line`);
    if (spin.draw && f > -Math.cos((35 * Math.PI) / 180)) rep.fail('cb_after', `${label}: near-straight draw but CB does not come back`);
    if (spin.stun && travel > 6) rep.fail('cb_after', `${label}: stop/stun shot but CB travels ${travel.toFixed(1)}`);
    else if (spin.stun && travel > 3) rep.warn('cb_after', `${label}: stop/stun shot but CB drifts ${travel.toFixed(1)}`);
    return;
  }
  const s = impliedSpin(a, u, rd, cut);
  const kind = spin.follow ? 'follow' : spin.draw ? 'draw' : 'stun';
  const [lo, wlo, whi, hi] = SPIN_RANGES[kind];
  const desc = `${label}: CB finish needs spin ${s === null ? 'n/a' : s.toFixed(2)} on a ${cut.toFixed(0)}° cut (declared ${spin.tip})`;
  if (s === null) rep.fail('cb_after', `${desc} — wrong side of the tangent line`);
  else if (s < lo || s > hi) rep.fail('cb_after', `${desc} — impossible for a ${kind} hit`);
  else if (s < wlo || s > whi) rep.warn('cb_after', desc);
}

export function auditSotdRoute(m: SotdRouteMap): RouteAudit {
  const rep = new Rep();
  const g = derive(m);
  const spin = spinOf(m);
  const balls = m.object_ball_positions;
  const { start: cue, pp, pocket } = g;
  const tol = spin.side ? ROUTE_LIMITS.reflectFailSpin : ROUTE_LIMITS.reflectFail;

  // 1 placement
  const all: Array<[string, Pt]> = [['cue', cue], ...balls.map((b) => [`#${b.ballId}`, P(b)] as [string, Pt])];
  for (const [name, p] of all) {
    if (p.x < R - 0.01 || p.x > L - R + 0.01 || p.y < R - 0.01 || p.y > W - R + 0.01) rep.fail('placement', `${name} at ${fmt(p)} is not on the cloth`);
    const pk = nearestPocket(p);
    if (pk.d < jawLen(pk.id)) rep.fail('placement', `${name} at ${fmt(p)} sits in the ${pk.id} pocket mouth`);
  }
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (dist(all[i][1], all[j][1]) < D - 0.05) rep.fail('overlap', `${all[i][0]} and ${all[j][0]} overlap`);
    }
  }

  // 3 contact (physical ghost on the OB's first leg)
  let u = g.isCombo || g.isCarom ? norm(sub(g.aim, pp)) : norm(sub(g.objPath[1] ?? pocket, pp));
  let ghost = sub(pp, mul(u, D));
  if (!g.isCarom && ang(sub(pp, g.ghostDrawn), u) > 3) {
    rep.fail('ghost_wrong_line', `drawn ghost ${fmt(g.ghostDrawn)} is not on the OB's first leg — the drawn cue path ends on the wrong line`);
  }
  const from = g.clothCurve && g.ctrl ? g.ctrl : g.hasAir ? g.air[g.air.length - 1] ?? cue : g.approach[g.approach.length - 2] ?? cue;
  let a = norm(sub(ghost, from));
  if (g.isCarom) {
    const dd = norm(sub(g.ghostDrawn, from));
    const off = Math.abs(cross(dd, sub(pp, from)));
    if (off >= D) rep.fail('carom_miss', `drawn carom line misses #${g.prim.ballId}`);
    else {
      ghost = add(from, mul(dd, dot(sub(pp, from), dd) - Math.sqrt(D * D - off * off)));
      u = norm(sub(pp, ghost));
      a = dd;
    }
  }
  const cut = ang(a, u);
  if (cut >= 90) rep.fail('contact_side', `CB arrives from ${fmt(from)} on the far side of #${g.prim.ballId} (cut ${cut.toFixed(0)}°) — it would have to pass through the OB`);
  else if (cut > ROUTE_LIMITS.cutFail) rep.fail('cut_too_thin', `cut ${cut.toFixed(0)}° > ${ROUTE_LIMITS.cutFail}°`);
  else if (cut > ROUTE_LIMITS.cutWarn) rep.warn('cut_thin', `cut ${cut.toFixed(0)}°`);

  // 4 cue route
  if (g.hasAir) {
    const ground = dedupe([...g.approach, ...(g.air.length ? [g.air[0]] : [])]);
    checkRoute(rep, 'cue path', ground, tol, balls);
    if (g.air.length) {
      checkRoute(rep, 'cue path after landing', [g.air[g.air.length - 1], ghost], tol, balls.filter((b) => b !== g.prim));
      if (g.blocker) {
        const b = P(g.blocker);
        if (segDist(b, g.air[0], g.air[g.air.length - 1]) > 2) rep.fail('jump_misses_blocker', `airborne hop does not pass over blocker #${g.blocker.ballId}`);
      }
    }
  } else if (g.clothCurve && g.ctrl) {
    const pts = g.approach;
    for (const b of balls) {
      if (b === g.prim) continue;
      let dmin = Infinity;
      for (let i = 0; i < pts.length - 1; i++) dmin = Math.min(dmin, segDist(b, pts[i], pts[i + 1]));
      if (dmin < D - 0.01) rep.fail('through_ball', `massé/curve path passes through ball #${b.ballId}`);
    }
    const turn = cross(sub(g.ctrl, cue), sub(g.ghostDrawn, g.ctrl)) > 0 ? 'left' : 'right';
    if ((spin.side === 1 && turn !== 'right') || (spin.side === -1 && turn !== 'left')) {
      rep.fail('curve_wrong_way', `path curves ${turn} but the declared english is ${spin.side === 1 ? 'right' : 'left'}`);
    }
    if (spin.side === 0) rep.fail('curve_no_spin', 'curve drawn but no side spin declared');
  } else {
    checkRoute(rep, 'cue path', [...g.approach.slice(0, -1), ghost], tol, balls, g.prim);
  }

  // 2 object path
  if (g.isCombo) {
    for (let i = 0; i < g.combo.length - 1; i++) {
      const A = P(g.combo[i]);
      const B = P(g.combo[i + 1]);
      const nxt = i + 2 < g.combo.length ? P(g.combo[i + 2]) : g.objPath[1] ?? pocket;
      const bend = ang(sub(B, A), sub(nxt, B));
      const miss = dist(B, nxt) * Math.sin((bend * Math.PI) / 180);
      if (bend > 14 || miss > 2) rep.fail('combo_transfer', `combo #${g.combo[i].ballId}→#${g.combo[i + 1].ballId} bends ${bend.toFixed(1)}° (misses by ${miss.toFixed(1)})`);
      else if (miss > 1.2) rep.warn('combo_transfer', `combo #${g.combo[i].ballId}→#${g.combo[i + 1].ballId} misses its line by ${miss.toFixed(1)}`);
      for (const b of balls) {
        if (b === g.combo[i] || b === g.combo[i + 1]) continue;
        if (segDist(b, A, B) < D - 0.01) rep.fail('combo_blocked', `ball #${b.ballId} sits between combo balls`);
      }
    }
  }
  if (!g.isCarom) checkRoute(rep, 'object path', g.objPath, ROUTE_LIMITS.reflectFail, balls.filter((b) => b !== g.pocketObj));
  const entryFrom = g.objPath.length >= 2 ? g.objPath[g.objPath.length - 2] : pp;
  pocketEntry(rep, entryFrom, pocket, g.objPath.length === 2 ? P(g.pocketObj) : entryFrom);

  // 5 cue after contact
  const ca = g.cueAfter;
  if (g.isCarom) {
    const tgt = P(g.combo[g.combo.length - 1]);
    afterDirection(rep, 'carom deflection', a, u, norm(sub(tgt, ghost)), spin, cut, dist(tgt, ghost));
    const g1 = sub(tgt, mul(norm(sub(pocket, tgt)), D));
    checkRoute(rep, 'carom CB leg', [ghost, g1], tol, balls.filter((b) => b !== g.prim && b !== g.combo[g.combo.length - 1]));
  } else if (ca.length >= 2) {
    const rest = ca[ca.length - 1];
    if (dist(rest, ghost) > 2 || (cut < 6 && spin.stun)) {
      afterDirection(rep, 'cue after contact', a, u, norm(sub(rest, ghost)), spin, cut, dist(rest, ghost));
    }
    for (const b of balls) {
      if (b !== g.prim && segDist(b, ca[0], rest) < D - 0.01) rep.fail('cb_after_through_ball', `cue-after line passes through ball #${b.ballId}`);
    }
    for (const [id, pk] of Object.entries(POCKETS)) {
      if (segDist(pk, ca[0], rest) < 2.6) rep.fail('cb_after_scratch', `cue-after line runs into the ${id} pocket`);
    }
  }

  // 6 style / story
  const railsBefore = g.pts.slice(1, g.contactIdx).filter((p) => railOf(p));
  const railsAfter = g.objPath.slice(1, -1).filter((p) => railOf(p));
  if (g.cat === 'kick' && !railsBefore.length) rep.fail('tag_story', 'kick shot without a cushion before the object ball');
  if (g.cat === 'bank' && !railsAfter.length) rep.fail('tag_story', 'bank shot without a cushion on the object-ball path');
  if (g.cat === 'jump' && !g.hasAir) rep.fail('tag_story', 'jump without a dashed airborne hop');
  if ((g.cat === 'masse' || g.cat === 'curve') && g.hasAir) rep.fail('tag_story', 'massé/curve drawn as an airborne jump');
  if (g.cat === 'combo' && !g.isCombo) rep.fail('tag_story', 'combo path does not visit two object balls');
  for (let i = 1; i < g.pts.length - 1; i++) {
    const vin = sub(g.pts[i], g.pts[i - 1]);
    const vout = sub(g.pts[i + 1], g.pts[i]);
    if (len(vin) > 0.5 && len(vout) > 0.5 && ang(vin, vout) > 170 && !railOf(g.pts[i]) && !balls.some((b) => dist(g.pts[i], b) < 3.4)) {
      rep.fail('stacked', `path doubles back on itself at ${fmt(g.pts[i])}`);
    }
  }

  const fails = rep.issues.some((i) => i.severity === 'fail');
  const warns = rep.issues.some((i) => i.severity === 'warn');
  return { id: m.id, status: fails ? 'fail' : warns ? 'warn' : 'pass', issues: rep.issues, cutDeg: Number.isFinite(cut) ? cut : null };
}

export function formatRouteAudit(r: RouteAudit): string {
  if (!r.issues.length) return `${r.id}: pass`;
  return `${r.id}: ${r.status} — ${r.issues.map((i) => `[${i.severity}] ${i.message}`).join('; ')}`;
}
