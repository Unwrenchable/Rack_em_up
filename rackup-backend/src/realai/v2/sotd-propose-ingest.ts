/**
 * RealAI → RackUp SOTD propose ingest (contract 1.0).
 *
 * Source of truth: Unwrenchable/RealAi
 *   docs/external_contracts/RACKUP_SOTD_NEW_ENTRY_SCHEMA.md
 *   (live/realai-clean-20260911)
 *
 * Batch-1 path for roc:
 *   1. Receive a SotdProposeEnvelope JSON from orch / RealAI (do not fetch geometry).
 *   2. applySotdProposeEnvelope(raw, { maps: SOTD_SHOT_MAPS, catalog: SHOT_CATALOG }).
 *   3. On ok: paste `map` into SOTD_SHOT_MAPS (replace by id, else append) and
 *      `catalog` into SHOT_CATALOG (same id). Draw stays local — never pull
 *      SOTD geometry from RealAI at request time.
 *   4. CLI dry-run: npx ts-node -T scripts/merge-sotd-envelope.ts envelope.json
 *
 * HTTP POST /api/v1/realai/v2/sotd/propose (JWT) is a validate + merge *preview*.
 * It does not write the catalogue files.
 */

import type { CatalogShot, ShotCategory, ShotDifficulty, StrokeSpeed, TipZone } from '../../shots/shot-catalog';
import { validateSotdShotMap } from './sotd-shot-map-geometry';
import type {
  SotdGhostBall,
  SotdMapSource,
  SotdObjectBall,
  SotdPathSegment,
  SotdPoint,
  SotdShotMap,
} from './sotd-shot-maps';

export const SOTD_PROPOSE_SCHEMA_VERSION = '1.0' as const;

/** Envelope `map.source` pair; roc maps `catalog_fallback` → Nest `"catalogue"`. */
export type SotdIngestSource = 'realai' | 'catalog_fallback';

/** Contract pin (Ghost Ball spec). SPA already derives with this offset; ingest does not draw. */
export const GHOST_BALL_OFFSET_DIAMETER = 4.4;

export type SotdValidationFlag = {
  code: string;
  pass: boolean;
  message?: string;
};

export type SotdValidation = {
  ok: boolean;
  flags: Array<SotdValidationFlag | string>;
};

/** Envelope `map.source` before Nest mapping. */
export type SotdProposeMapSource = SotdMapSource | SotdIngestSource;

export type SotdProposeMap = Omit<SotdShotMap, 'source' | 'ascii_table'> & {
  source: SotdProposeMapSource;
  ascii_table?: string;
  ghost_ball?: SotdGhostBall;
  contact_point?: SotdPoint;
};

export type SotdProposeEnvelope = {
  schema_version: typeof SOTD_PROPOSE_SCHEMA_VERSION;
  map: SotdProposeMap;
  catalog: CatalogShot;
  validation: SotdValidation;
};

export type SotdProposeRejectReason =
  | 'invalid_envelope'
  | 'bad_schema_version'
  | 'id_mismatch'
  | 'validation_failed'
  | 'invalid_map'
  | 'invalid_catalog'
  | 'tip_zone_mismatch'
  | 'field_mismatch'
  | 'bad_source';

export type SotdProposeReject = {
  ok: false;
  reason: SotdProposeRejectReason;
  message: string;
  details?: string[];
};

export type SotdProposeAccept = {
  ok: true;
  action: 'insert' | 'replace';
  map: SotdShotMap;
  catalog: CatalogShot;
  maps: SotdShotMap[];
  catalogList: CatalogShot[];
  /** Local geometry report — informational; envelope.validation.ok is the ingest gate. */
  localGeometry: { ok: boolean; issues: Array<{ code: string; message?: string }> };
};

export type SotdProposeExisting = {
  maps: readonly SotdShotMap[];
  catalog: readonly CatalogShot[];
};

const TIP_ZONES: readonly TipZone[] = [
  'center',
  '12-high',
  '6-low',
  '3-right',
  '9-left',
  '1:30-high-right',
  '10:30-high-left',
  '4:30-low-right',
  '7:30-low-left',
];

const DIFFICULTIES: readonly ShotDifficulty[] = ['Easy', 'Medium', 'Hard', 'Insane'];

