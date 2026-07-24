import type { SotdObjectBall, SotdPathSegment, SotdPoint, SotdShotMap } from './types';

export type TableSize = '7ft' | '9ft';

/** Original drill tokens (NOT playing cards) — sequence markers on the cloth. */
export type DrillMarkerShape = 'disc' | 'triangle' | 'diamond' | 'hex' | 'chevron' | 'star';

export type DrillMarker = {
  n: number;
  x: number;
  y: number;
  shape: DrillMarkerShape;
  /** Short role for accessibility only — never shown as jargon on the cloth. */
  role: 'start' | 'rail' | 'contact' | 'bank' | 'pocket' | 'finish';
};

export type DerivedShotGeometry = {
  primaryObject: SotdObjectBall;
  contactPoint: SotdPoint;
  /** Cue ball approach to contact (and rail-first segments when present). */
  cueApproach: SotdPoint[];
  /** Object ball travel from rest to pocket (may include rail banks). */
  objectPath: SotdPoint[];
  /** Cue ball movement after contact (position play / stop / draw / follow). */
  cueAfter: SotdPoint[];
  ghostBall: SotdPoint | null;
  showGhost: boolean;
  showTangent: boolean;
  tangent: { from: SotdPoint; to: SotdPoint } | null;
  /** True when the cue hits a cushion before the object ball. */
  railFirst: boolean;
  cutAngleDeg: number;
  /** 3–6 original sequence markers for the drill pattern. */
  markers: DrillMarker[];
};

const MARKER_SHAPES: DrillMarkerShape[] = ['disc', 'triangle', 'diamond', 'hex', 'chevron', 'star'];

const TABLE = { xMax: 100, yMax: 50 };

function dist(a: SotdPoint, b: SotdPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function sub(a: SotdPoint, b: SotdPoint): SotdPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: SotdPoint, b: SotdPoint): SotdPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: SotdPoint, s: number): SotdPoint {
  return { x: v.x * s, y: v.y * s };
}

