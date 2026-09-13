/**
 * Local SOTD diagram geometry — no RealAI.
 * Cloth plane: x 0–100 head→foot, y 0–50 near→far (2:1).
 * Validator + rail helpers for playable catalogue maps.
 */

export type SotdGeomPoint = { x: number; y: number };

export type SotdGeomSegment = { from: SotdGeomPoint; to: SotdGeomPoint };

export type SotdGeomBall = SotdGeomPoint & {
  ballId: number;
  role?: string;
};

/** Minimal map shape the validator understands. */
export type SotdGeomMap = {
  id: string;
  name?: string;
  category: string;
  cue_ball_start: SotdGeomPoint;
  object_ball_positions: SotdGeomBall[];
  intended_path: SotdGeomSegment[];
  pocket_target: SotdGeomPoint;
};

export const TABLE_LENGTH = 100;
export const TABLE_WIDTH = 50;

/** Physical ball diameter in cloth units (2.25″ on a 100″ 9-ft cloth). */
export const BALL_DIAMETER = 2.25;
export const BALL_RADIUS = BALL_DIAMETER / 2;

/** Balls must sit this far inside the cushion nose. */
export const BALL_INSET = 2.0;

export type PocketId =
  | 'head-near'
  | 'head-far'
  | 'side-near'
  | 'side-far'
  | 'foot-near'
  | 'foot-far';

export type RailId = 'near' | 'far' | 'head' | 'foot';

export const POCKETS: Record<PocketId, SotdGeomPoint> = {
  'head-near': { x: 0, y: 0 },
  'head-far': { x: 0, y: TABLE_WIDTH },
  'side-near': { x: TABLE_LENGTH / 2, y: 0 },
  'side-far': { x: TABLE_LENGTH / 2, y: TABLE_WIDTH },
  'foot-near': { x: TABLE_LENGTH, y: 0 },
  'foot-far': { x: TABLE_LENGTH, y: TABLE_WIDTH },
};

export const POCKET_LIST = Object.entries(POCKETS).map(([id, center]) => ({
  id: id as PocketId,
  center,
}));

export function dist(a: SotdGeomPoint, b: SotdGeomPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function sub(a: SotdGeomPoint, b: SotdGeomPoint): SotdGeomPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add(a: SotdGeomPoint, b: SotdGeomPoint): SotdGeomPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: SotdGeomPoint, s: number): SotdGeomPoint {
  return { x: v.x * s, y: v.y * s };
}