const CATEGORIES: readonly ShotCategory[] = [
  'bank',
  'combo',
  'curve',
  'jump',
  'masse',
  'kick',
  'carom',
  'novelty',
  'position',
];

const SPEEDS: readonly StrokeSpeed[] = ['feather', 'soft', 'medium', 'firm', 'power'];

const CATALOG_KEYS: readonly (keyof CatalogShot)[] = [
  'id',
  'name',
  'tagline',
  'difficulty',
  'category',
  'table',
  'setup',
  'objectBall',
  'pocket',
  'tipZone',
  'tipDetail',
  'english',
  'elevation',
  'speed',
  'speedDetail',
  'bridge',
  'steps',
  'tips',
  'commonMistakes',
  'successLooksLike',
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPoint(v: unknown): v is SotdPoint {
  return isRecord(v) && isFiniteNumber(v.x) && isFiniteNumber(v.y);
}

function reject(reason: SotdProposeRejectReason, message: string, details?: string[]): SotdProposeReject {
  return details?.length ? { ok: false, reason, message, details } : { ok: false, reason, message };
}

function nestSource(source: unknown): SotdMapSource | null {
  if (source === 'realai') return 'realai';
  if (source === 'catalog_fallback' || source === 'catalogue') return 'catalogue';
  return null;
}

function parseGhostBall(raw: unknown, details: string[]): SotdGhostBall | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) {
    details.push('map.ghost_ball must be { x, y, radius?, show? }');
    return undefined;
  }
  const g: SotdGhostBall = { x: raw.x, y: raw.y };
  if (raw.radius !== undefined) {
    if (!isFiniteNumber(raw.radius)) details.push('map.ghost_ball.radius must be a finite number');
    else g.radius = raw.radius;
  }
  if (raw.show !== undefined) {
    if (typeof raw.show !== 'boolean') details.push('map.ghost_ball.show must be a boolean');
    else g.show = raw.show;
  }
  return g;
}

function parseObjectBall(raw: unknown, i: number, details: string[]): SotdObjectBall | null {
  if (!isRecord(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y) || !isFiniteNumber(raw.ballId)) {
    details.push(`map.object_ball_positions[${i}] must include ballId, x, y`);
    return null;
  }
  const ball: SotdObjectBall = { ballId: raw.ballId, x: raw.x, y: raw.y };
  if (typeof raw.role === 'string') {
    ball.role = raw.role as SotdObjectBall['role'];
  }
  return ball;
}

function parsePathSegment(raw: unknown, i: number, details: string[]): SotdPathSegment | null {
  if (!isRecord(raw) || !isPoint(raw.from) || !isPoint(raw.to)) {
    details.push(`map.intended_path[${i}] must include from/to points`);
    return null;
  }
  const seg: SotdPathSegment = { from: { x: raw.from.x, y: raw.from.y }, to: { x: raw.to.x, y: raw.to.y } };
  if (raw.style === 'solid' || raw.style === 'dashed') seg.style = raw.style;
  if (raw.kind === 'ground' || raw.kind === 'airborne' || raw.kind === 'object' || raw.kind === 'cue_after') {
    seg.kind = raw.kind;
  }
  return seg;
}

function parseStringArray(raw: unknown, field: string, details: string[]): string[] | null {
  if (!Array.isArray(raw) || raw.some((x) => typeof x !== 'string')) {
    details.push(`catalog.${field} must be a string[]`);
    return null;
  }
  return raw as string[];
}

/**
 * Structural + contract checks. Rejects bad schema_version, id mismatch,
 * and validation.ok === false. Does not call RealAI.
 */