function norm(v: SotdPoint): SotdPoint {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function perp(v: SotdPoint): SotdPoint {
  return { x: -v.y, y: v.x };
}

function nearRail(p: SotdPoint, pad = 3): boolean {
  return p.x <= pad || p.x >= TABLE.xMax - pad || p.y <= pad || p.y >= TABLE.yMax - pad;
}

function pathToPoints(segs: SotdPathSegment[]): SotdPoint[] {
  if (!segs.length) return [];
  const pts: SotdPoint[] = [{ ...segs[0].from }];
  for (const s of segs) {
    const last = pts[pts.length - 1];
    if (dist(last, s.from) > 0.4) pts.push({ ...s.from });
    pts.push({ ...s.to });
  }
  return pts;
}

function pickPrimaryObject(map: SotdShotMap): SotdObjectBall {
  const objects = map.object_ball_positions.filter((b) => b.role !== 'blocker' && b.role !== 'prop');
  if (objects.length) return objects[0];
  if (map.object_ball_positions.length) return map.object_ball_positions[0];
  return { ballId: 1, x: 50, y: 25, role: 'object' };
}

/**
 * Split catalog `intended_path` into cue approach, object path, and post-contact cue.
 * Catalog paths are approximate instructor guides — geometry is derived for a clear diagram.
 */
export function deriveShotGeometry(map: SotdShotMap): DerivedShotGeometry {
  const primary = pickPrimaryObject(map);
  const segs = map.intended_path ?? [];
  const fullPts = pathToPoints(segs);
  const start = map.cue_ball_start;
  const pocket = map.pocket_target;

  // Index of path point closest to the primary object ball (= contact region).
  let contactIdx = 0;
  let best = Infinity;
  if (fullPts.length) {
    fullPts.forEach((p, i) => {
      const d = dist(p, primary);
      if (d < best) {
        best = d;
        contactIdx = i;
      }
    });
  }

  // Contact is near the object ball center (slightly toward the cue for visual clearance).
  const towardCue = fullPts[contactIdx]
    ? norm(sub(start, primary))
    : { x: -1, y: 0 };
  const contactPoint: SotdPoint = {
    x: primary.x + towardCue.x * 1.2,
    y: primary.y + towardCue.y * 1.2,
  };

  // Rail-first: a path vertex near a rail before we get close to the object ball.
  let railFirst = false;
  const approachPts: SotdPoint[] = [{ ...start }];
  if (fullPts.length) {
    for (let i = 0; i <= contactIdx; i++) {
      const p = fullPts[i];
      if (i < contactIdx && nearRail(p) && dist(p, primary) > 8) {
        railFirst = true;
        approachPts.push(p);
      }
    }
  }
  approachPts.push(contactPoint);
  // Dedupe near-duplicates
  const cueApproach = dedupePoints(approachPts);

  // Object path: remaining path after contact, else straight to pocket.
  // Prefer catalog segments after contact when they leave the object and head toward pocket/rails.
  const afterPts = fullPts.slice(contactIdx + 1);
  let objectPath: SotdPoint[];
  if (afterPts.length >= 1) {
    objectPath = dedupePoints([{ ...primary }, ...afterPts, pocket]);
    // If the "after" path barely moves, fall back to primary → pocket
    if (dist(objectPath[0], objectPath[objectPath.length - 1]) < 4) {
      objectPath = [primary, pocket];
    }
  } else {
    objectPath = [primary, pocket];
  }

  // CB after contact: landing zone or spin-based estimate
  const restZone = map.landing_zones?.find((z) => /cb|rest|cue/i.test(z.label));
  const cueAfter = estimateCueAfter(map, contactPoint, primary, pocket, restZone);

  // Ghost ball: on the line opposite the pocket from the object ball (aiming reference).
  const toPocket = norm(sub(pocket, primary));
  // Ball diameter in table units (~ ball radius ~2.2 on 9ft normalized map)
  const diameter = 4.4;
  const ghostBall: SotdPoint = {
    x: primary.x - toPocket.x * diameter,
    y: primary.y - toPocket.y * diameter,
  };

  const toObFromCue = sub(primary, start);
  const cut = cutAngleDeg(toObFromCue, sub(pocket, primary));
  const showGhost = cut > 12 && cut < 78 && !railFirst;
  const tip = (map.tip_zone || map.english?.tip_zone || 'center').toLowerCase();
  const stunish = tip.includes('center') || tip === 'stun';
  const showTangent = showGhost && stunish && cut > 18;

  let tangent: DerivedShotGeometry['tangent'] = null;
  if (showTangent) {
    const lineDir = norm(sub(primary, start));
    const t = perp(lineDir);
    const len = 10;
    tangent = {
      from: add(contactPoint, scale(t, -len)),
      to: add(contactPoint, scale(t, len)),
    };
  }

  // Category hint for rail-first kicks/banks when path didn't catch it
  const cat = (map.category || '').toLowerCase();
  if ((cat === 'kick' || /rail.?first/i.test(map.name)) && nearRail(fullPts[1] ?? start)) {
    railFirst = true;
  }

  const markers = buildDrillMarkers({
    start,
    cueApproach,
    contactPoint,
    primary,
    objectPath,
    pocket,
    cueAfter,
    railFirst,
  });

  return {
    primaryObject: primary,
    contactPoint,
    cueApproach,
    objectPath,
    cueAfter,
    ghostBall: showGhost ? ghostBall : null,
    showGhost,
    showTangent,
    tangent,
    railFirst,
    cutAngleDeg: cut,
    markers,
  };
}

/**
 * Place 3–6 original drill tokens along the shot pattern.
 * Inspired by the *idea* of table markers for practice games — fully original shapes,
 * never playing-card faces or suits.
 */
function buildDrillMarkers(input: {
  start: SotdPoint;
  cueApproach: SotdPoint[];
  contactPoint: SotdPoint;
  primary: SotdObjectBall;
  objectPath: SotdPoint[];
  pocket: SotdPoint;
  cueAfter: SotdPoint[];
  railFirst: boolean;
}): DrillMarker[] {
  const raw: Array<Omit<DrillMarker, 'n' | 'shape'>> = [];

  // 1) Start — nudge off the cue ball so the white ball stays visible
  raw.push({
    x: clamp(input.start.x - 5.5, 6, 94),
    y: clamp(input.start.y + 4.5, 5, 45),
    role: 'start',
  });

  // 2) Rail-first touch on approach (if any)
  if (input.railFirst) {
    const railPt = input.cueApproach.find((p, i) => i > 0 && i < input.cueApproach.length - 1 && nearRail(p, 4));
    if (railPt) {
      raw.push({
        x: clamp(railPt.x + (railPt.x < 50 ? 3 : -3), 6, 94),
        y: clamp(railPt.y + (railPt.y < 25 ? 3 : -3), 5, 45),
        role: 'rail',
      });
    }
  }

  // 3) Contact zone near object ball
  raw.push({
    x: clamp(input.contactPoint.x - 3.5, 6, 94),
    y: clamp(input.contactPoint.y + 5, 5, 45),
    role: 'contact',
  });

  // 4) Bank / cushion on object path (if object path kisses a rail before the pocket)
  const bankPt = input.objectPath.find(
    (p, i) => i > 0 && i < input.objectPath.length - 1 && nearRail(p, 4),
  );
  if (bankPt) {
    raw.push({
      x: clamp(bankPt.x + (bankPt.x < 50 ? 3.5 : -3.5), 6, 94),
      y: clamp(bankPt.y + (bankPt.y < 25 ? 3.5 : -3.5), 5, 45),
      role: 'bank',
    });
  }

  // 5) Pocket
  raw.push({
    x: clamp(input.pocket.x + (input.pocket.x > 50 ? -5 : 5), 6, 94),
    y: clamp(input.pocket.y + (input.pocket.y > 25 ? -5 : 5), 5, 45),
    role: 'pocket',
  });

  // 6) Cue finish (only if it moved meaningfully)
  const finish = input.cueAfter[input.cueAfter.length - 1];
  if (finish && dist(finish, input.contactPoint) > 4) {
    raw.push({
      x: clamp(finish.x + 3, 6, 94),
      y: clamp(finish.y - 3.5, 5, 45),
      role: 'finish',
    });
  }

  // Dedupe near-overlapping tokens, keep 3–6
  const spaced: typeof raw = [];
  for (const m of raw) {
    if (spaced.every((s) => dist(s, m) > 6)) spaced.push(m);
  }
  while (spaced.length > 6) spaced.splice(spaced.length - 2, 1); // drop near-end extras first
  // Ensure at least start, contact, pocket
  if (spaced.length < 3) {
    return [
      { n: 1, shape: 'disc', x: input.start.x - 5, y: input.start.y + 4, role: 'start' },
      { n: 2, shape: 'triangle', x: input.primary.x - 3, y: input.primary.y + 5, role: 'contact' },
      { n: 3, shape: 'diamond', x: input.pocket.x - 4, y: input.pocket.y - 4, role: 'pocket' },
    ];
  }

  return spaced.slice(0, 6).map((m, i) => ({
    ...m,
    n: i + 1,
    shape: MARKER_SHAPES[i % MARKER_SHAPES.length],
  }));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function dedupePoints(pts: SotdPoint[], eps = 0.8): SotdPoint[] {
  const out: SotdPoint[] = [];
  for (const p of pts) {
    if (!out.length || dist(out[out.length - 1], p) > eps) out.push(p);
  }
  return out;
}

function cutAngleDeg(cueToOb: SotdPoint, obToPocket: SotdPoint): number {
  const a = norm(cueToOb);
  const b = norm(obToPocket);
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y));
  return (Math.acos(dot) * 180) / Math.PI;
}