export function norm(v: SotdGeomPoint): SotdGeomPoint {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

export function roundPt(p: SotdGeomPoint, digits = 1): SotdGeomPoint {
  const f = 10 ** digits;
  return { x: Math.round(p.x * f) / f, y: Math.round(p.y * f) / f };
}

export function nearestPocket(p: SotdGeomPoint): { id: PocketId; center: SotdGeomPoint; dist: number } {
  let best = POCKET_LIST[0];
  let bestD = dist(p, best.center);
  for (const pk of POCKET_LIST.slice(1)) {
    const d = dist(p, pk.center);
    if (d < bestD) {
      best = pk;
      bestD = d;
    }
  }
  return { id: best.id, center: best.center, dist: bestD };
}

export function isOnTable(p: SotdGeomPoint, inset = BALL_INSET): boolean {
  return (
    p.x >= inset &&
    p.x <= TABLE_LENGTH - inset &&
    p.y >= inset &&
    p.y <= TABLE_WIDTH - inset
  );
}

export function clampOnTable(p: SotdGeomPoint, inset = BALL_INSET): SotdGeomPoint {
  return {
    x: Math.max(inset, Math.min(TABLE_LENGTH - inset, p.x)),
    y: Math.max(inset, Math.min(TABLE_WIDTH - inset, p.y)),
  };
}

export function railNormal(rail: RailId): SotdGeomPoint {
  if (rail === 'near') return { x: 0, y: 1 };
  if (rail === 'far') return { x: 0, y: -1 };
  if (rail === 'head') return { x: 1, y: 0 };
  return { x: -1, y: 0 };
}

export function classifyRail(p: SotdGeomPoint, pad = 2.4): RailId | null {
  const hits: Array<{ rail: RailId; d: number }> = [
    { rail: 'near', d: Math.abs(p.y - 0) },
    { rail: 'far', d: Math.abs(p.y - TABLE_WIDTH) },
    { rail: 'head', d: Math.abs(p.x - 0) },
    { rail: 'foot', d: Math.abs(p.x - TABLE_LENGTH) },
  ];
  hits.sort((a, b) => a.d - b.d);
  return hits[0].d <= pad ? hits[0].rail : null;
}

export function mirrorPoint(p: SotdGeomPoint, rail: RailId): SotdGeomPoint {
  if (rail === 'near') return { x: p.x, y: -p.y };
  if (rail === 'far') return { x: p.x, y: 2 * TABLE_WIDTH - p.y };
  if (rail === 'head') return { x: -p.x, y: p.y };
  return { x: 2 * TABLE_LENGTH - p.x, y: p.y };
}

function railValue(rail: RailId): { axis: 'x' | 'y'; value: number } {
  if (rail === 'near') return { axis: 'y', value: 0 };
  if (rail === 'far') return { axis: 'y', value: TABLE_WIDTH };
  if (rail === 'head') return { axis: 'x', value: 0 };
  return { axis: 'x', value: TABLE_LENGTH };
}

/**
 * Intersection of segment a→b with a cushion line.
 * Returns null if the hit is not between the endpoints or off the rail span.
 */
export function hitRail(
  a: SotdGeomPoint,
  b: SotdGeomPoint,
  rail: RailId,
  opts?: { minT?: number; maxT?: number; edgePad?: number },
): SotdGeomPoint | null {
  const minT = opts?.minT ?? 0.03;
  const maxT = opts?.maxT ?? 0.97;
  const edgePad = opts?.edgePad ?? 2.5;
  const { axis, value } = railValue(rail);
  const da = axis === 'x' ? b.x - a.x : b.y - a.y;
  if (Math.abs(da) < 1e-8) return null;
  const t = (value - (axis === 'x' ? a.x : a.y)) / da;
  if (t < minT || t > maxT) return null;
  const hit = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  if (axis === 'y') {
    if (hit.x < edgePad || hit.x > TABLE_LENGTH - edgePad) return null;
    return { x: hit.x, y: value };
  }
  if (hit.y < edgePad || hit.y > TABLE_WIDTH - edgePad) return null;
  return { x: value, y: hit.y };
}

/**
 * Multi-rail path from `from` to `to` using successive mirrors.
 * Points: [from, hit1, hit2, ..., to]
 */
export function railChain(
  from: SotdGeomPoint,
  to: SotdGeomPoint,
  rails: RailId[],
): SotdGeomPoint[] | null {
  if (!rails.length) return [from, to];
  const mirrors: SotdGeomPoint[] = [to];
  let target = to;
  for (let i = rails.length - 1; i >= 0; i--) {
    target = mirrorPoint(target, rails[i]);
    mirrors.push(target);
  }
  const pts: SotdGeomPoint[] = [from];
  let current = from;
  for (let i = 0; i < rails.length; i++) {
    const dest = mirrors[rails.length - i];
    const hit = hitRail(current, dest, rails[i]);
    if (!hit) return null;
    pts.push(hit);
    current = hit;
  }
  pts.push(to);
  return pts;
}

const RAIL_ORDER: RailId[] = ['near', 'foot', 'far', 'head'];

/** Search rail sequences of length n with no immediate repeat. */
export function findRailChain(
  from: SotdGeomPoint,
  to: SotdGeomPoint,
  n: number,
): { rails: RailId[]; pts: SotdGeomPoint[] } | null {
  const seqs: RailId[][] = [];
  const walk = (acc: RailId[]) => {
    if (acc.length === n) {
      seqs.push([...acc]);
      return;
    }
    for (const r of RAIL_ORDER) {
      if (acc[acc.length - 1] === r) continue;
      walk([...acc, r]);
    }
  };
  walk([]);
  for (const rails of seqs) {
    const pts = railChain(from, to, rails);
    if (pts) return { rails, pts };
  }
  return null;
}

/** Cue (or ghost) sitting behind `ob` aiming at `toward`. */
export function aimBehind(ob: SotdGeomPoint, toward: SotdGeomPoint, gap: number): SotdGeomPoint {
  const away = norm(sub(ob, toward));
  return clampOnTable(add(ob, scale(away, gap)));
}

export function pathFromPoints(pts: SotdGeomPoint[]): SotdGeomSegment[] {
  const segs: SotdGeomSegment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segs.push({ from: roundPt(pts[i]), to: roundPt(pts[i + 1]) });
  }
  return segs;
}