export function validateSotdProposeEnvelope(raw: unknown): SotdProposeReject | { ok: true; envelope: SotdProposeEnvelope } {
  if (!isRecord(raw)) {
    return reject('invalid_envelope', 'Envelope must be a JSON object');
  }
  if (raw.schema_version !== SOTD_PROPOSE_SCHEMA_VERSION) {
    return reject(
      'bad_schema_version',
      `schema_version must be "${SOTD_PROPOSE_SCHEMA_VERSION}"`,
    );
  }
  if (!isRecord(raw.map) || !isRecord(raw.catalog) || !isRecord(raw.validation)) {
    return reject('invalid_envelope', 'Envelope requires map, catalog, and validation objects');
  }
  if (raw.validation.ok !== true) {
    return reject('validation_failed', 'validation.ok must be true to merge');
  }

  const details: string[] = [];
  const mapRaw = raw.map;
  const catRaw = raw.catalog;

  if (typeof mapRaw.id !== 'string' || !mapRaw.id.trim()) details.push('map.id is required');
  if (typeof catRaw.id !== 'string' || !catRaw.id.trim()) details.push('catalog.id is required');
  if (typeof mapRaw.id === 'string' && typeof catRaw.id === 'string' && mapRaw.id !== catRaw.id) {
    return reject('id_mismatch', `catalog.id (${catRaw.id}) must equal map.id (${mapRaw.id})`);
  }

  const source = nestSource(mapRaw.source);
  if (!source) {
    return reject('bad_source', 'map.source must be "realai" or "catalog_fallback" (or Nest "catalogue")');
  }

  if (typeof mapRaw.name !== 'string' || !mapRaw.name.trim()) details.push('map.name is required');
  if (typeof mapRaw.difficulty !== 'string') details.push('map.difficulty is required');
  if (!isFiniteNumber(mapRaw.difficulty_rating)) details.push('map.difficulty_rating must be a number');
  if (typeof mapRaw.category !== 'string') details.push('map.category is required');
  if (typeof mapRaw.speed_category !== 'string') details.push('map.speed_category is required');
  if (typeof mapRaw.tip_zone !== 'string') details.push('map.tip_zone is required');
  if (!isPoint(mapRaw.cue_ball_start)) details.push('map.cue_ball_start must be { x, y }');
  if (!isPoint(mapRaw.pocket_target)) details.push('map.pocket_target must be { x, y }');
  if (!isRecord(mapRaw.coordinate_system)) details.push('map.coordinate_system is required');
  if (!isRecord(mapRaw.english)) details.push('map.english is required');

  const ballsIn = Array.isArray(mapRaw.object_ball_positions) ? mapRaw.object_ball_positions : null;
  if (!ballsIn) details.push('map.object_ball_positions must be an array');
  const pathIn = Array.isArray(mapRaw.intended_path) ? mapRaw.intended_path : null;
  if (!pathIn) details.push('map.intended_path must be an array');
  const zonesIn = Array.isArray(mapRaw.landing_zones) ? mapRaw.landing_zones : null;
  if (!zonesIn) details.push('map.landing_zones must be an array');

  const object_ball_positions: SotdObjectBall[] = [];
  if (ballsIn) {
    ballsIn.forEach((b, i) => {
      const parsed = parseObjectBall(b, i, details);
      if (parsed) object_ball_positions.push(parsed);
    });
  }
  const intended_path: SotdPathSegment[] = [];
  if (pathIn) {
    pathIn.forEach((s, i) => {
      const parsed = parsePathSegment(s, i, details);
      if (parsed) intended_path.push(parsed);
    });
  }
  const landing_zones: SotdShotMap['landing_zones'] = [];
  if (zonesIn) {
    zonesIn.forEach((z, i) => {
      if (!isRecord(z) || !isFiniteNumber(z.x) || !isFiniteNumber(z.y) || typeof z.label !== 'string') {
        details.push(`map.landing_zones[${i}] must be { x, y, label }`);
        return;
      }
      landing_zones.push({ x: z.x, y: z.y, label: z.label });
    });
  }

  const englishRaw = isRecord(mapRaw.english) ? mapRaw.english : {};
  if (typeof englishRaw.tip_zone !== 'string') details.push('map.english.tip_zone is required');
  if (!isFiniteNumber(englishRaw.sidespin)) details.push('map.english.sidespin must be a number');
  if (!isFiniteNumber(englishRaw.backspin)) details.push('map.english.backspin must be a number');
  if (!isFiniteNumber(englishRaw.follow)) details.push('map.english.follow must be a number');
  if (typeof englishRaw.label !== 'string') details.push('map.english.label is required');

  const coord = isRecord(mapRaw.coordinate_system) ? mapRaw.coordinate_system : {};
  if (typeof coord.x !== 'string' || typeof coord.y !== 'string' || typeof coord.units !== 'string') {
    details.push('map.coordinate_system needs x, y, units strings');
  }

  const ghost_ball = parseGhostBall(mapRaw.ghost_ball, details);
  let contact_point: SotdPoint | undefined;
  if (mapRaw.contact_point !== undefined) {
    if (!isPoint(mapRaw.contact_point)) details.push('map.contact_point must be { x, y }');
    else contact_point = { x: mapRaw.contact_point.x, y: mapRaw.contact_point.y };
  }
  if (mapRaw.ascii_table !== undefined && typeof mapRaw.ascii_table !== 'string') {
    details.push('map.ascii_table must be a string when present');
  }

  const catDetails: string[] = [];
  for (const key of CATALOG_KEYS) {
    if (catRaw[key] === undefined || catRaw[key] === null) {
      catDetails.push(`catalog.${key} is required`);
    }
  }
  const setup = parseStringArray(catRaw.setup, 'setup', catDetails);
  const steps = parseStringArray(catRaw.steps, 'steps', catDetails);
  const tips = parseStringArray(catRaw.tips, 'tips', catDetails);
  const mistakes = parseStringArray(catRaw.commonMistakes, 'commonMistakes', catDetails);

  if (typeof catRaw.difficulty === 'string' && !DIFFICULTIES.includes(catRaw.difficulty as ShotDifficulty)) {
    catDetails.push(`catalog.difficulty must be one of ${DIFFICULTIES.join(', ')}`);
  }
  if (typeof catRaw.category === 'string' && !CATEGORIES.includes(catRaw.category as ShotCategory)) {
    catDetails.push(`catalog.category must be one of ${CATEGORIES.join(', ')}`);
  }
  if (typeof catRaw.tipZone === 'string' && !TIP_ZONES.includes(catRaw.tipZone as TipZone)) {
    catDetails.push(`catalog.tipZone must be a clock-face TipZone`);
  }
  if (typeof catRaw.speed === 'string' && !SPEEDS.includes(catRaw.speed as StrokeSpeed)) {
    catDetails.push(`catalog.speed must be one of ${SPEEDS.join(', ')}`);
  }

  if (typeof mapRaw.tip_zone === 'string' && typeof catRaw.tipZone === 'string' && mapRaw.tip_zone !== catRaw.tipZone) {
    return reject('tip_zone_mismatch', `catalog.tipZone (${catRaw.tipZone}) must equal map.tip_zone (${mapRaw.tip_zone})`);
  }
  if (typeof mapRaw.difficulty === 'string' && typeof catRaw.difficulty === 'string' && mapRaw.difficulty !== catRaw.difficulty) {
    return reject('field_mismatch', `catalog.difficulty must equal map.difficulty`);
  }
  if (typeof mapRaw.category === 'string' && typeof catRaw.category === 'string' && mapRaw.category !== catRaw.category) {
    return reject('field_mismatch', `catalog.category must equal map.category`);
  }
  if (
    typeof mapRaw.speed_category === 'string' &&
    typeof catRaw.speed === 'string' &&
    mapRaw.speed_category !== catRaw.speed
  ) {
    return reject('field_mismatch', `catalog.speed must agree with map.speed_category`);
  }

  if (details.length) return reject('invalid_map', 'map failed contract checks', details);
  if (catDetails.length) return reject('invalid_catalog', 'catalog failed contract checks', catDetails);

  const flags = Array.isArray(raw.validation.flags) ? raw.validation.flags : [];

  const map: SotdProposeMap = {
    id: mapRaw.id as string,
    name: mapRaw.name as string,
    difficulty: mapRaw.difficulty as string,
    difficulty_rating: mapRaw.difficulty_rating as number,
    category: mapRaw.category as string,
    speed_category: mapRaw.speed_category as string,
    tip_zone: mapRaw.tip_zone as string,
    cue_ball_start: { x: (mapRaw.cue_ball_start as SotdPoint).x, y: (mapRaw.cue_ball_start as SotdPoint).y },
    object_ball_positions,
    intended_path,
    english: {
      tip_zone: englishRaw.tip_zone as string,
      sidespin: englishRaw.sidespin as number,
      backspin: englishRaw.backspin as number,
      follow: englishRaw.follow as number,
      label: englishRaw.label as string,
    },
    landing_zones,
    pocket_target: { x: (mapRaw.pocket_target as SotdPoint).x, y: (mapRaw.pocket_target as SotdPoint).y },
    coordinate_system: {
      x: coord.x as string,
      y: coord.y as string,
      units: coord.units as string,
    },
    source: mapRaw.source as SotdProposeMapSource,
    ascii_table: typeof mapRaw.ascii_table === 'string' ? mapRaw.ascii_table : undefined,
    ghost_ball,
    contact_point,
  };

  const catalog: CatalogShot = {
    id: catRaw.id as string,
    name: catRaw.name as string,
    tagline: catRaw.tagline as string,
    difficulty: catRaw.difficulty as ShotDifficulty,
    category: catRaw.category as ShotCategory,
    table: catRaw.table as string,
    setup: setup ?? [],
    objectBall: catRaw.objectBall as string,
    pocket: catRaw.pocket as string,
    tipZone: catRaw.tipZone as TipZone,
    tipDetail: catRaw.tipDetail as string,
    english: catRaw.english as string,
    elevation: catRaw.elevation as string,
    speed: catRaw.speed as StrokeSpeed,
    speedDetail: catRaw.speedDetail as string,
    bridge: catRaw.bridge as string,
    steps: steps ?? [],
    tips: tips ?? [],
    commonMistakes: mistakes ?? [],
    successLooksLike: catRaw.successLooksLike as string,
  };

  return {
    ok: true,
    envelope: {
      schema_version: SOTD_PROPOSE_SCHEMA_VERSION,
      map,
      catalog,
      validation: { ok: true, flags },
    },
  };
}