function estimateCueAfter(
  map: SotdShotMap,
  contact: SotdPoint,
  primary: SotdObjectBall,
  pocket: SotdPoint,
  restZone?: SotdPoint & { label: string },
): SotdPoint[] {
  const tip = (map.tip_zone || map.english?.tip_zone || 'center').toLowerCase();
  const line = norm(sub(primary, map.cue_ball_start));
  const cutDir = norm(sub(pocket, primary));

  // Natural tangent for stun on a cut
  const tangentDir = perp(line);
  // Pick tangent side that opens away from pocket slightly
  const side =
    tangentDir.x * cutDir.x + tangentDir.y * cutDir.y > 0
      ? scale(tangentDir, -1)
      : tangentDir;

  if (restZone && dist(restZone, contact) > 1.5) {
    // Landing zones in catalog are sometimes poorly scaled — blend with spin model.
    const model = spinModelEnd(tip, contact, line, side);
    // Prefer model direction with rest zone magnitude when rest looks plausible
    if (restZone.x > 2 && restZone.x < 98 && restZone.y > 1 && restZone.y < 49) {
      // Some catalog cb_rest values look like small offsets — treat as relative if tiny
      if (restZone.x < 15 && restZone.y < 10) {
        return [contact, model];
      }
      return [contact, { x: restZone.x, y: restZone.y }];
    }
    return [contact, model];
  }

  return [contact, spinModelEnd(tip, contact, line, side)];
}

