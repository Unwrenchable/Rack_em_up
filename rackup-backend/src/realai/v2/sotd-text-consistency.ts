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
 *  - distances and places ("one diamond back", "foot spot", "behind the head string",
 *    "frozen on the rail", "near a rail"), blockers vs soft props, "CB only"
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
  steps: string[];
  successLooksLike: string;
};

export type ConsistencyIssue = { code: string; message: string };
export type ConsistencyReport = { id: string; ok: boolean; issues: ConsistencyIssue[] };

const D = BALL_DIAMETER;
const DIAMOND = 12.5;
const FOOT_SPOT: Pt = { x: 75, y: 25 };
const HEAD_SPOT: Pt = { x: 25, y: 25 };

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
    const end = pathRoute[pathRoute.length - 1];
    if (/near the foot spot/i.test(all) && dist(end, FOOT_SPOT) > 8) bad('place', 'tour should end near the foot spot');
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
  if (!noPocket && !optional && goal !== 'pocket' && !/both corners/.test(pk)) bad('pocket', `text calls a pocket ("${shot.pocket}") but the map has no pot`);
  if (goal === 'pocket') {
    const id = nearestPocketId(g.pocket).id;
    if (/\bside\b/.test(pk) && !id.startsWith('side')) bad('pocket', `text says side pocket; map pots in ${id}`);
    if (/\bcorner\b/.test(pk) && !/side/.test(pk) && !id.startsWith('head') && !id.startsWith('foot')) bad('pocket', `text says corner; map pots in ${id}`);
    if (/\bfoot corner\b/.test(pk) && !id.startsWith('foot')) bad('pocket', `text says foot corner; map pots in ${id}`);
  }
  if (/both corners/.test(pk)) {
    const corners = (map.extra_object_paths ?? []).filter((x) => {
      const end = x.pts[x.pts.length - 1];
      const n = nearestPocketId({ x: Number(end.x), y: Number(end.y) });
      return n.d < 1 && !n.id.startsWith('side');
    });
    if (corners.length < 2) bad('pocket', 'text says both corners but the map does not send two balls to corners');
  }

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

  // ── places / distances / frozen ───────────────────────────────────────────
  const diam = setupText.match(/CB (?:is )?(one|two|1|2)(?:[–-](\d(?:\.\d)?))? diamonds? (?:back|away|out|behind)/i) ??
    setupText.match(/CB on the extended line, (\d) diamonds? behind/i);
  if (diam) {
    const lo = (NUM[diam[1].toLowerCase()] ?? Number(diam[1])) * DIAMOND;
    const hi = (diam[2] ? Number(diam[2]) : NUM[diam[1].toLowerCase()] ?? Number(diam[1])) * DIAMOND;
    const d = dist(cue, prim);
    if (d < lo - 3 || d > hi + 4) bad('distance', `text says ${diam[0]} but the CB is ${(d / DIAMOND).toFixed(1)} diamonds from the OB`);
  }
  if (/\bon (the )?foot spot\b|placed on foot spot|replaced on foot spot/i.test(setupText) && dist(prim, FOOT_SPOT) > 1.5) {
    bad('place', 'text puts the OB on the foot spot');
  }
  if (/near the foot spot/i.test(setupText) && dist(prim, FOOT_SPOT) > 12) bad('place', 'text puts the balls near the foot spot');
  if (/behind the head string|in the kitchen(?! or)|kitchen mark/i.test(setupText) && !/kitchen or/i.test(setupText) && cue.x > 25.5) {
    bad('place', 'text puts the CB behind the head string');
  }
  if (/just past (the )?head string/i.test(setupText) && (cue.x < 25 || cue.x > 33)) bad('place', 'text puts the CB just past the head string');
  if (/CB near head string/i.test(setupText) && Math.abs(cue.x - 25) > 5) bad('place', 'text puts the CB near the head string');
  if (/CB near head rail/i.test(setupText) && cue.x > 20) bad('place', 'text puts the CB near the head rail');
  if (/CB (near rail|within a few inches of a rail)/i.test(setupText) && cushionGap(cue) > 6) bad('place', 'text puts the CB near a rail');
  if (/CB: center table|CB center table/i.test(setupText) && Math.abs(cue.y - 25) > 3) bad('place', 'text puts the CB in the middle of the table');
  if (/near the head spot/i.test(setupText) && Math.min(...pathRoute.slice(0, -1).map((p, i) => segDist(HEAD_SPOT, p, pathRoute[i + 1]))) > 6) {
    bad('place', 'text says the CB tour returns near the head spot');
  }
  if (/\bOB frozen (on|mid)|\bOB frozen or nearly frozen/i.test(setupText) && cushionGap(prim) > 1.3) {
    bad('frozen', 'text freezes the OB on a rail');
  }
  if (/B frozen on rail/i.test(setupText)) {
    const b = balls.find((x) => x !== prim && (!x.role || x.role === 'object'));
    if (!b || cushionGap(b) > 1.3) bad('frozen', 'text freezes ball B on the rail');
    else if (dist(b, prim) > D + 0.2 && /A frozen to B/i.test(setupText)) bad('frozen', 'text freezes A to B');
  }
  if (/CB (almost touching|nearly frozen to) OB/i.test(setupText) && dist(cue, prim) > D + 0.6) bad('frozen', 'text puts the CB almost touching the OB');
  if (/OB near (the )?foot rail/i.test(setupText) && 100 - prim.x > 12.5) bad('place', 'text puts the OB near the foot rail');
  if (/OB (one|a) diamond (above|off) the side|OB a diamond off the side rail/i.test(setupText) && Math.abs(Math.min(prim.y, 50 - prim.y) - DIAMOND) > 3) {
    bad('place', 'text puts the OB a diamond off the side rail');
  }

  // ── blockers vs soft props ────────────────────────────────────────────────
  const blockers = balls.filter((b) => b.role === 'blocker');
  const softProp = /chalk cube|towel|jump aid|paper ring|soft low obstacle|low soft obstacle|soft obstacle|imaginary blocker/i.test(setupText);
  const wantsBlocker = /blocker|blocking|angle blocked|snookered/i.test(setupText) && !softProp;
  if (softProp && blockers.length && !/or real ball/i.test(setupText)) bad('blocker', 'text uses a soft prop (no ball) but the map draws a blocker ball');
  if (wantsBlocker && !blockers.length) bad('blocker', 'text has a ball blocking the line but the map shows none');
  if (/two blockers|two object balls almost blocking/i.test(setupText) && blockers.length < 2) bad('blocker', 'text has two blockers');
  if (blockers.length && !/block|obstacle|snooker|gate|troublemaker|offline/i.test(all)) bad('blocker', 'map draws a blocker the text never mentions');
  const props = balls.filter((b) => b.role === 'prop');
  if (props.length && !/\b(balls|mirror|stack|cluster|three|8)\b/i.test(spec)) bad('prop', `map draws extra ball(s) ${props.map((b) => '#' + b.ballId).join(', ')} the text never mentions`);

  return { id: shot.id, ok: issues.length === 0, issues };
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
