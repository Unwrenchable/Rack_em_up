import type { SotdObjectBall, SotdPathSegment, SotdPoint, SotdShotMap } from './types';
import { buildTableGeometry, clothZoneLabel } from './table-geometry';

export type { TableSize } from './table-geometry';

/** Optional original training markers (NOT playing cards, NOT gold “card” tokens). */
export type DrillMarkerShape = 'triangle' | 'star' | 'disc' | 'diamond';

export type DrillMarker = {
  n: number;
  x: number;
  y: number;
  shape: DrillMarkerShape;
  role: 'start' | 'rail' | 'contact' | 'bank' | 'pocket' | 'finish';
};

export type ComboLeg = {
  ballId: number;
  pts: SotdPoint[];
};

export type DerivedShotGeometry = {
  primaryObject: SotdObjectBall;
  /** Ball that actually travels to the pocket (last combo ball, else primary). */
  pocketObject: SotdObjectBall;
  contactPoint: SotdPoint;
  /** Ground-only cue run (CB → takeoff). Never chords through a jump hop. */
  cueApproach: SotdPoint[];
  /** Dashed airborne hop (takeoff → through blocker → landing). Empty when the path stays on cloth. */
  cueAirborne: SotdPoint[];
  /** Cloth run after the hop (landing → ghost). Empty when there is no airborne split. */
  cueApproachAfter: SotdPoint[];
  /**
   * Quadratic control for a cloth curve (massé / curve-around-blocker).
   * When set, draw CB approach as a smooth Q curve, not a kink polyline.
   */
  cueCurveControl: SotdPoint | null;
  /**
   * Combo hops only: each object ball drives the next (arrow stops at the next ball).
   * Empty for single-object shots.
   */
  comboLegs: ComboLeg[];
  /** Always: pocketing ball → pocket (cut angle + target). */
  objectPath: SotdPoint[];
  /** Always: CB after impact. */
  cueAfter: SotdPoint[];
  ghostBall: SotdPoint | null;
  /** Cloth-unit radius from RealAI; undefined → draw with SVG ballR. */
  ghostRadius?: number;
  showGhost: boolean;
  showTangent: boolean;
  tangent: { from: SotdPoint; to: SotdPoint } | null;
  railFirst: boolean;
  cutAngleDeg: number;
  /**
   * Optional sequence markers for multi-step patterns only.
   * Simple single-object shots return []. Prefer paths over tokens.
   */
  markers: DrillMarker[];
  /** Plain-language CB finish zone for coaching. */
  cueFinishZone: string;
};

const TABLE = { xMax: 100, yMax: 50 };

/** Ghost-ball offset diameter: ghost = OB − normalize(aim − OB) × 4.4 */
export const GHOST_BALL_DIAMETER = 4.4;

