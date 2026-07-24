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

export type DerivedShotGeometry = {
  primaryObject: SotdObjectBall;
  contactPoint: SotdPoint;
  /** Always: CB → OB (and rail-first segments when present). */
  cueApproach: SotdPoint[];
  /** Always: OB → pocket (cut angle + target). */
  objectPath: SotdPoint[];
  /** Always: CB after impact. */
  cueAfter: SotdPoint[];
  ghostBall: SotdPoint | null;
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

/**
 * Derive the three required paths + coaching helpers from a catalog map.
 */
export function deriveShotGeometry(map: SotdShotMap): DerivedShotGeometry {
  const primary = pickPrimaryObject(map);
  const segs = map.intended_path ?? [];
  const fullPts = pathToPoints(segs);
  const start = map.cue_ball_start;
  const pocket = map.pocket_target;

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

  const towardCue = fullPts[contactIdx] ? norm(sub(start, primary)) : { x: -1, y: 0 };
  const contactPoint: SotdPoint = {
    x: primary.x + towardCue.x * 1.2,
    y: primary.y + towardCue.y * 1.2,
  };

  // CB → OB (always at least start → contact)
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
  const cueApproach = dedupePoints(approachPts);
  if (cueApproach.length < 2) {
    cueApproach.push(contactPoint);
  }

  // OB → pocket (always)
  const afterPts = fullPts.slice(contactIdx + 1);
  let objectPath: SotdPoint[];
  if (afterPts.length >= 1) {
    objectPath = dedupePoints([{ x: primary.x, y: primary.y }, ...afterPts, { ...pocket }]);
    if (dist(objectPath[0], objectPath[objectPath.length - 1]) < 4) {
      objectPath = [
        { x: primary.x, y: primary.y },
        { ...pocket },
      ];
    }
  } else {
    objectPath = [
      { x: primary.x, y: primary.y },
      { ...pocket },
    ];
  }

  // CB post-contact (always)
  const restZone = map.landing_zones?.find((z) => /cb|rest|cue/i.test(z.label));
  const cueAfter = estimateCueAfter(map, contactPoint, primary, pocket, restZone);
  if (cueAfter.length < 2) {
    cueAfter.push(add(contactPoint, { x: 2, y: 0 }));
  }

  const toPocket = norm(sub(pocket, primary));
  const diameter = 4.4;
  const ghostBall: SotdPoint = {
    x: primary.x - toPocket.x * diameter,
    y: primary.y - toPocket.y * diameter,
  };

  const cut = cutAngleDeg(sub(primary, start), sub(pocket, primary));
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

  const cat = (map.category || '').toLowerCase();
  if ((cat === 'kick' || /rail.?first/i.test(map.name)) && nearRail(fullPts[1] ?? start)) {
    railFirst = true;
  }

  // Markers only for multi-rail / multi-ball patterns — not gold tokens by default
  const multi =
    map.object_ball_positions.filter((b) => b.role !== 'blocker').length > 1 ||
    railFirst ||
    objectPath.length > 2 ||
    cat === 'combo' ||
    cat === 'kick' ||
    cat === 'bank';
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