function spinModelEnd(
  tip: string,
  contact: SotdPoint,
  line: SotdPoint,
  tangent: SotdPoint,
): SotdPoint {
  let end: SotdPoint;
  if (tip.includes('6') || tip.includes('low') || tip.includes('draw') || tip.includes('7:30') || tip.includes('4:30')) {
    // Draw: reverse along approach
    end = add(contact, scale(line, -14));
  } else if (tip.includes('12') || tip.includes('high') || tip.includes('follow') || tip.includes('1:30') || tip.includes('10:30')) {
    end = add(contact, scale(line, 16));
  } else if (tip.includes('3') || tip.includes('right')) {
    end = add(contact, add(scale(line, 6), scale(tangent, 8)));
  } else if (tip.includes('9') || tip.includes('left')) {
    end = add(contact, add(scale(line, 6), scale(tangent, -8)));
  } else {
    // Stun / center: short tangent drift
    end = add(contact, scale(tangent, 5));
  }

  return {
    x: Math.max(4, Math.min(96, end.x)),
    y: Math.max(3, Math.min(47, end.y)),
  };
}

/** Human labels for tip zones — no clock jargon dump. */
export function tipZonePlain(tipZone: string): string {
  const t = tipZone.toLowerCase();
  if (t === 'center') return 'Dead center of the cue ball';
  if (t === '12-high') return 'A half-tip above center (follow)';
  if (t === '6-low') return 'A half-tip below center (draw)';
  if (t === '3-right') return 'A half-tip to the right (right english)';
  if (t === '9-left') return 'A half-tip to the left (left english)';
  if (t.includes('1:30') || t.includes('high-right')) return 'High and a little right';
  if (t.includes('10:30') || t.includes('high-left')) return 'High and a little left';
  if (t.includes('4:30') || t.includes('low-right')) return 'Low and a little right';
  if (t.includes('7:30') || t.includes('low-left')) return 'Low and a little left';
  return tipZone;
}

export function speedPlain(speed: string, detail?: string): string {
  const s = speed.toLowerCase();
  const base: Record<string, string> = {
    feather: 'Feather — barely more than a touch',
    soft: 'Soft — smooth and quiet',
    medium: 'Medium — firm enough to hold the line',
    firm: 'Firm — committed stroke, not a slam',
    power: 'Power — full stroke, stay smooth',
  };
  const head = base[s] ?? speed;
  return detail ? `${head}. ${detail}` : head;
}

export function cueAfterPlain(tipZone: string, category: string): string {
  const t = tipZone.toLowerCase();
  if (t === 'center' || t.includes('stun')) {
    if (category === 'position') return 'The cue ball should barely move or drift a short way on the tangent.';
    return 'With center ball, the cue ball takes a short natural path after contact — don’t force it.';
  }
  if (t.includes('6') || t.includes('low') || t.includes('draw')) {
    return 'After contact the cue ball should come back toward you (draw). Stay down and let the spin work.';
  }
  if (t.includes('12') || t.includes('high') || t.includes('follow')) {
    return 'After contact the cue ball should roll forward through the object ball’s path (follow).';
  }
  if (t.includes('3') || t.includes('right') || t.includes('9') || t.includes('left')) {
    return 'Sidespin will bend the cue ball’s path after the hit and off any rails — trust the english you planned.';
  }
  return 'Watch where the cue ball finishes — that tells you if speed and tip were honest.';
}