function dist(a: SotdPoint, b: SotdPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

export function segmentIsAirborne(seg: SotdPathSegment): boolean {
  return seg.kind === 'airborne' || seg.style === 'dashed';
}

function segmentIsObject(seg: SotdPathSegment): boolean {
  return seg.kind === 'object';
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

function polylineFromSegs(segs: SotdPathSegment[]): SotdPoint[] {
  if (!segs.length) return [];
  const pts: SotdPoint[] = [{ ...segs[0].from }];
  for (const s of segs) {
    const last = pts[pts.length - 1];
    if (dist(last, s.from) > 0.4) pts.push({ ...s.from });
    pts.push({ ...s.to });
  }
  return pts;
}

function pointToSegmentDistance(p: SotdPoint, a: SotdPoint, b: SotdPoint): number {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  if (len2 < 1e-8) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2));
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

/** Older jump maps without style/kind: treat a cloth segment over a blocker as airborne. */
function annotateJumpAirborne(segs: SotdPathSegment[], map: SotdShotMap): SotdPathSegment[] {
  if ((map.category || '').toLowerCase() !== 'jump') return segs;
  if (segs.some(segmentIsAirborne)) return segs;
  const blockers = (map.object_ball_positions ?? []).filter((b) => b.role === 'blocker');
  if (!blockers.length) return segs;
  return segs.map((s) => {
    if (blockers.some((b) => pointToSegmentDistance(b, s.from, s.to) < 3.6)) {
      return { ...s, style: 'dashed', kind: 'airborne' };
    }
    return s;
  });
}

function firstGroundRun(segs: SotdPathSegment[]): SotdPoint[] {
  const run: SotdPathSegment[] = [];
  for (const s of segs) {
    if (segmentIsAirborne(s) || segmentIsObject(s) || s.kind === 'cue_after') break;
    run.push(s);
  }
  return polylineFromSegs(run);
}

function airbornePolyline(segs: SotdPathSegment[]): SotdPoint[] {
  const air: SotdPathSegment[] = [];
  let seen = false;
  for (const s of segs) {
    if (segmentIsAirborne(s)) {
      air.push(s);
      seen = true;
    } else if (seen) {
      break;
    }
  }
  return polylineFromSegs(air);
}

function groundAfterAirborne(segs: SotdPathSegment[]): SotdPoint[] {
  const firstAir = segs.findIndex(segmentIsAirborne);
  if (firstAir < 0) return [];
  let i = firstAir;
  while (i < segs.length && segmentIsAirborne(segs[i])) i++;
  const rest: SotdPathSegment[] = [];
  for (; i < segs.length; i++) {
    if (segmentIsObject(segs[i]) || segs[i].kind === 'cue_after' || segmentIsAirborne(segs[i])) break;
    rest.push(segs[i]);
  }
  return polylineFromSegs(rest);
}

function pickPrimaryObject(map: SotdShotMap): SotdObjectBall {
  const balls = map.object_ball_positions ?? [];
  const objects = balls.filter((b) => !b.role || b.role === 'object');
  if (objects.length) return objects[0];
  if (balls.length) return balls[0];
  return { ballId: 1, x: 50, y: 25, role: 'object' };
}

function nearestPathIndex(p: SotdPoint, pts: SotdPoint[]): { idx: number; d: number } {
  let idx = 0;
  let best = Infinity;
  pts.forEach((pt, i) => {
    const d = dist(p, pt);
    if (d < best) {
      best = d;
      idx = i;
    }
  });
  return { idx, d: best };
}

/** Object/helper balls the path actually visits, in travel order. */
export function orderComboBalls(map: SotdShotMap, pts: SotdPoint[], pad = 3.4): SotdObjectBall[] {
  const objects = (map.object_ball_positions ?? []).filter(
    (b) => !b.role || b.role === 'object' || b.role === 'helper',
  );
  return objects
    .map((b) => ({ b, ...nearestPathIndex(b, pts) }))
    .filter((x) => x.d <= pad)
    .sort((a, c) => a.idx - c.idx)
    .map((x) => x.b);
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

/** Spec: ghost = OB − normalize(aim − OB) × 4.4 */
export function ghostBallFromAim(
  ob: SotdPoint,
  aim: SotdPoint,
  diameter = GHOST_BALL_DIAMETER,
): SotdPoint {
  const toAim = norm(sub(aim, ob));
  return { x: ob.x - toAim.x * diameter, y: ob.y - toAim.y * diameter };
}

function midpoint(a: SotdPoint, b: SotdPoint): SotdPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function sampleQuadratic(
  a: SotdPoint,
  ctrl: SotdPoint,
  b: SotdPoint,
  n = 24,
): SotdPoint[] {
  const out: SotdPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
    });
  }
  return out;
}

/**
 * Drop off-axis jump apexes. Dashed hop is a straight (or through-ball) line
 * over the blocker XY — not a tent that reads as a cloth direction change.
 */
export function flattenJumpAirborne(
  air: SotdPoint[],
  blocker: SotdPoint | undefined,
): SotdPoint[] {
  if (air.length < 2) return air;
  const a = air[0];
  const b = air[air.length - 1];
  if (!blocker) return dist(a, b) < 0.4 ? air : [a, b];
  const over = { x: blocker.x, y: blocker.y };
  const pts = [a];
  if (dist(a, over) > 0.4) pts.push(over);
  if (dist(b, over) > 0.4 && dist(b, a) > 0.4) pts.push(b);
  return pts.length >= 2 ? pts : [a, b];
}

/**
 * Quadratic control that bulges around a blocker (or the old tent via)
 * so the cloth path reads as a smooth massé, not angled polyline kinks.
 */
