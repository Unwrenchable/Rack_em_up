/**
 * Catalogue text ↔ SOTD map agreement: the diagram must show what the shot card says.
 * Run: npm run test:smoke
 */
import { SHOT_CATALOG } from '../../src/shots/shot-catalog';
import { getSotdMapById, listSotdMaps } from '../../src/realai/v2/sotd-shot-maps';
import {
  checkShotTextConsistency,
  formatConsistency,
  type ConsistencyShot,
} from '../../src/realai/v2/sotd-text-consistency';
import type { SotdRouteMap } from '../../src/realai/v2/sotd-route-audit';

const shot = (id: string) => SHOT_CATALOG.find((s) => s.id === id)! as ConsistencyShot;
const map = (id: string) => JSON.parse(JSON.stringify(getSotdMapById(id)!)) as SotdRouteMap;
const codes = (s: ConsistencyShot, m: SotdRouteMap) => checkShotTextConsistency(s, m).issues.map((i) => i.code);

describe('SOTD catalogue text ↔ map consistency', () => {
  it('every catalogue shot has a one-sentence what/why and its map matches the text', () => {
    expect(listSotdMaps().length).toBe(SHOT_CATALOG.length);
    const bad = SHOT_CATALOG.map((s) => checkShotTextConsistency(s as ConsistencyShot, getSotdMapById(s.id)!))
      .filter((r) => !r.ok)
      .map(formatConsistency);
    expect(bad).toEqual([]);
    for (const s of SHOT_CATALOG) {
      expect({ id: s.id, what: !!s.what, why: !!s.why }).toEqual({ id: s.id, what: true, why: true });
    }
  });

  it('catches the wrong first-contact ball (sotd-09 drawn hitting the 1 first)', () => {
    const m = map('sotd-09');
    m.object_ball_positions.forEach((b) => (b.ballId = b.ballId === 1 ? 9 : 1));
    m.extra_object_paths = [];
    const c = checkShotTextConsistency(shot('sotd-09'), m).issues;
    expect(c.map((i) => i.code)).toContain('route');
    expect(c.find((i) => i.code === 'route')!.message).toMatch(/CB → 9-ball → 1-ball/);
  });

  it('catches the wrong pocket (side-pocket text drawn into a corner)', () => {
    const m = map('sotd-26');
    m.pocket_target = { x: 100, y: 0 };
    m.intended_path[m.intended_path.length - 1].to = { x: 100, y: 0 };
    expect(codes(shot('sotd-26'), m)).toContain('pocket_name');
  });

  it('flags vague words in any field (near, about, almost, slightly, ~, -ish, prop)', () => {
    const base = shot('sotd-02');
    for (const [field, text] of [
      ['what', 'Pot the 1 near the corner.'],
      ['tipDetail', 'About center.'],
      ['successLooksLike', 'The CB stops almost dead.'],
      ['bridge', 'Slightly closed.'],
      ['table', '~one diamond'],
      ['tagline', 'Straight-ish stop shot'],
    ] as const) {
      const c = checkShotTextConsistency({ ...base, [field]: text } as ConsistencyShot, map('sotd-02')).issues;
      expect({ field, vague: c.some((i) => i.code === 'vague' && i.message.startsWith(field)) }).toEqual({ field, vague: true });
    }
    const setup = [...base.setup, 'Add a prop if you like.'];
    expect(codes({ ...base, setup } as ConsistencyShot, map('sotd-02'))).toContain('vague');
  });

  it('flags unexplained props: non-ball obstacles, unnamed drawn balls, markers without a spot goal', () => {
    const j = shot('sotd-32');
    const towel = { ...j, setup: [...j.setup, 'Jump a rolled towel instead.'] } as ConsistencyShot;
    expect(codes(towel, map('sotd-32'))).toContain('prop');
    // The diagram draws the 5; text that never names it is an unexplained prop.
    const unnamed = {
      ...j,
      name: 'Jump-Cut',
      table: 'Jump into a 30° cut',
      what: 'Jump the cue ball, land, and cut the 1 30° into the foot-right corner.',
      setup: j.setup.filter((x) => !/5/.test(x)),
      steps: j.steps.map((x) => x.replace(/the 5/g, 'the blocker')),
      successLooksLike: 'The CB clears the blocker, lands, and cuts the 1 into the foot-right corner.',
    } as ConsistencyShot;
    expect(checkShotTextConsistency(unnamed, map('sotd-32')).issues.some((i) => i.code === 'prop' && /5-ball/.test(i.message))).toBe(true);
    const marker = { ...shot('sotd-02'), steps: ['Place a coin marker where the CB should stop.'] } as ConsistencyShot;
    expect(codes(marker, map('sotd-02'))).toContain('prop');
  });

  it('checks the Route line against the drawn route', () => {
    const s = shot('sotd-07');
    const swapped = { ...s, setup: s.setup.map((x) => (x.startsWith('Route:') ? 'Route: CB → right long rail → left long rail → 1-ball → foot-left corner.' : x)) };
    expect(codes(swapped as ConsistencyShot, map('sotd-07'))).toContain('route');
    const missing = { ...s, setup: s.setup.filter((x) => !x.startsWith('Route:')) };
    expect(codes(missing as ConsistencyShot, map('sotd-07'))).toContain('route_missing');
  });

  it('checks placements in the position convention against the drawing', () => {
    const s = shot('sotd-49');
    const wrong = { ...s, setup: s.setup.map((x) => x.replace('on the foot string', 'on the head string')) };
    expect(codes(wrong as ConsistencyShot, map('sotd-49'))).toContain('place');
    const s1 = shot('sotd-01');
    const frozen = { ...s1, setup: s1.setup.map((x) => x.replace('half a ball off', 'frozen to')) };
    expect(codes(frozen as ConsistencyShot, map('sotd-01'))).toContain('place');
    const s8 = shot('sotd-08');
    const far = { ...s8, setup: s8.setup.map((x) => (x.startsWith('2-ball') ? x.replace('one diamond', 'two diamonds') : x)) };
    expect(codes(far as ConsistencyShot, map('sotd-08'))).toContain('place');
    const s14 = shot('sotd-14');
    const unread = { ...s14, setup: s14.setup.map((x) => (x.startsWith('8-ball') ? '8-ball: halfway between the cue ball and the foot rail.' : x)) };
    expect(codes(unread as ConsistencyShot, map('sotd-14'))).toContain('place_unread');
  });

  it('checks the named finish (sotd-39 ends within half a diamond of the foot spot)', () => {
    const s = shot('sotd-39');
    expect(checkShotTextConsistency(s, map('sotd-39')).ok).toBe(true);
    const head = { ...s, setup: s.setup.map((x) => (x.startsWith('Finish:') ? 'Finish: within half a diamond of the head spot.' : x)) };
    expect(codes(head as ConsistencyShot, map('sotd-39'))).toContain('finish');
  });

  it('every pocket field names the exact drawn pocket (head/foot + left/right corner, left/right side pocket)', () => {
    for (const s of SHOT_CATALOG) {
      const m = getSotdMapById(s.id)!;
      if ((m.shot_goal ?? 'pocket') !== 'pocket') continue;
      expect({ id: s.id, ok: /^(head|foot)-(left|right) corner|^(left|right) side pocket/i.test(s.pocket) }).toEqual({ id: s.id, ok: true });
    }
  });

  it('catches a rail-count mismatch (two-rail kick text on a one-rail drawing)', () => {
    expect(codes(shot('sotd-07'), map('sotd-22'))).toContain('rail_count');
  });

  it('catches tip words that disagree with the stroke', () => {
    const c = codes({ ...shot('sotd-02'), tipZone: '12-high' } as ConsistencyShot, map('sotd-02'));
    expect(c).toContain('tip_zone');
    expect(c).toContain('stroke');
    const m = map('sotd-02');
    m.english = { ...m.english!, follow: 0.6 };
    expect(codes(shot('sotd-02'), m)).toContain('tip_english');
  });

  it('requires short one-sentence what/why', () => {
    const c = checkShotTextConsistency(
      { ...shot('sotd-02'), what: 'Pot it. Then stop.', why: '' } as ConsistencyShot,
      map('sotd-02'),
    ).issues.map((i) => i.message);
    expect(c.some((msg) => /what/.test(msg))).toBe(true);
    expect(c.some((msg) => /why/.test(msg))).toBe(true);
  });
});
