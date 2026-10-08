/**
 * Text-vs-map consistency for the SOTD catalogue — no RealAI, no deps.
 *
 * The catalogue text (shot-catalog.ts) is the spec; the map (sotd-shot-maps.ts) is the
 * drawing. This check reads plain phrases from the text and confirms the drawing shows them:
 *
 *  - called ball numbers exist; the first-contact ball is the one the text says to hit
 *  - pocket kind (side / corner / foot corner / none → a spot or path goal)
 *  - rail-count words ("two-rail", "one rail", "four rail", "after two cushions", "rail-first")
 *  - tip words vs the stroke: tip zone ↔ english ↔ tipDetail words, draw / follow / stop
 *    finish, inside / outside english vs the drawn cut side, running / reverse vs the rail
 *  - cut words ("30–40° cut", "50°+", "¾ hit", "thin", "straight" / "straight-ish")
 *  - placements in the position convention (see SHOT_POSITION_CONVENTION in shot-catalog.ts):
 *    "1-ball: on the foot spot", "Cue ball: one diamond from the right long rail",
 *    "frozen to the left long rail", "half a ball off the right long rail", "halfway between
 *    the cue ball and the 1", "2 inches past the head string", "frozen to the 2" …
 *  - the "Route:" setup line (CB → rails → balls → pocket) against the drawn route, and the
 *    pocket field naming the exact drawn pocket ("foot-left corner", "right side pocket")
 *  - finishes ("finish within half a diamond of the foot spot", "passes within … of the head spot")
 *  - no vague words (near, about, almost, roughly, slightly, ~, -ish …) in any field, no
 *    unexplained props: every ball the map draws is named by number, no non-ball obstacles
 *  - every shot has a one-sentence `what` and `why`
 *
 * It is deliberately literal: a phrase it does not understand is ignored, a phrase it does
 * understand must match the drawing.
 */
import { BALL_DIAMETER, POCKETS, type SotdGeomPoint as Pt } from './sotd-shot-map-geometry';
import {
  deriveSotdRoute,
  sotdContact,
  sotdRailAt,
  type SotdRouteMap,
} from './sotd-route-audit';

export type ConsistencyShot = {
  id: string;
  name: string;
  tagline: string;
  what?: string;
  why?: string;
  category: string;
  table: string;
  setup: string[];
  objectBall: string;
  pocket: string;
  tipZone: string;
  tipDetail: string;
  english: string;
  elevation?: string;
  speedDetail?: string;
  bridge?: string;
  steps: string[];
  tips?: string[];
  commonMistakes?: string[];
  successLooksLike: string;
};

export type ConsistencyIssue = { code: string; message: string };
export type ConsistencyReport = { id: string; ok: boolean; issues: ConsistencyIssue[] };

const D = BALL_DIAMETER;
const DIAMOND = 12.5;
const FOOT_SPOT: Pt = { x: 75, y: 25 };
const HEAD_SPOT: Pt = { x: 25, y: 25 };
const CENTER_SPOT: Pt = { x: 50, y: 25 };
const SPOTS: Record<string, Pt> = { foot: FOOT_SPOT, head: HEAD_SPOT, center: CENTER_SPOT };
const STRING_X: Record<string, number> = { head: 25, center: 50, foot: 75 };

/** Precise pocket names (position convention) ↔ generator pocket ids. */
export const SOTD_POCKET_NAMES: Record<string, string> = {
  'head-near': 'head-right corner',
  'head-far': 'head-left corner',
  'side-near': 'right side pocket',
  'side-far': 'left side pocket',
  'foot-near': 'foot-right corner',
  'foot-far': 'foot-left corner',
};
/** Precise rail names: near (y=0) = right long rail, far (y=50) = left long rail. */
export const SOTD_RAIL_NAMES: Record<string, string> = {
  near: 'right long rail',
  far: 'left long rail',
  head: 'head rail',
  foot: 'foot rail',
};

/** Vague placement / instruction words the catalogue must not use. */
export const SOTD_VAGUE_WORDS =
  /\b(near|nearly|nearby|almost|about|approximately|approx|roughly|somewhere|close to|a bit|a few|slight|slightly|kind of|sort of)\b|~|\b\w+-ish\b|\bprops?\b/i;
/** Non-ball obstacles: a diagram only ever shows balls, so the text may not lean on these. */
const NON_BALL_PROPS = /chalk cube|towel|jump aid|jump trainer|paper ring|donut|imaginary|soft (low )?obstacle|low (soft )?obstacle|rack ghost/i;

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const cross = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 < 1e-12) return dist(p, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
};
const cushionGap = (p: Pt) => Math.min(p.x, 100 - p.x, p.y, 50 - p.y);

const NUM: Record<string, number> = { one: 1, single: 1, two: 2, three: 3, four: 4, quad: 4, '1': 1, '2': 2, '3': 3, '4': 4 };

type TipParts = { center: boolean; high: boolean; low: boolean; left: boolean; right: boolean };
function tipParts(tip: string): TipParts {
  const t = tip.toLowerCase();
  return {
    center: t === 'center',
    high: /high/.test(t),
    low: /low/.test(t),
    left: /left/.test(t),
    right: /right/.test(t),
  };
}