export function clothCurveControl(
  start: SotdPoint,
  end: SotdPoint,
  vias: SotdPoint[],
  blocker?: SotdPoint,
): SotdPoint {
  const chord = sub(end, start);
  const n = norm(perp(chord));
  const mid = midpoint(start, end);
  let side = 1;
  const probe = vias.find((v) => dist(v, start) > 2 && dist(v, end) > 2) ?? blocker;
  if (probe) {
    const s = (probe.x - mid.x) * n.x + (probe.y - mid.y) * n.y;
    if (s < 0) side = -1;
  }
  // Quadratic midpoint sits halfway from mid to ctrl; double the desired bulge.
  let bulge = 10;
  if (blocker) {
    const clearance = pointToSegmentDistance(blocker, start, end);
    bulge = Math.max(9, GHOST_BALL_DIAMETER + 4.5 - Math.min(clearance, 4));
  } else if (vias.length) {
    const farthest = vias.reduce((best, v) => {
      const d = pointToSegmentDistance(v, start, end);
      return d > best.d ? { d, v } : best;
    }, { d: 0, v: vias[0] });
    bulge = Math.min(16, Math.max(8, farthest.d * 0.85));
  }
  return add(mid, scale(n, 2 * bulge * side));
}

/**
 * Derive the three required paths + coaching helpers from a catalog map.
 * Ghost is automatic (`OB − normalize(aim − OB)×4.4`); map pins are rare.
 */