export function toNestSotdShotMap(map: SotdProposeMap, existing?: SotdShotMap): SotdShotMap {
  const source = nestSource(map.source) ?? 'catalogue';
  const nest: SotdShotMap = {
    id: map.id,
    name: map.name,
    difficulty: map.difficulty,
    difficulty_rating: map.difficulty_rating,
    category: map.category,
    speed_category: map.speed_category,
    tip_zone: map.tip_zone,
    cue_ball_start: map.cue_ball_start,
    object_ball_positions: map.object_ball_positions,
    intended_path: map.intended_path,
    english: map.english,
    landing_zones: map.landing_zones,
    pocket_target: map.pocket_target,
    coordinate_system: map.coordinate_system,
    source,
    ascii_table: map.ascii_table ?? existing?.ascii_table ?? '',
  };
  if (map.ghost_ball) nest.ghost_ball = map.ghost_ball;
  if (map.contact_point) nest.contact_point = map.contact_point;
  return nest;
}

/**
 * Merge a validated envelope into copies of the live map + catalog arrays.
 * Replace-by-id when the shot already exists; otherwise append (batch 1 insert).
 */
export function mergeSotdProposeEnvelope(
  envelope: SotdProposeEnvelope,
  existing: SotdProposeExisting,
): SotdProposeAccept {
  const prevMap = existing.maps.find((m) => m.id === envelope.map.id);
  const map = toNestSotdShotMap(envelope.map, prevMap);
  const catalog = { ...envelope.catalog };

  const maps = existing.maps.map((m) => (m.id === map.id ? map : m));
  if (!prevMap) maps.push(map);

  const prevCat = existing.catalog.some((c) => c.id === catalog.id);
  const catalogList = existing.catalog.map((c) => (c.id === catalog.id ? catalog : c));
  if (!prevCat) catalogList.push(catalog);

  const geom = validateSotdShotMap(map);
  return {
    ok: true,
    action: prevMap || prevCat ? 'replace' : 'insert',
    map,
    catalog,
    maps,
    catalogList,
    localGeometry: {
      ok: geom.ok,
      issues: geom.issues.map((i) => ({ code: i.code, message: i.message })),
    },
  };
}

/** Validate then merge. Primary ingest entry for CLI / HTTP preview / tests. */
export function applySotdProposeEnvelope(
  raw: unknown,
  existing: SotdProposeExisting,
): SotdProposeReject | SotdProposeAccept {
  const parsed = validateSotdProposeEnvelope(raw);
  if (!('envelope' in parsed)) return parsed;
  return mergeSotdProposeEnvelope(parsed.envelope, existing);
}

export const SOTD_PROPOSE_APPLY_HELP =
  'On accept: copy `map` into rackup-backend/src/realai/v2/sotd-shot-maps.ts (SOTD_SHOT_MAPS) and `catalog` into rackup-backend/src/shots/shot-catalog.ts (SHOT_CATALOG). Catalogue draw stays local.';