export function pathPoints(segs: SotdGeomSegment[]): SotdGeomPoint[] {
  if (!segs.length) return [];
  const pts: SotdGeomPoint[] = [{ ...segs[0].from }];
  for (const s of segs) {
    const last = pts[pts.length - 1];
    if (dist(last, s.from) > 0.35) pts.push({ ...s.from });
    pts.push({ ...s.to });
  }
  return pts;
}

function unitAngleDeg(a: SotdGeomPoint, b: SotdGeomPoint): number {
  const na = norm(a);
  const nb = norm(b);
  const dot = Math.max(-1, Math.min(1, na.x * nb.x + na.y * nb.y));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Reflect velocity `v` off a cushion with inward normal `n`. */
export function reflectVelocity(v: SotdGeomPoint, n: SotdGeomPoint): SotdGeomPoint {
  const nn = norm(n);
  const dn = v.x * nn.x + v.y * nn.y;
  return { x: v.x - 2 * dn * nn.x, y: v.y - 2 * dn * nn.y };
}

export function reflectionAngleErrorDeg(
  incoming: SotdGeomPoint,
  outgoing: SotdGeomPoint,
  rail: RailId,
): number {
  const predicted = reflectVelocity(incoming, railNormal(rail));
  return unitAngleDeg(predicted, outgoing);
}

export function pickPrimaryObject(map: SotdGeomMap): SotdGeomBall | null {
  const balls = map.object_ball_positions ?? [];
  const objects = balls.filter((b) => !b.role || b.role === 'object');
  return objects[0] ?? balls[0] ?? null;
}

export function perp(v: SotdGeomPoint): SotdGeomPoint {
  return { x: -v.y, y: v.x };
}

/** Shortest distance from point `p` to segment a→b. */
export function pointToSegmentDistance(p: SotdGeomPoint, a: SotdGeomPoint, b: SotdGeomPoint): number {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 < 1e-8) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2));
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

/** Balls that sit on a path vertex (combo/carom contacts). */
export function isPathContact(ball: SotdGeomPoint, pts: SotdGeomPoint[], pad = 3): boolean {
  return pts.some((p) => dist(p, ball) <= pad);
}

export function nearestPathIndex(
  p: SotdGeomPoint,
  pts: SotdGeomPoint[],
): { idx: number; dist: number } {
  let idx = 0;
  let best = Infinity;
  pts.forEach((pt, i) => {
    const d = dist(p, pt);
    if (d < best) {
      best = d;
      idx = i;
    }
  });
  return { idx, dist: best };
}

/**
 * Object/helper balls the intended path actually visits, in travel order.
 * Used for combo transfer checks (centers must line up).
 */
export function orderComboBalls(
  map: SotdGeomMap,
  pts?: SotdGeomPoint[],
  pad = 3.4,
): SotdGeomBall[] {
  const path = pts ?? pathPoints(map.intended_path ?? []);
  const objects = (map.object_ball_positions ?? []).filter(
    (b) => !b.role || b.role === 'object' || b.role === 'helper',
  );
  return objects
    .map((b) => ({ b, ...nearestPathIndex(b, path) }))
    .filter((x) => x.dist <= pad)
    .sort((a, c) => a.idx - c.idx)
    .map((x) => x.b);
}

export type SotdGeomIssue = { code: string; message: string };

export type SotdGeomReport = {
  ok: boolean;
  issues: SotdGeomIssue[];
};