export function deriveShotGeometry(map: SotdShotMap): DerivedShotGeometry {
  const primary = pickPrimaryObject(map);
  const segs = annotateJumpAirborne(map.intended_path ?? [], map);
  const fullPts = pathToPoints(segs);
  const start = map.cue_ball_start;
  const pocket = map.pocket_target;
  const cat = (map.category || '').toLowerCase();
  const blocker = (map.object_ball_positions ?? []).find((b) => b.role === 'blocker');

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

  const comboBalls = orderComboBalls(map, fullPts);
  const isCombo = cat === 'combo' && comboBalls.length >= 2;
  const isCarom = cat === 'carom' && comboBalls.length >= 2;
  const pocketObject = isCombo || isCarom ? comboBalls[comboBalls.length - 1] : primary;
  const comboLegs: ComboLeg[] = [];
  if (isCombo) {
    for (let i = 0; i < comboBalls.length - 1; i++) {
      comboLegs.push({
        ballId: comboBalls[i].ballId,
        pts: [
          { x: comboBalls[i].x, y: comboBalls[i].y },
          { x: comboBalls[i + 1].x, y: comboBalls[i + 1].y },
        ],
      });
    }
  }

  const aimTarget = isCombo && comboBalls[1] ? comboBalls[1] : pocket;
  // Automatic ghost: never the jump hop apex. Rare map pin only when derive would be wrong.
  let ghostBall: SotdPoint = ghostBallFromAim(primary, aimTarget, GHOST_BALL_DIAMETER);
  let ghostRadius: number | undefined;
  const gb = map.ghost_ball;
  if (gb && Number.isFinite(gb.x) && Number.isFinite(gb.y)) {
    ghostBall = { x: gb.x, y: gb.y };
    if (typeof gb.radius === 'number' && Number.isFinite(gb.radius) && gb.radius > 0) {
      ghostRadius = gb.radius;
    }
  }

  // Contact = midpoint of ghost CB and OB (line of centers). Rare pin may replace.
  let contactPoint: SotdPoint = midpoint(ghostBall, primary);
  if (
    map.contact_point &&
    Number.isFinite(map.contact_point.x) &&
    Number.isFinite(map.contact_point.y)
  ) {
    contactPoint = { x: map.contact_point.x, y: map.contact_point.y };
  }

  let railFirst = false;
  for (let i = 0; i < contactIdx; i++) {
    const p = fullPts[i];
    if (!p) continue;
    if (nearRail(p) && dist(p, primary) > 8 && dist(p, start) > 2) railFirst = true;
  }
  if ((cat === 'kick' || /rail.?first/i.test(map.name)) && nearRail(fullPts[1] ?? start)) {
    railFirst = true;
  }

  const hasAir = segs.some(segmentIsAirborne);
  const interiorVias = fullPts.filter((p, i) => {
    if (i === 0 || i >= contactIdx) return false;
    if (dist(p, start) <= 2 || dist(p, primary) <= 4) return false;
    return !nearRail(p, 2.4);
  });
  const isClothCurve =
    (cat === 'masse' || cat === 'curve') && !railFirst && !hasAir && (!!blocker || interiorVias.length > 0);

  let cueApproach: SotdPoint[];
  let cueAirborne: SotdPoint[] = [];
  let cueApproachAfter: SotdPoint[] = [];
  let cueCurveControl: SotdPoint | null = null;

  if (hasAir) {
    cueApproach = dedupePoints(firstGroundRun(segs));
    cueAirborne = flattenJumpAirborne(airbornePolyline(segs), blocker);
    const afterLand = dedupePoints(groundAfterAirborne(segs));
    const land = cueAirborne[cueAirborne.length - 1] ?? afterLand[0] ?? start;
    cueApproachAfter = dedupePoints([land, ghostBall]);
    if (cueApproach.length < 2) {
      cueApproach = dedupePoints([{ ...start }, cueAirborne[0] ?? contactPoint]);
    }
  } else if (isClothCurve) {
    cueCurveControl = clothCurveControl(start, ghostBall, interiorVias, blocker);
    cueApproach = sampleQuadratic(start, cueCurveControl, ghostBall, 24);
  } else {
    const approachPts: SotdPoint[] = [{ ...start }];
    if (fullPts.length) {
      for (let i = 0; i < contactIdx; i++) {
        const p = fullPts[i];
        if (dist(p, primary) <= 4 || dist(p, start) <= 2) continue;
        approachPts.push(p);
      }
    }
    approachPts.push(ghostBall);
    cueApproach = dedupePoints(approachPts);
    if (cueApproach.length < 2) cueApproach.push(ghostBall);
  }

  const pocketContact = nearestPathIndex(pocketObject, fullPts);
  const afterPts = fullPts.slice((isCombo || isCarom ? pocketContact.idx : contactIdx) + 1);
  const afterRails = afterPts.filter((p) => nearRail(p, 2.4) && dist(p, pocket) > 6);
  let objectPath: SotdPoint[];
  if (afterRails.length && (cat === 'bank' || afterRails.length > 0) && cat !== 'jump' && cat !== 'masse') {
    objectPath = dedupePoints([{ x: pocketObject.x, y: pocketObject.y }, ...afterPts, { ...pocket }]);
    if (dist(objectPath[0], objectPath[objectPath.length - 1]) < 4) {
      objectPath = [
        { x: pocketObject.x, y: pocketObject.y },
        { ...pocket },
      ];
    }
  } else {
    objectPath = [
      { x: pocketObject.x, y: pocketObject.y },
      { ...pocket },
    ];
  }

  const restZone = map.landing_zones?.find((z) => /cb|rest|cue/i.test(z.label));
  let cueAfter: SotdPoint[];
  if (isCarom) {
    const caromTarget = comboBalls[comboBalls.length - 1];
    const via = [contactPoint, { x: caromTarget.x, y: caromTarget.y }];
    if (restZone && dist(restZone, caromTarget) > 2.5) via.push({ x: restZone.x, y: restZone.y });
    cueAfter = dedupePoints(via);
  } else {
    cueAfter = estimateCueAfter(map, contactPoint, primary, pocket, restZone);
  }
  if (cueAfter.length < 2) {
    cueAfter.push(add(contactPoint, { x: 2, y: 0 }));
  }

  const inbound = isClothCurve && cueCurveControl
    ? sub(ghostBall, cueCurveControl)
    : hasAir && cueAirborne.length
      ? sub(ghostBall, cueAirborne[cueAirborne.length - 1])
      : sub(primary, start);
  const cut = cutAngleDeg(inbound, sub(aimTarget, primary));
  let showGhost = !isCombo && !isCarom && cut > 12 && cut < 78 && !railFirst;
  if (gb?.show === false) showGhost = false;
  else if (gb?.show === true) showGhost = true;

  const tip = (map.tip_zone || map.english?.tip_zone || 'center').toLowerCase();
  const stunish = tip.includes('center') || tip === 'stun';
  const showTangent = showGhost && stunish && cut > 18;

  let tangent: DerivedShotGeometry['tangent'] = null;
  if (showTangent) {
    const lineDir = norm(inbound);
    const t = perp(lineDir);
    const len = 10;
    tangent = {
      from: add(contactPoint, scale(t, -len)),
      to: add(contactPoint, scale(t, len)),
    };
  }

  const multi =
    map.object_ball_positions.filter((b) => b.role !== 'blocker').length > 1 ||
    railFirst ||
    objectPath.length > 2 ||
    cat === 'combo' ||
    cat === 'kick' ||
    cat === 'bank' ||
    cat === 'carom';
  const markers = multi
    ? buildTrainingMarkers({
        start,
        cueApproach,
        contactPoint,
        primary,
        objectPath,
        pocket,
        cueAfter,
        railFirst,
      })
    : [];

  const finish = cueAfter[cueAfter.length - 1];
  const cueFinishZone = clothZoneLabel(finish, buildTableGeometry('9ft'));

  return {
    primaryObject: primary,
    pocketObject,
    contactPoint,
    cueApproach,
    cueAirborne,
    cueApproachAfter,
    cueCurveControl,
    comboLegs,
    objectPath,
    cueAfter,
    ghostBall: showGhost ? ghostBall : null,
    ghostRadius,
    showGhost,
    showTangent,
    tangent,
    railFirst,
    cutAngleDeg: cut,
    markers,
    cueFinishZone,
  };
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
  const tangentDir = perp(line);
  const side =
    tangentDir.x * cutDir.x + tangentDir.y * cutDir.y > 0 ? scale(tangentDir, -1) : tangentDir;

  if (restZone && dist(restZone, contact) > 1.5) {
    const model = spinModelEnd(tip, contact, line, side);
    if (restZone.x > 2 && restZone.x < 98 && restZone.y > 1 && restZone.y < 49) {
      if (restZone.x < 15 && restZone.y < 10) return [contact, model];
      return [contact, { x: restZone.x, y: restZone.y }];
    }
    return [contact, model];
  }
  return [contact, spinModelEnd(tip, contact, line, side)];
}

