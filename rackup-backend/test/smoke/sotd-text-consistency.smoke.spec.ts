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

  it('catches the wrong first-contact ball (sotd-09 drawn hitting the 9 first)', () => {
    const m = map('sotd-09');
    m.object_ball_positions.forEach((b) => (b.ballId = b.ballId === 1 ? 9 : 1));
    m.extra_object_paths = [];
    expect(codes(shot('sotd-09'), m)).toContain('first_contact');
  });

  it('catches the wrong pocket (side-pocket text drawn into a corner)', () => {
    const m = map('sotd-26');
    m.pocket_target = { x: 100, y: 0 };
    m.intended_path[m.intended_path.length - 1].to = { x: 100, y: 0 };
    expect(codes(shot('sotd-26'), m)).toContain('pocket');
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