function nearestPocketId(p: Pt): { id: string; d: number } {
  let best = { id: '', d: Infinity };
  for (const [id, pk] of Object.entries(POCKETS)) {
    const d = dist(p, pk);
    if (d < best.d) best = { id, d };
  }
  return best;
}

/** Cushion contacts on a polyline (interior vertices on a nose line). */
function railHits(pts: Pt[]): Pt[] {
  return pts.slice(1, -1).filter((p) => sotdRailAt(p) && nearestPocketId(p).d > 4);
}

export function checkShotTextConsistency(shot: ConsistencyShot, map: SotdRouteMap): ConsistencyReport {
  const issues: ConsistencyIssue[] = [];
  const bad = (code: string, message: string) => issues.push({ code, message });
  const goal = map.shot_goal ?? 'pocket';
  const balls = map.object_ball_positions ?? [];
  const cue = { x: Number(map.cue_ball_start.x), y: Number(map.cue_ball_start.y) };
  const setupText = [shot.table, ...shot.setup].join(' | ');
  const spec = [shot.name, shot.tagline, shot.table, ...shot.setup, shot.objectBall, shot.pocket].join(' | ');
  const tipText = `${shot.tipDetail} | ${shot.english}`;
  const finishText = [...shot.steps, shot.successLooksLike].join(' | ');
  const all = [spec, tipText, finishText].join(' | ');

  // ── what / why ────────────────────────────────────────────────────────────
  for (const [key, val] of [['what', shot.what], ['why', shot.why]] as const) {
    if (!val || !val.trim()) bad('what_why', `missing a one-sentence "${key}"`);
    else if (/[.!?]\s+\S/.test(val.trim()) || val.length > 170) bad('what_why', `"${key}" should be one short sentence`);
  }

  // ── vague words / props (every text field) ────────────────────────────────
  const fields: Array<[string, string]> = [
    ['name', shot.name],
    ['tagline', shot.tagline],
    ['what', shot.what ?? ''],
    ['why', shot.why ?? ''],
    ['table', shot.table],
    ...shot.setup.map((x, i) => [`setup[${i}]`, x] as [string, string]),
    ['objectBall', shot.objectBall],
    ['pocket', shot.pocket],
    ['tipDetail', shot.tipDetail],
    ['english', shot.english],
    ['elevation', shot.elevation ?? ''],
    ['speedDetail', shot.speedDetail ?? ''],
    ['bridge', shot.bridge ?? ''],
    ...shot.steps.map((x, i) => [`steps[${i}]`, x] as [string, string]),
    ...(shot.tips ?? []).map((x, i) => [`tips[${i}]`, x] as [string, string]),
    ...(shot.commonMistakes ?? []).map((x, i) => [`commonMistakes[${i}]`, x] as [string, string]),
    ['successLooksLike', shot.successLooksLike],
  ];
  for (const [key, val] of fields) {
    const v = val.match(SOTD_VAGUE_WORDS);
    if (v) bad('vague', `${key} uses the vague word "${v[0]}"`);
    const p = val.match(NON_BALL_PROPS);
    if (p) bad('prop', `${key} uses a non-ball obstacle ("${p[0]}"); diagrams only show balls`);
    if (/\b(coin|marker)\b/i.test(val) && (map.shot_goal ?? 'pocket') !== 'spot') bad('prop', `${key} uses a marker but the map has no spot goal`);
  }
  const fullText = fields.map(([, v]) => v).join(' | ');
  for (const b of map.object_ball_positions ?? []) {
    if (!namedBalls(fullText).includes(b.ballId)) bad('prop', `map draws the ${b.ballId}-ball (${b.role ?? 'object'}) but the text never names it`);
  }
  if (!/^None\b/.test(shot.objectBall.trim()) && !/\b\d{1,2}-ball\b/.test(shot.objectBall)) {
    bad('object_ball', `objectBall "${shot.objectBall}" must name the ball by number (e.g. "1-ball") or start with "None"`);
  }

  // ── placements / route / finish (position convention) ────────────────────
  checkPlacements(shot, map, bad);
  checkRouteLine(shot, map, bad);
  checkFinish(shot, map, bad);
  checkPocketName(shot, map, bad);

  // ── category / tip ↔ english ──────────────────────────────────────────────
  if ((map.category || '').toLowerCase() !== shot.category) bad('category', `map category ${map.category} ≠ catalogue ${shot.category}`);
  if (map.tip_zone !== shot.tipZone) bad('tip_zone', `map tip ${map.tip_zone} ≠ catalogue ${shot.tipZone}`);
  const tp = tipParts(shot.tipZone);
  const e = map.english ?? {};
  const side = Number(e.sidespin ?? 0);
  if ((tp.right && side <= 0) || (tp.left && side >= 0) || (!tp.left && !tp.right && side !== 0)) {
    bad('tip_english', `english sidespin ${side} does not match tip ${shot.tipZone}`);
  }
  if ((tp.high && !(Number(e.follow ?? 0) > 0)) || (tp.low && !(Number(e.backspin ?? 0) > 0))) {
    bad('tip_english', `english follow/draw does not match tip ${shot.tipZone}`);
  }
  if (tp.center && (Number(e.follow ?? 0) || Number(e.backspin ?? 0))) bad('tip_english', 'center tip with follow/draw in english');
  // tip words in the tip text must include the declared zone
  const tl = tipText.toLowerCase();
  const says = {
    center: /\bcent(er|re)\b|\bstun\b/.test(tl),
    high: /\bhigh\b|\b12\b|follow|above center|\broll\b/.test(tl),
    low: /\blow\b|\b6 o|\b6\b|draw|below center|backspin/.test(tl),
    left: /\bleft\b|\b9 o|\b9\b/.test(tl),
    right: /\bright\b|\b3 o|\b3\b/.test(tl),
  };
  // Side spin may be named by side ("right", "3 o’clock") or by role ("inside", "outside",
  // "running", "reverse", "high-side") — the role is checked against the drawing below.
  const sideRole = /\b(inside|outside|running|reverse|check)\b|\b(high|low)-side\b|\bside\b/.test(tl);
  for (const k of ['center', 'high', 'low', 'left', 'right'] as const) {
    if (!tp[k] || says[k]) continue;
    if ((k === 'left' || k === 'right') && sideRole && !(k === 'left' ? says.right && !/\bor\b/.test(tl) : says.left && !/\bor\b/.test(tl))) continue;
    bad('tip_words', `tip ${shot.tipZone} but the tip text never says ${k}`);
  }
  if (!tp.low && /\bpure backspin\b|\bdraw\b/.test(tl) && !/\bdraw component\b/.test(tl) && !tp.center && !tp.high) {
    bad('tip_words', `tip text asks for draw but tip is ${shot.tipZone}`);
  }

  // ── path goal (CB only) ───────────────────────────────────────────────────
  const pathRoute: Pt[] = [];
  for (const s of map.intended_path ?? []) {
    if (!pathRoute.length) pathRoute.push({ x: Number(s.from.x), y: Number(s.from.y) });
    pathRoute.push({ x: Number(s.to.x), y: Number(s.to.y) });
  }
  const cbOnly = /^None\b/i.test(shot.objectBall.trim()) || /\bno OB required\b/i.test(setupText);
  if (cbOnly) {
    if (goal !== 'path') bad('cb_only', 'text says CB only (no object ball) but the map is not a path shot');
    if (balls.length) bad('cb_only', 'text says CB only but the map shows object balls');
  } else if (goal === 'path') {
    bad('cb_only', 'map is a CB-only path but the text names an object ball');
  }
  const railWords = railCountWords(spec + ' | ' + shot.steps.join(' | '));
  if (goal === 'path') {
    const hits = railHits(pathRoute).length;
    for (const w of railWords) if (hits < w.min || hits > w.max) bad('rail_count', `text says ${w.text} but the CB tour touches ${hits}`);
    return { id: shot.id, ok: issues.length === 0, issues };
  }

  const g = deriveSotdRoute(map);
  if (!g) {
    bad('no_object_ball', 'text describes an object-ball shot but the map has no object ball');
    return { id: shot.id, ok: false, issues };
  }
  const c = sotdContact(map);
  const prim = g.prim;

  // ── named balls / first contact ───────────────────────────────────────────
  const named = namedBalls(spec + ' | ' + shot.successLooksLike);
  for (const n of named) {
    if (!balls.some((b) => b.ballId === n)) bad('ball_named', `text names the ${n} but the map has no ball ${n}`);
  }
  const first = firstContactBall(spec);
  if (first !== null && prim.ballId !== first) bad('first_contact', `text says the CB hits the ${first} first; map hits #${prim.ballId}`);

  // ── pocket / goal ─────────────────────────────────────────────────────────
  const pk = shot.pocket.toLowerCase();
  const noPocket = /^(none|n\/a)\b/.test(pk);
  const optional = /optional|if available/.test(pk);
  if (noPocket && goal === 'pocket') bad('pocket', `text says "${shot.pocket}" but the map pots a ball`);
  if (!noPocket && !optional && goal !== 'pocket' && !/both (foot )?corners|\bthe \d{1,2} in the\b/.test(pk)) bad('pocket', `text calls a pocket ("${shot.pocket}") but the map has no pot`);
  // ── rails ─────────────────────────────────────────────────────────────────
  const cbRails = railHits(g.pts.slice(0, g.contactIdx + 1)).length;
  const obRails = railHits(g.objPath).length;
  for (const w of railWords) {
    const okCb = cbRails >= w.min && cbRails <= w.max;
    const okOb = obRails >= w.min && obRails <= w.max;
    if (!okCb && !okOb) bad('rail_count', `text says ${w.text}; map has ${cbRails} CB rail(s) before contact and ${obRails} OB rail(s)`);
  }
  if (/(?<!no )rail[- ]first|hit (the )?long rail before/i.test(spec) && cbRails === 0 && !(shot.category === 'bank' && obRails > 0)) {
    bad('rail_first', 'text says rail-first but nothing touches a rail before the OB');
  }

  // ── cut words ─────────────────────────────────────────────────────────────
  const cut = c?.cut ?? 0;
  const cutRule = cutWords(setupText, spec);
  if (cutRule && (cut < cutRule.min || cut > cutRule.max)) {
    bad('cut', `text says ${cutRule.text} but the drawn cut is ${cut.toFixed(0)}°`);
  }

  // ── stroke: draw / follow / stop and distances ────────────────────────────
  const rest = (map.landing_zones ?? []).find((z) => /cb|rest|cue/i.test(z.label));
  if (c && rest && !g.isCarom) {
    const r = { x: Number(rest.x), y: Number(rest.y) };
    const travel = dist(r, c.ghost);
    const along = dot(sub(r, c.ghost), c.u);
    if (cut < 6) {
      if (tp.low && along > -1) bad('stroke', 'draw on a straight shot but the CB does not come back');
      if (tp.high && along < 1) bad('stroke', 'follow on a straight shot but the CB does not go forward');
      if (tp.center && travel > 3) bad('stroke', `center/stop on a straight shot but the CB travels ${travel.toFixed(1)}`);
    }
    const back = finishText.match(/(\d)[–-](\d) diamonds?/);
    if (back && /revers|back/i.test(finishText) && -along < Number(back[1]) * DIAMOND - 1) {
      bad('stroke', `text says the CB comes back ${back[0]}; map draws ${(-along / DIAMOND).toFixed(1)}`);
    }
    const fwd = finishText.match(/(\d)\+ diamonds? past/);
    if (fwd && travel < Number(fwd[1]) * DIAMOND - 1) bad('stroke', `text says ${fwd[0]} contact; CB travels ${(travel / DIAMOND).toFixed(1)} diamonds`);
    if (/past the cent(er|re) string/i.test(finishText) && (r.x - 50) * (prim.x - 50) > 0) bad('stroke', 'text says the CB returns past the center string');
    if (/hand-span/i.test(finishText) && travel > 9) bad('stroke', 'text says the CB dies within a hand-span');
    if (/draws? away from the rail/i.test(finishText) && cushionGap(r) <= cushionGap(cue)) bad('stroke', 'text says the CB draws away from the rail');
    if (/up-table/i.test(all) && shot.category !== 'kick' && !(r.x < c.ghost.x)) bad('stroke', 'text says the CB swings up-table (toward the head)');
  }

  // inside / outside english vs the drawn cut side
  if (c && (tp.left || tp.right) && c.obSide !== 0 && !/depending/i.test(tipText)) {
    const spinSide = tp.right ? -1 : 1; // +1 = left english (OB-left convention)
    const inside = /\binside\b/i.test(tipText);
    const outside = /\boutside\b/i.test(tipText);
    if (inside && !outside && spinSide !== c.obSide) bad('inside_outside', 'text says inside english but the tip is on the far side of the drawn cut');
    if (outside && !inside && spinSide === c.obSide) bad('inside_outside', 'text says outside english but the tip is on the cut side');
  }

  // running / reverse vs the cushion it applies to
  if ((tp.left || tp.right) && /\brunning\b|\breverse\b|\bcheck\b|hold-up/i.test(tipText) && !/depending|later:/i.test(tipText)) {
    const wantRunning = /\brunning\b/i.test(tipText) && !/\breverse\b|\bcheck\b|hold-up/i.test(tipText);
    const bank = shot.category === 'bank';
    const route = bank ? g.objPath : g.pts.slice(0, g.contactIdx + 1);
    const idx = route.findIndex((p, i) => i > 0 && i < route.length - 1 && sotdRailAt(p));
    if (idx > 0) {
      const turn = cross(sub(route[idx], route[idx - 1]), sub(route[idx + 1], route[idx]));
      let runningSide = turn < 0 ? 1 : -1; // +1 = right english runs
      if (bank) runningSide = -runningSide; // CB side spin reaches the OB reversed (gear effect)
      const isRunning = (tp.right ? 1 : -1) === runningSide;
      if (wantRunning !== isRunning) bad('running_reverse', `text asks for ${wantRunning ? 'running' : 'reverse'} english but ${shot.tipZone} is ${isRunning ? 'running' : 'reverse'} on the drawn rail`);
    } else bad('running_reverse', 'text talks about running/reverse english but the drawing has no rail for it');
  }

  // curve / swerve direction words
  if (/right bend|bends? right|bend right|curves? right/i.test(all + (shot.what ?? '')) && !tp.right) bad('curve', 'text says the CB bends right but the tip has no right english');

  // ── blockers vs soft props ────────────────────────────────────────────────
  const blockers = balls.filter((b) => b.role === 'blocker');
  const wantsBlocker = /\bblocker\b|\bblocking\b|\bblocks\b|angle blocked|snookered/i.test(setupText);
  if (wantsBlocker && !blockers.length) bad('blocker', 'text has a ball blocking the line but the map shows none');
  if (/two blockers/i.test(setupText) && blockers.length < 2) bad('blocker', 'text has two blockers');
  if (blockers.length && !/block|snooker|gate|jump|swerve|curve|kick|massé|masse/i.test(all)) bad('blocker', 'map draws a blocker the text never mentions');

  return { id: shot.id, ok: issues.length === 0, issues };
}