function spinModelEnd(tip: string, contact: SotdPoint, line: SotdPoint, tangent: SotdPoint): SotdPoint {
  let end: SotdPoint;
  if (tip.includes('6') || tip.includes('low') || tip.includes('draw') || tip.includes('7:30') || tip.includes('4:30')) {
    end = add(contact, scale(line, -14));
  } else if (
    tip.includes('12') ||
    tip.includes('high') ||
    tip.includes('follow') ||
    tip.includes('1:30') ||
    tip.includes('10:30')
  ) {
    end = add(contact, scale(line, 16));
  } else if (tip.includes('3') || tip.includes('right')) {
    end = add(contact, add(scale(line, 6), scale(tangent, 8)));
  } else if (tip.includes('9') || tip.includes('left')) {
    end = add(contact, add(scale(line, 6), scale(tangent, -8)));
  } else {
    end = add(contact, scale(tangent, 5));
  }
  return {
    x: Math.max(4, Math.min(96, end.x)),
    y: Math.max(3, Math.min(47, end.y)),
  };
}

/** Subtle original training markers — stars/triangles/discs, never cards or gold chips. */
function buildTrainingMarkers(input: {
  start: SotdPoint;
  cueApproach: SotdPoint[];
  contactPoint: SotdPoint;
  primary: SotdObjectBall;
  objectPath: SotdPoint[];
  pocket: SotdPoint;
  cueAfter: SotdPoint[];
  railFirst: boolean;
}): DrillMarker[] {
  const shapes: DrillMarkerShape[] = ['triangle', 'star', 'disc', 'diamond', 'triangle', 'star'];
  const raw: Array<Omit<DrillMarker, 'n' | 'shape'>> = [];

  raw.push({
    x: clamp(input.start.x - 5, 6, 94),
    y: clamp(input.start.y + 4, 5, 45),
    role: 'start',
  });

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

  raw.push({
    x: clamp(input.contactPoint.x - 3.5, 6, 94),
    y: clamp(input.contactPoint.y + 5, 5, 45),
    role: 'contact',
  });

  const bankPt = input.objectPath.find((p, i) => i > 0 && i < input.objectPath.length - 1 && nearRail(p, 4));
  if (bankPt) {
    raw.push({
      x: clamp(bankPt.x + (bankPt.x < 50 ? 3.5 : -3.5), 6, 94),
      y: clamp(bankPt.y + (bankPt.y < 25 ? 3.5 : -3.5), 5, 45),
      role: 'bank',
    });
  }

  raw.push({
    x: clamp(input.pocket.x + (input.pocket.x > 50 ? -5 : 5), 6, 94),
    y: clamp(input.pocket.y + (input.pocket.y > 25 ? -5 : 5), 5, 45),
    role: 'pocket',
  });

  const spaced: typeof raw = [];
  for (const m of raw) {
    if (spaced.every((s) => dist(s, m) > 6)) spaced.push(m);
  }
  const list = spaced.slice(0, 6);
  if (list.length < 3) return [];
  return list.map((m, i) => ({ ...m, n: i + 1, shape: shapes[i % shapes.length] }));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// —— Plain-language coaching helpers (no coordinates) ——

export function tipZonePlain(tipZone: string): string {
  const t = tipZone.toLowerCase();
  if (t === 'center') return 'Dead center of the cue ball (stun)';
  if (t === '12-high') return 'Half-tip above center (follow)';
  if (t === '6-low') return 'Half-tip below center (draw)';
  if (t === '3-right') return 'Half-tip right (right english)';
  if (t === '9-left') return 'Half-tip left (left english)';
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

export function cueAfterPlain(tipZone: string, category: string, zone?: string): string {
  const t = tipZone.toLowerCase();
  let motion: string;
  if (t === 'center' || t.includes('stun')) {
    motion =
      category === 'position'
        ? 'The cue ball should barely move or drift a short way on the natural tangent.'
        : 'With center ball, the cue ball takes a short natural path after contact.';
  } else if (t.includes('6') || t.includes('low') || t.includes('draw')) {
    motion = 'After contact the cue ball comes back toward you (draw). Stay down and let the spin work.';
  } else if (t.includes('12') || t.includes('high') || t.includes('follow')) {
    motion = 'After contact the cue ball rolls forward through the line (follow).';
  } else if (t.includes('3') || t.includes('right') || t.includes('9') || t.includes('left')) {
    motion = 'Sidespin bends the cue ball after the hit and off any rails — trust the english you planned.';
  } else {
    motion = 'Watch where the cue ball finishes — that tells you if speed and tip were honest.';
  }
  if (zone) return `${motion} Finish zone: ${zone}.`;
  return motion;
}

/** One-line drill label for the card header. */
export function drillLabel(shot: {
  name: string;
  category: string;
  tipZone: string;
  pocket: string;
  difficulty: string;
}): string {
  const cat = shot.category.toLowerCase();
  const tip = shot.tipZone.toLowerCase();
  let skill = 'position';
  if (cat === 'bank') skill = 'bank';
  else if (cat === 'kick') skill = 'kick';
  else if (cat === 'combo') skill = 'combo';
  else if (cat === 'jump') skill = 'jump';
  else if (cat === 'masse' || cat === 'curve') skill = 'curve';
  else if (tip.includes('6') || tip.includes('low')) skill = 'draw';
  else if (tip.includes('12') || tip.includes('high')) skill = 'follow';
  else if (tip === 'center') skill = 'stun';

  const pocket = shot.pocket?.replace(/\.$/, '') || 'the pocket';
  return `${capitalize(skill)} to ${pocket} — ${skill} drill`;
}

/** 2–3 purpose lines for the drill. */
export function drillPurpose(shot: {
  tagline: string;
  tips: string[];
  category: string;
  successLooksLike: string;
}): string[] {
  const lines: string[] = [];
  if (shot.tagline) lines.push(shot.tagline);
  if (shot.tips?.[0]) lines.push(shot.tips[0]);
  if (lines.length < 2 && shot.successLooksLike) {
    lines.push(`You’re practicing until: ${shot.successLooksLike}`);
  }
  if (lines.length < 2) {
    lines.push('Train a clean line and honest speed so the cue ball behaves the way you planned.');
  }
  return lines.slice(0, 3);
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
