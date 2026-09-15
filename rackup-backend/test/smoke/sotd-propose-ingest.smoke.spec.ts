/**
 * SotdProposeEnvelope validate + merge — RealAI contract 1.0.
 * Pure TS; no HTTP, no RealAI fetch.
 */
import { getShotById, SHOT_CATALOG } from '../../src/shots/shot-catalog';
import {
  applySotdProposeEnvelope,
  GHOST_BALL_OFFSET_DIAMETER,
  SOTD_PROPOSE_SCHEMA_VERSION,
  validateSotdProposeEnvelope,
  type SotdProposeReject,
} from '../../src/realai/v2/sotd-propose-ingest';
import { getSotdMapById, SOTD_SHOT_MAPS, sotdMapCount } from '../../src/realai/v2/sotd-shot-maps';

function expectReject(result: { ok: boolean }, reason: SotdProposeReject['reason']) {
  expect(result.ok).toBe(false);
  expect((result as SotdProposeReject).reason).toBe(reason);
}

function liveEnvelope(id: string, extras?: Record<string, unknown>) {
  const map = getSotdMapById(id);
  const catalog = getShotById(id);
  if (!map || !catalog) throw new Error(`missing live ${id}`);
  return {
    schema_version: SOTD_PROPOSE_SCHEMA_VERSION,
    map: {
      ...map,
      source: 'catalog_fallback',
      ghost_ball: { x: 50, y: 16.4, show: true },
      contact_point: { x: 50, y: 14.2 },
      ...extras,
    },
    catalog: { ...catalog },
    validation: { ok: true, flags: [] },
  };
}

describe('SOTD propose ingest (RealAI envelope 1.0)', () => {
  it('pins Ghost Ball offset diameter at 4.4', () => {
    expect(GHOST_BALL_OFFSET_DIAMETER).toBe(4.4);
  });

  it('derives ghost center as OB minus normalize(aim − OB) × 4.4', () => {
    const ob = { x: 50, y: 12 };
    const pocket = { x: 50, y: 0 };
    const dx = pocket.x - ob.x;
    const dy = pocket.y - ob.y;
    const len = Math.hypot(dx, dy) || 1;
    const ghost = {
      x: ob.x - (dx / len) * GHOST_BALL_OFFSET_DIAMETER,
      y: ob.y - (dy / len) * GHOST_BALL_OFFSET_DIAMETER,
    };
    expect(ghost.x).toBeCloseTo(50, 5);
    expect(ghost.y).toBeCloseTo(16.4, 5);
  });

  it('rejects a bad schema_version', () => {
    const raw = liveEnvelope('sotd-26');
    const bad = applySotdProposeEnvelope({ ...raw, schema_version: '0.9' }, {
      maps: SOTD_SHOT_MAPS,
      catalog: SHOT_CATALOG,
    });
    expectReject(bad, 'bad_schema_version');
  });

  it('rejects catalog.id !== map.id', () => {
    const raw = liveEnvelope('sotd-26');
    raw.catalog.id = 'sotd-01';
    expectReject(
      applySotdProposeEnvelope(raw, { maps: SOTD_SHOT_MAPS, catalog: SHOT_CATALOG }),
      'id_mismatch',
    );
  });

  it('rejects validation.ok=false', () => {
    const raw = liveEnvelope('sotd-26');
    raw.validation = { ok: false, flags: ['jump_zigzag'] };
    expectReject(
      applySotdProposeEnvelope(raw, { maps: SOTD_SHOT_MAPS, catalog: SHOT_CATALOG }),
      'validation_failed',
    );
  });

  it('rejects tipZone / tip_zone mismatch', () => {
    const raw = liveEnvelope('sotd-26');
    raw.catalog.tipZone = '6-low';
    expectReject(
      applySotdProposeEnvelope(raw, { maps: SOTD_SHOT_MAPS, catalog: SHOT_CATALOG }),
      'tip_zone_mismatch',
    );
  });

  it('merges an envelope into map+catalog (replace) and keeps ghost overrides', () => {
    const raw = liveEnvelope('sotd-26');
    const result = applySotdProposeEnvelope(raw, {
      maps: SOTD_SHOT_MAPS,
      catalog: SHOT_CATALOG,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe('replace');
    expect(result.map.source).toBe('catalogue');
    expect(result.map.ghost_ball).toEqual({ x: 50, y: 16.4, show: true });
    expect(result.map.contact_point).toEqual({ x: 50, y: 14.2 });
    expect(result.catalog.id).toBe('sotd-26');
    expect(result.maps).toHaveLength(sotdMapCount());
    expect(result.catalogList).toHaveLength(SHOT_CATALOG.length);
    expect(SOTD_SHOT_MAPS.find((m) => m.id === 'sotd-26')?.ghost_ball).toBeUndefined();
    const merged = result.maps.find((m) => m.id === 'sotd-26');
    expect(merged?.ghost_ball?.show).toBe(true);
  });

  it('inserts a new id without mutating live SOTD_SHOT_MAPS', () => {
    const raw = liveEnvelope('sotd-26');
    raw.map.id = 'sotd-99-test';
    raw.catalog.id = 'sotd-99-test';
    raw.map.name = 'Ghost Cut Fixture';
    raw.catalog.name = 'Ghost Cut Fixture';
    raw.map.source = 'realai';
    const result = applySotdProposeEnvelope(raw, {
      maps: SOTD_SHOT_MAPS,
      catalog: SHOT_CATALOG,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe('insert');
    expect(result.map.source).toBe('realai');
    expect(result.maps).toHaveLength(sotdMapCount() + 1);
    expect(result.catalogList).toHaveLength(SHOT_CATALOG.length + 1);
    expect(getSotdMapById('sotd-99-test')).toBeUndefined();
    expect(getShotById('sotd-99-test')).toBeUndefined();
  });

  it('accepts the contract example shape (parse only)', () => {
    const parsed = validateSotdProposeEnvelope(liveEnvelope('sotd-02'));
    expect(parsed.ok).toBe(true);
  });
});
