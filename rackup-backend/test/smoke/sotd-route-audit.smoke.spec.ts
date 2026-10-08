/**
 * SOTD route physics audit — every catalogue route must be something a real ball can do.
 * Run: npm run test:smoke
 */
import { getSotdMapById, listSotdMaps } from '../../src/realai/v2/sotd-shot-maps';
import {
  ROUTE_AUDIT_EXEMPT,
  auditSotdRoute,
  formatRouteAudit,
  impliedSpin,
  type SotdRouteMap,
} from '../../src/realai/v2/sotd-route-audit';

const codes = (m: SotdRouteMap) =>
  auditSotdRoute(m)
    .issues.filter((i) => i.severity === 'fail')
    .map((i) => i.code);

describe('SOTD route physics audit', () => {
  it('every catalogue route passes (no impossible contacts, bounces or CB finishes)', () => {
    const failing = listSotdMaps()
      .map((m) => auditSotdRoute(m))
      .filter((r) => r.status === 'fail')
      .map(formatRouteAudit);
    expect(failing).toEqual([]);
  });

  it('has no audit exemptions (sotd-15 and sotd-25 are physical now)', () => {
    expect(Object.keys(ROUTE_AUDIT_EXEMPT)).toEqual([]);
    for (const id of ['sotd-15', 'sotd-25']) {
      expect(auditSotdRoute(getSotdMapById(id)!).status).toBe('pass');
    }
  });

  it('sotd-44 Around-the-World tours three cushions with mirror bounces into a hanging ball', () => {
    const m = getSotdMapById('sotd-44')!;
    const r = auditSotdRoute(m);
    expect(r.status).toBe('pass');
    expect(r.cutDeg!).toBeGreaterThan(10);
    expect(r.cutDeg!).toBeLessThan(45);
    const pts = m.intended_path.map((s) => s.from);
    const rails = pts.slice(1).filter((p) => p.x <= 0.01 || p.x >= 99.99 || p.y <= 0.01 || p.y >= 49.99);
    expect(rails.length).toBeGreaterThanOrEqual(3);
    // the tour comes back past the head spot (25, 25) before the hanger
    const last = m.intended_path[m.intended_path.length - 2];
    const hs = { x: 25, y: 25 };
    const ab = { x: last.to.x - last.from.x, y: last.to.y - last.from.y };
    const t = ((hs.x - last.from.x) * ab.x + (hs.y - last.from.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y);
    const near = { x: last.from.x + ab.x * t, y: last.from.y + ab.y * t };
    expect(Math.hypot(near.x - hs.x, near.y - hs.y)).toBeLessThan(5);
  });

  it('flags the old Around-the-World route: CB hit the 1 from the pocket side', () => {
    const old: SotdRouteMap = {
      ...getSotdMapById('sotd-44')!,
      pocket_target: { x: 100, y: 50 },
      object_ball_positions: [{ ballId: 1, x: 72, y: 36, role: 'object' }],
      intended_path: [
        { from: { x: 20, y: 12 }, to: { x: 37.1, y: 0 } },
        { from: { x: 37.1, y: 0 }, to: { x: 100, y: 44.3 } },
        { from: { x: 100, y: 44.3 }, to: { x: 91.9, y: 50 } },
        { from: { x: 91.9, y: 50 }, to: { x: 72, y: 36 } },
        { from: { x: 72, y: 36 }, to: { x: 100, y: 50 } },
      ],
      landing_zones: [{ x: 84.7, y: 41.9, label: 'cb_rest' }],
    };
    expect(codes(old)).toContain('contact_side');
  });

  it('flags a cushion contact inside a side-pocket mouth', () => {
    const base = getSotdMapById('sotd-17')!;
    const bad: SotdRouteMap = {
      ...base,
      intended_path: [
        { from: base.cue_ball_start, to: { x: 49.1, y: 0 } },
        { from: { x: 49.1, y: 0 }, to: base.object_ball_positions[0] },
        { from: base.object_ball_positions[0], to: base.pocket_target },
      ],
    };
    const c = codes(bad);
    expect(c).toContain('rail_in_pocket');
  });

  it('flags a bent bounce that is not a mirror reflection', () => {
    const base = getSotdMapById('sotd-17')!;
    const rail = base.intended_path[0].to;
    const bad: SotdRouteMap = {
      ...base,
      intended_path: [
        { from: base.cue_ball_start, to: { x: rail.x - 12, y: 0 } },
        ...base.intended_path.slice(1).map((s, i) => (i === 0 ? { ...s, from: { x: rail.x - 12, y: 0 } } : s)),
      ],
    };
    expect(codes(bad)).toContain('bad_reflection');
  });

  it('flags a stun cut whose cue ball runs back along the object line', () => {
    const base = getSotdMapById('sotd-38')!;
    const ob = base.object_ball_positions[0];
    const pk = base.pocket_target;
    const u = { x: pk.x - ob.x, y: pk.y - ob.y };
    const n = Math.hypot(u.x, u.y);
    const back = { x: ob.x - (u.x / n) * 6, y: ob.y - (u.y / n) * 6 };
    const bad: SotdRouteMap = { ...base, landing_zones: [{ ...back, label: 'cb_rest' }] };
    expect(codes(bad)).toContain('cb_after');
  });

  it('natural roll on a half-ball hit bends the CB about 34° (30° rule)', () => {
    const a = { x: 1, y: 0 };
    const cut = 30;
    const u = { x: Math.cos((cut * Math.PI) / 180), y: Math.sin((cut * Math.PI) / 180) };
    const dev = (-34 * Math.PI) / 180;
    const rd = { x: Math.cos(dev), y: Math.sin(dev) };
    expect(impliedSpin(a, u, rd, cut)!).toBeCloseTo(1, 0);
  });
});