const POCKET_NEAR = 8;
const PATH_CONNECT = 1.6;
const PATH_CUE_NEAR = 3.5;
const PATH_OB_NEAR = 6.5;
const PATH_POCKET_NEAR = 8;
const REFLECT_MAX_DEG = 32;
/** Max bend at a combo contact — the driven ball must leave along the line of centers. */
export const COMBO_ALIGN_MAX_DEG = 14;
/** Half-width of the travel corridor a parked ball may not occupy. */
export const LANE_CLEARANCE = 2.4;

function issue(code: string, message: string): SotdGeomIssue {
  return { code, message };
}

/**
 * Playable-diagram checks — not a full physics engine.
 * Bank/kick maps must show at least one plausible cushion bounce.
 */
export function validateSotdShotMap(map: SotdGeomMap): SotdGeomReport {
  const issues: SotdGeomIssue[] = [];
  const cue = map.cue_ball_start;
  const primary = pickPrimaryObject(map);
  const pocket = map.pocket_target;
  const segs = map.intended_path ?? [];
  const cat = (map.category || '').toLowerCase();

  if (!cue || !Number.isFinite(cue.x) || !Number.isFinite(cue.y)) {
    issues.push(issue('cue_missing', 'cue_ball_start is required'));
  } else if (!isOnTable(cue)) {
    issues.push(
      issue('cue_off_table', `cue ball (${cue.x},${cue.y}) is not on the playing surface`),
    );
  }

  if (!map.object_ball_positions?.length) {
    issues.push(issue('no_object_balls', 'at least one object ball is required'));
  } else {
    map.object_ball_positions.forEach((b, i) => {
      if (!isOnTable(b, 1.2)) {
        issues.push(
          issue(
            'ball_off_table',
            `object ball #${b.ballId ?? i} (${b.x},${b.y}) is not on the playing surface`,
          ),
        );
      }
    });
  }

  const pk = pocket ? nearestPocket(pocket) : null;
  if (!pocket) {
    issues.push(issue('pocket_missing', 'pocket_target is required'));
  } else if (!pk || pk.dist > POCKET_NEAR) {
    issues.push(
      issue(
        'pocket_not_near',
        `pocket_target (${pocket.x},${pocket.y}) is ${pk ? pk.dist.toFixed(1) : '?'} from the nearest pocket`,
      ),
    );
  }

  if (!segs.length) {
    issues.push(issue('path_empty', 'intended_path must have at least one segment'));
    return { ok: false, issues };
  }

  for (let i = 1; i < segs.length; i++) {
    const gap = dist(segs[i - 1].to, segs[i].from);
    if (gap > PATH_CONNECT) {
      issues.push(
        issue(
          'path_disconnected',
          `segment ${i} does not connect to the previous (gap ${gap.toFixed(1)})`,
        ),
      );
    }
  }

  const pts = pathPoints(segs);
  if (cue && dist(segs[0].from, cue) > PATH_CUE_NEAR) {
    issues.push(
      issue(
        'path_not_from_cue',
        `path should start at the cue ball (gap ${dist(segs[0].from, cue).toFixed(1)})`,
      ),
    );
  }

  if (primary) {
    const nearestOb = Math.min(...pts.map((p) => dist(p, primary)));
    if (nearestOb > PATH_OB_NEAR) {
      issues.push(
        issue(
          'path_misses_object',
          `path never approaches primary object ball #${primary.ballId} (min ${nearestOb.toFixed(1)})`,
        ),
      );
    }
  }

  const end = segs[segs.length - 1].to;
  if (pocket && dist(end, pocket) > PATH_POCKET_NEAR) {
    issues.push(
      issue(
        'path_misses_pocket',
        `path should end near pocket_target (gap ${dist(end, pocket).toFixed(1)})`,
      ),
    );
  }

  const bounceIdx: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const rail = classifyRail(pts[i], 2.2);
    if (!rail) continue;
    if (nearestPocket(pts[i]).dist < 5) continue;
    const incoming = sub(pts[i], pts[i - 1]);
    const outgoing = sub(pts[i + 1], pts[i]);
    if (Math.hypot(incoming.x, incoming.y) < 0.8 || Math.hypot(outgoing.x, outgoing.y) < 0.8) {
      continue;
    }
    const err = reflectionAngleErrorDeg(incoming, outgoing, rail);
    if (err > REFLECT_MAX_DEG) {
      issues.push(
        issue(
          'bad_reflection',
          `rail bounce ${rail} at (${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}) is ${err.toFixed(0)}° off a plausible reflection`,
        ),
      );
    } else {
      bounceIdx.push(i);
    }
  }

  let contactIdx = 0;
  if (primary && pts.length) {
    let best = Infinity;
    pts.forEach((p, i) => {
      const d = dist(p, primary);
      if (d < best) {
        best = d;
        contactIdx = i;
      }
    });
  }

  const needsBank = cat === 'bank';
  const needsKick = cat === 'kick';
  if (needsBank) {
    const after = bounceIdx.filter((i) => i >= contactIdx);
    if (!after.length) {
      issues.push(
        issue('bank_needs_rail', 'bank shots need a cushion bounce on the object-ball path'),
      );
    }
  }
  if (needsKick) {
    const before = bounceIdx.filter((i) => i <= contactIdx);
    if (!before.length) {
      issues.push(
        issue('kick_needs_rail', 'kick shots need a cushion bounce before the object ball'),
      );
    }
  }

  if (cat === 'combo') {
    const along = orderComboBalls(map, pts);
    if (along.length < 2) {
      issues.push(
        issue(
          'combo_needs_two_balls',
          'combo shots need the path to visit at least two object balls on the transfer line',
        ),
      );
    } else {
      for (let i = 0; i < along.length - 1; i++) {
        const a = along[i];
        const b = along[i + 1];
        const bIdx = nearestPathIndex(b, pts).idx;
        const nextPt =
          i + 2 < along.length ? along[i + 2] : pts[bIdx + 1] ?? pocket ?? pts[pts.length - 1];
        if (!nextPt) continue;
        const incoming = sub(b, a);
        const outgoing = sub(nextPt, b);
        if (Math.hypot(incoming.x, incoming.y) < 0.8 || Math.hypot(outgoing.x, outgoing.y) < 0.8) {
          continue;
        }
        const ang = unitAngleDeg(incoming, outgoing);
        if (ang > COMBO_ALIGN_MAX_DEG) {
          issues.push(
            issue(
              'combo_bad_transfer',
              `combo turn at ball #${b.ballId} is ${ang.toFixed(0)}° — object ball must drive the next ball along the line of centers (not skip past it)`,
            ),
          );
        }
        for (const other of map.object_ball_positions ?? []) {
          if (other.ballId === a.ballId && other.x === a.x && other.y === a.y) continue;
          if (other.ballId === b.ballId && other.x === b.x && other.y === b.y) continue;
          if (isPathContact(other, [a, b], 2.2)) continue;
          const d = pointToSegmentDistance(other, a, b);
          if (d < LANE_CLEARANCE) {
            issues.push(
              issue(
                'combo_blocked',
                `ball #${other.ballId} sits between combo balls #${a.ballId} and #${b.ballId}`,
              ),
            );
          }
        }
      }
    }
  }

  const segsForLane = segs;
  for (const ball of map.object_ball_positions ?? []) {
    if (isPathContact(ball, pts)) continue;
    let closest = Infinity;
    for (const s of segsForLane) {
      const d = pointToSegmentDistance(ball, s.from, s.to);
      if (d < closest) closest = d;
    }
    if (closest < LANE_CLEARANCE) {
      issues.push(
        issue(
          'blocked_lane',
          `ball #${ball.ballId} sits in the intended path corridor (${closest.toFixed(1)} units off the line)`,
        ),
      );
    }
  }

  return { ok: issues.length === 0, issues };
}

export function formatGeomReport(map: SotdGeomMap, report: SotdGeomReport): string {
  if (report.ok) return `${map.id}: ok`;
  return `${map.id}: ${report.issues.map((i) => i.message).join('; ')}`;
}