// ── position convention helpers ─────────────────────────────────────────────
type Bad = (code: string, message: string) => void;

const NUM_RE = '(half a|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\\d+(?:\\.\\d+)?)';
const UNIT_RE = '(diamonds?|inch(?:es)?|in)\\b';
const RAIL_RE = '(?:the )?(left long|right long|head|foot) rail';
const BALL_RE = '(?:the )?(cue ball|CB|\\d{1,2}(?:-ball)?)\\b';
const POCKET_RE = '(?:the )?((?:head|foot)-(?:left|right) corner|(?:left|right) side pocket)';
const WORD_NUM: Record<string, number> = {
  'half a': 0.5, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const toNum = (t: string) => WORD_NUM[t.toLowerCase()] ?? Number(t);
const toInches = (n: string, unit: string) => (/^d/i.test(unit) ? toNum(n) * DIAMOND : toNum(n));
const tolFor = (unit: string) => (/^d/i.test(unit) ? 0.2 * DIAMOND : 1);

function railDist(p: Pt, rail: string): number {
  const r = rail.toLowerCase();
  if (r.startsWith('left')) return 50 - p.y;
  if (r.startsWith('right')) return p.y;
  if (r.startsWith('head')) return p.x;
  return 100 - p.x;
}

function pocketPt(name: string): Pt | null {
  const id = Object.entries(SOTD_POCKET_NAMES).find(([, n]) => n === name.toLowerCase())?.[0];
  return id ? POCKETS[id as keyof typeof POCKETS] : null;
}

function pocketNameAt(p: Pt): string {
  return SOTD_POCKET_NAMES[nearestPocketId(p).id] ?? nearestPocketId(p).id;
}

function routePoints(map: SotdRouteMap): Pt[] {
  const pts: Pt[] = [];
  for (const s of map.intended_path ?? []) {
    if (!pts.length) pts.push({ x: Number(s.from.x), y: Number(s.from.y) });
    pts.push({ x: Number(s.to.x), y: Number(s.to.y) });
  }
  return pts;
}

function cbRestOf(map: SotdRouteMap): Pt | null {
  const rest = (map.landing_zones ?? []).find((z) => /cb|rest|cue/i.test(z.label));
  return rest ? { x: Number(rest.x), y: Number(rest.y) } : null;
}

/** Resolve "the cue ball" / "the 1" / "the 1-ball" to a drawn position. */
function ballPt(map: SotdRouteMap, ref: string): Pt | null {
  const r = ref.toLowerCase();
  if (r === 'cue ball' || r === 'cb') return { x: Number(map.cue_ball_start.x), y: Number(map.cue_ball_start.y) };
  const n = Number(r.replace(/-ball$/, ''));
  const b = (map.object_ball_positions ?? []).find((x) => x.ballId === n);
  return b ? { x: Number(b.x), y: Number(b.y) } : null;
}

const SUBJECT_RE = /^(Cue ball|CB|(\d{1,2})-ball|Marker)\s*:\s*(.+)$/i;

/** "Cue ball: …" / "1-ball: …" / "Marker: …" setup lines vs the drawn positions. */
function checkPlacements(shot: ConsistencyShot, map: SotdRouteMap, bad: Bad) {
  for (const line of shot.setup) {
    const m = line.trim().match(SUBJECT_RE);
    if (!m) continue;
    const who = m[1];
    let P: Pt | null;
    if (/^marker$/i.test(who)) {
      P = map.shot_goal === 'spot' ? { x: Number(map.pocket_target.x), y: Number(map.pocket_target.y) } : null;
      if (!P) {
        bad('place', 'text places a marker but the map has no spot goal');
        continue;
      }
    } else {
      P = ballPt(map, who);
      if (!P) {
        bad('place', `text places the ${who} but the map has no such ball`);
        continue;
      }
    }
    const clauses = m[3]
      .replace(/\.$/, '')
      .split(/;|,| and (?=(?:on|frozen|half|halfway|behind|in|\d|one|two|three|four|a|an)\b)/i)
      .map((c) => c.trim())
      .filter(Boolean);
    for (const cl of clauses) checkClause(map, who, P, cl, bad);
  }
}

function checkClause(map: SotdRouteMap, who: string, P: Pt, cl: string, bad: Bad) {
  const say = (msg: string) => bad('place', `${who}: "${cl}" — ${msg}`);
  let read = false;
  const hit = (re: RegExp) => {
    const r = cl.match(re);
    if (r) read = true;
    return r;
  };
  let m: RegExpMatchArray | null;
  const f1 = (n: number) => n.toFixed(1);
  if ((m = hit(/\bon the (foot|head|center) spot\b/i))) {
    const d = dist(P, SPOTS[m[1].toLowerCase()]);
    if (d > 1.5) say(`drawn ${f1(d)} in from the ${m[1]} spot`);
  }
  if ((m = hit(/\bon the (head|foot|center) string\b/i))) {
    const d = Math.abs(P.x - STRING_X[m[1].toLowerCase()]);
    if (d > 1) say(`drawn ${f1(d)} in off the ${m[1]} string`);
  }
  if (hit(/\bon the long string\b/i) && Math.abs(P.y - 25) > 1) say(`drawn ${f1(Math.abs(P.y - 25))} in off the long string`);
  if (hit(/\bbehind the head string\b|\bin the kitchen\b/i) && P.x > 25.5) say('drawn past the head string');
  if ((m = hit(new RegExp(`\\bfrozen to ${RAIL_RE}`, 'i')))) {
    const d = railDist(P, m[1]);
    if (d > 1.3) say(`drawn ${f1(d - BALL_DIAMETER / 2)} in off that rail`);
  }
  if ((m = hit(new RegExp(`\\bhalf a ball off ${RAIL_RE}`, 'i')))) {
    const d = railDist(P, m[1]);
    if (d < 2.0 || d > 2.6) say(`ball centre drawn ${f1(d)} in from that rail (half a ball off = 2.25)`);
  }
  if ((m = hit(new RegExp(`\\b${NUM_RE} ${UNIT_RE} (?:out )?from ${RAIL_RE}`, 'i')))) {
    const want = toInches(m[1], m[2]);
    const d = railDist(P, m[3]);
    if (Math.abs(d - want) > tolFor(m[2])) say(`drawn ${f1(d)} in (${(d / DIAMOND).toFixed(2)} diamonds) from that rail`);
  }
  if ((m = hit(new RegExp(`\\b${NUM_RE} ${UNIT_RE} (?:from|behind|away from|beyond|past) ${BALL_RE}`, 'i')))) {
    const B = ballPt(map, m[3]);
    if (!B) say(`the map has no ${m[3]}`);
    else {
      const want = toInches(m[1], m[2]);
      const d = dist(P, B);
      if (Math.abs(d - want) > tolFor(m[2])) say(`drawn ${f1(d)} in (${(d / DIAMOND).toFixed(2)} diamonds) centre to centre`);
    }
  }
  if ((m = hit(new RegExp(`\\b${NUM_RE} ${UNIT_RE} from ${POCKET_RE}`, 'i')))) {
    const pk = pocketPt(m[3]);
    const want = toInches(m[1], m[2]);
    const d = pk ? dist(P, pk) : NaN;
    if (!(Math.abs(d - want) <= tolFor(m[2]))) say(`drawn ${f1(d)} in (${(d / DIAMOND).toFixed(2)} diamonds) from that pocket`);
  }
  if ((m = hit(new RegExp(`\\b${NUM_RE} ${UNIT_RE} past the (head|center|foot) string`, 'i')))) {
    const want = toInches(m[1], m[2]);
    const d = P.x - STRING_X[m[3].toLowerCase()];
    if (Math.abs(d - want) > tolFor(m[2])) say(`drawn ${f1(d)} in past that string (toward the foot)`);
  }
  if ((m = hit(new RegExp(`\\b${NUM_RE} ${UNIT_RE} toward the head from the (head|center|foot) string`, 'i')))) {
    const want = toInches(m[1], m[2]);
    const d = STRING_X[m[3].toLowerCase()] - P.x;
    if (Math.abs(d - want) > tolFor(m[2])) say(`drawn ${f1(d)} in toward the head from that string`);
  }
  if ((m = hit(new RegExp(`\\b${NUM_RE} ${UNIT_RE} from the long string`, 'i')))) {
    const want = toInches(m[1], m[2]);
    const d = Math.abs(P.y - 25);
    if (Math.abs(d - want) > tolFor(m[2])) say(`drawn ${f1(d)} in from the long string`);
  }
  if ((m = hit(new RegExp(`\\bhalfway between ${BALL_RE} and ${BALL_RE}`, 'i')))) {
    const A = ballPt(map, m[1]);
    const B = ballPt(map, m[2]);
    if (!A || !B) say('names a ball the map does not have');
    else {
      const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      if (dist(P, mid) > 2.5) say(`drawn ${f1(dist(P, mid))} in from the midpoint`);
    }
  }
  if ((m = hit(new RegExp(`\\bfrozen to ${BALL_RE}`, 'i')))) {
    const B = ballPt(map, m[1]);
    const d = B ? dist(P, B) : NaN;
    if (!(d >= BALL_DIAMETER - 0.05 && d <= BALL_DIAMETER + 0.2)) say(`centres drawn ${f1(d)} in apart (frozen = ${BALL_DIAMETER})`);
  }
  if ((m = hit(new RegExp(`\\b(\\d+(?:\\.\\d+)?)-inch gap (?:to|from) ${BALL_RE}`, 'i')))) {
    const B = ballPt(map, m[2]);
    const gap = B ? dist(P, B) - BALL_DIAMETER : NaN;
    if (!(Math.abs(gap - Number(m[1])) <= 0.2)) say(`drawn gap ${gap.toFixed(2)} in`);
  }
  if ((m = hit(new RegExp(`\\bon the line from ${BALL_RE} (?:to|into) ${POCKET_RE}`, 'i')))) {
    const A = ballPt(map, m[1]);
    const pk = pocketPt(m[2]);
    const d = A && pk ? segDist(P, A, pk) : NaN;
    if (!(d <= 1.2)) say(`drawn ${f1(d)} in off that line`);
  }
  if ((m = hit(new RegExp(`\\b${NUM_RE} ${UNIT_RE} off the (?:direct|straight) line`, 'i')))) {
    const cue = { x: Number(map.cue_ball_start.x), y: Number(map.cue_ball_start.y) };
    const ob = (map.object_ball_positions ?? []).find((b) => !b.role || b.role === 'object');
    const want = toInches(m[1], m[2]);
    const d = ob ? segDist(P, cue, { x: Number(ob.x), y: Number(ob.y) }) : NaN;
    if (!(Math.abs(d - want) <= tolFor(m[2]))) say(`drawn ${f1(d)} in off the cue ball → object ball line`);
  }
  // A clause that gives a measurement or relation must be one this checker can read.
  if (!read && (new RegExp(`\\b${NUM_RE} ${UNIT_RE}`, 'i').test(cl) || /\b(halfway|frozen|half a ball)\b|-inch gap/i.test(cl))) {
    bad('place_unread', `${who}: "${cl}" gives a placement the convention checker cannot read`);
  }
}

type RouteTok = string;
function railNamesOf(pts: Pt[]): string[] {
  return railHits(pts).map((p) => SOTD_RAIL_NAMES[sotdRailAt(p) as string]);
}

/** The "Route:" line (CB → rails → balls → rails → pocket) against the drawn route. */
function checkRouteLine(shot: ConsistencyShot, map: SotdRouteMap, bad: Bad) {
  const line = shot.setup.find((x) => /^Route:/i.test(x.trim()));
  const goal = map.shot_goal ?? 'pocket';
  let expected: RouteTok[];
  let cbRails: string[] = [];
  if (goal === 'path') {
    expected = ['CB', ...railNamesOf(routePoints(map))];
    cbRails = expected.slice(1);
  } else {
    const g = deriveSotdRoute(map);
    if (!g) return;
    cbRails = railNamesOf(g.pts.slice(0, g.contactIdx + 1));
    const ballsHit = (g.isCombo || g.isCarom ? g.combo : [g.prim]).map((b) => `${b.ballId}-ball`);
    const obRails = railNamesOf(g.objPath);
    expected = ['CB', ...cbRails, ...ballsHit, ...obRails];
    if (goal === 'pocket') expected.push(pocketNameAt(g.pocket));
    if (!line && (cbRails.length || obRails.length)) {
      bad('route_missing', `diagram uses rails (${expected.join(' → ')}) but the setup has no "Route:" line`);
      return;
    }
  }
  if (!line) {
    if (goal === 'path') bad('route_missing', `CB tour (${expected.join(' → ')}) needs a "Route:" line`);
    return;
  }
  const toks = line
    .trim()
    .replace(/^Route:\s*/i, '')
    .replace(/\.$/, '')
    .split(/\s*→\s*/)
    .map((t) => t.trim().replace(/^the /i, ''));
  const norm: RouteTok[] = [];
  for (const t of toks) {
    if (/^(CB|cue ball)$/i.test(t)) norm.push('CB');
    else if (/^(left long|right long|head|foot) rail$/i.test(t)) norm.push(t.toLowerCase());
    else if (/^\d{1,2}-ball$/i.test(t)) norm.push(t.toLowerCase());
    else if (pocketPt(t)) norm.push(t.toLowerCase());
    else {
      bad('route', `Route token "${t}" is not CB, a named rail, an N-ball or a precise pocket`);
      return;
    }
  }
  let want = expected;
  if (norm[0] !== 'CB') {
    if (cbRails.length) {
      bad('route', `Route starts at the object ball but the CB touches ${cbRails.join(', ')} first`);
      return;
    }
    want = expected.slice(1);
  }
  if (norm.join(' → ') !== want.join(' → ')) bad('route', `text Route "${norm.join(' → ')}" ≠ drawn "${want.join(' → ')}"`);
}

/** "Finish: within … of the foot spot" / "passes within … of the head spot". */
function checkFinish(shot: ConsistencyShot, map: SotdRouteMap, bad: Bad) {
  const goal = map.shot_goal ?? 'pocket';
  const route = routePoints(map);
  const texts = [...shot.setup, ...shot.steps, shot.successLooksLike];
  for (const t of texts) {
    let m = t.match(new RegExp(`(?:^Finish:|\\b(?:CB|cue ball)\\b)[^.|;]*?\\bwithin ${NUM_RE} ${UNIT_RE} of the (foot|head|center) spot`, 'i'));
    if (m && !/passes within/i.test(m[0])) {
      const end = goal === 'path' ? route[route.length - 1] : cbRestOf(map);
      const want = toInches(m[1], m[2]);
      const d = end ? dist(end, SPOTS[m[3].toLowerCase()]) : NaN;
      if (!(d <= want + 0.05)) bad('finish', `text finishes within ${m[1]} ${m[2]} of the ${m[3]} spot; the drawn finish is ${d.toFixed(1)} in away`);
    }
    m = t.match(new RegExp(`passes within ${NUM_RE} ${UNIT_RE} of the (foot|head|center) spot`, 'i'));
    if (m) {
      const want = toInches(m[1], m[2]);
      const sp = SPOTS[m[3].toLowerCase()];
      const d = Math.min(...route.slice(0, -1).map((p, i) => segDist(sp, p, route[i + 1])));
      if (!(d <= want + 0.05)) bad('finish', `text says the CB passes within ${m[1]} ${m[2]} of the ${m[3]} spot; drawn closest pass ${d.toFixed(1)} in`);
    }
  }
}

/** The pocket field names the exact drawn pocket in the position convention. */
function checkPocketName(shot: ConsistencyShot, map: SotdRouteMap, bad: Bad) {
  const goal = map.shot_goal ?? 'pocket';
  const pk = shot.pocket.trim();
  const names = [...pk.matchAll(new RegExp(POCKET_RE, 'gi'))].map((m) => m[1].toLowerCase());
  if (goal === 'pocket') {
    const drawn = pocketNameAt({ x: Number(map.pocket_target.x), y: Number(map.pocket_target.y) });
    if (!names.length) bad('pocket_name', `pocket "${pk}" must name the exact pocket (drawn: ${drawn})`);
    else if (names[0] !== drawn) bad('pocket_name', `text pocket ${names[0]} ≠ drawn ${drawn}`);
    return;
  }
  if (/^None\b/.test(pk)) return;
  if (goal === 'spot') {
    const calls = [...pk.matchAll(new RegExp(`the (\\d{1,2})(?:-ball)? in ${POCKET_RE}`, 'gi'))];
    if (!calls.length) {
      bad('pocket_name', `spot-goal pocket field must start with "None" or call "the N in the <pocket>" (got "${pk}")`);
      return;
    }
    for (const c of calls) {
      const n = Number(c[1]);
      const x = (map.extra_object_paths ?? []).find((e) => e.ballId === n);
      const end = x ? x.pts[x.pts.length - 1] : null;
      const at = end ? pocketNameAt({ x: Number(end.x), y: Number(end.y) }) : null;
      if (at !== c[2].toLowerCase()) bad('pocket_name', `text sends the ${n} to the ${c[2]}; drawn: ${at ?? 'no path'}`);
    }
    return;
  }
  bad('pocket_name', `path goal: pocket field must start with "None" (got "${pk}")`);
}

type RailWord = { text: string; min: number; max: number };
function railCountWords(text: string): RailWord[] {
  const out: RailWord[] = [];
  const t = text.toLowerCase();
  for (const m of t.matchAll(/(?<![–-])\b(one|single|two|three|four|quad|[1-4])[- ](?:rail|cushion)s?\b(?![- ]?first)/g)) {
    const n = NUM[m[1]];
    out.push({ text: `"${m[0]}"`, min: n, max: n });
  }
  for (const m of t.matchAll(/\b(?:off|after) (one|two|three|four) (?:rails|cushions)\b/g)) {
    const n = NUM[m[1]];
    out.push({ text: `"${m[0]}"`, min: n, max: n });
  }
  for (const m of t.matchAll(/\b([1-4])[–-]([1-4]) rail/g)) out.push({ text: `"${m[0]}"`, min: Number(m[1]), max: Number(m[2]) });
  if (/multi-rail|rails more than once/.test(t)) out.push({ text: '"multi-rail"', min: 2, max: 9 });
  return out;
}

/** Ball numbers the text names explicitly ("9-ball", "the 8", "Object ball (1)", "hit 1 then"). */
function namedBalls(text: string): number[] {
  const set = new Set<number>();
  for (const m of text.matchAll(/\b(\d{1,2})-ball\b/g)) set.add(Number(m[1]));
  for (const m of text.matchAll(/\((\d{1,2})\)/g)) set.add(Number(m[1]));
  for (const m of text.matchAll(/\b(?:the|on|hit|behind|into|off|kiss(?:es)?) (\d{1,2})\b(?!\s*(?:°|-|–|inch|in\b|diamonds?|o[’']clock|times|%|\/|strokes?|reps?|\+|degrees?))/g)) {
    set.add(Number(m[1]));
  }
  for (const m of text.matchAll(/\b(\d{1,2}) then carom/g)) set.add(Number(m[1]));
  return [...set].filter((n) => n >= 1 && n <= 15);
}

function firstContactBall(spec: string): number | null {
  const m = spec.match(/\bhit (\d{1,2}) then\b|\b(\d{1,2}) then carom\b|snookered on the (\d{1,2})\b/i);
  if (m) return Number(m[1] ?? m[2] ?? m[3]);
  return null;
}

type CutRule = { text: string; min: number; max: number };
function cutWords(setup: string, spec: string): CutRule | null {
  const s = setup;
  let m = s.match(/(\d{2})[–-](\d{2})° cut/);
  if (m) return { text: `"${m[0]}"`, min: Number(m[1]) - 2, max: Number(m[2]) + 2 };
  m = s.match(/(\d{2})°\+ cut/);
  if (m) return { text: `"${m[0]}"`, min: Number(m[1]), max: 80 };
  m = s.match(/(\d{2})° cut/);
  if (m) return { text: `"${m[0]}"`, min: Number(m[1]) - 4, max: Number(m[1]) + 4 };
  if (/¾ hit/.test(s)) return { text: '"¾ hit"', min: 9, max: 21 };
  if (/micro-thin|edge only/i.test(s)) return { text: '"micro-thin / edge only"', min: 65, max: 80 };
  if (/\bthin(?!-ish)\b|thin-touch|thin your/i.test(s) || /\bthin\b/i.test(spec.split(' | ').slice(0, 2).join(' '))) {
    return { text: '"thin"', min: 45, max: 80 };
  }
  const loose = /straight-?ish|nearly straight|almost straight|slightly off/i.test(s);
  const strict = /\b(dead )?straight\b(?!-ish| behind| at the first)/i.test(s) || /straight in\b/i.test(s);
  if (loose) return { text: '"straight-ish"', min: 0, max: 15 };
  if (strict) return { text: '"straight"', min: 0, max: 5 };
  return null;
}

export function formatConsistency(r: ConsistencyReport): string {
  if (r.ok) return `${r.id}: text ok`;
  return `${r.id}: text mismatch — ${r.issues.map((i) => `[${i.code}] ${i.message}`).join('; ')}`;
}
