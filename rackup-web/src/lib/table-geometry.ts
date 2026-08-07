/**
 * Instructor-grade pool table geometry for SOTD / Pyramid diagrams.
 *
 * Coordinate system (cloth / playing surface — cushion nose to cushion nose):
 *   x: 0 = head rail → length = foot rail
 *   y: 0 = near long rail → width = far long rail
 *
 * Shot maps use a **normalized** cloth plane L=100, S=50 (always 2:1).
 * Physical 7-ft vs 9-ft differences scale rails, diamonds, pockets, balls,
 * and the on-screen display width — not the shot coordinate space.
 *
 * Diamonds (WPA-style): 8 equal segments along long rails (side pocket at 4/8),
 * 4 equal segments along short rails. Spacing = playing_length / 8.
 */

export type TableSize = '7ft' | '9ft';

export type Pt = { x: number; y: number };

/** Playing surface size in diagram units (always 2:1 aspect). */
export type PlayingSurface = {
  length: number;
  width: number;
};

/**
 * Real playing-surface measurements (inches, cushion nose → cushion nose).
 * Diamonds / rails are derived from these.
 */
export const PHYSICAL_IN: Record<
  TableSize,
  {
    /** Cloth length (long) */
    length: number;
    /** Cloth width (short) */
    width: number;
    ballDia: number;
    /**
     * Diamond spacing on long rails (inches).
     * 9ft official ≈ 12.5"; 7ft scales with cloth length/8.
     */
    diamondSpacingLong: number;
    /** Diamond spacing on short rails = width/4 */
    diamondSpacingShort: number;
    /**
     * Diamond centerline distance from cushion nose into the rail wood.
     * ~3-11/16" (3.6875") on full-size tables; scales with table.
     */
    diamondFromNose: number;
    /** Visible rail band thickness (wood outside cloth), inches */
    railWidth: number;
  }
> = {
  '9ft': {
    length: 100,
    width: 50,
    ballDia: 2.25,
    diamondSpacingLong: 12.5, // 100/8
    diamondSpacingShort: 12.5, // 50/4
    diamondFromNose: 3.6875, // 3-11/16"
    railWidth: 5.5,
  },
  '7ft': {
    // Typical barbox playing surface ~39" × 78" (range 38–40 × 76–80)
    length: 78,
    width: 39,
    ballDia: 2.25,
    diamondSpacingLong: 78 / 8, // 9.75"
    diamondSpacingShort: 39 / 4, // 9.75"
    // Scale nose offset with table: 3.6875 * (78/100)
    diamondFromNose: 3.6875 * (78 / 100),
    railWidth: 5.5 * (78 / 100),
  },
};

/**
 * Diagram cloth always 100 × 50 so API shot maps (normalized plane) stay aligned.
 * Physical inches map via inches→cloth factor = 100 / physical.length.
 */
export const CLOTH: PlayingSurface = { length: 100, width: 50 };

/** Convert physical inches → normalized cloth units for a table size. */
export function inchesToCloth(size: TableSize, inches: number): number {
  return (inches / PHYSICAL_IN[size].length) * CLOTH.length;
}

export type PocketId =
  | 'head-near'
  | 'head-far'
  | 'side-near'
  | 'side-far'
  | 'foot-near'
  | 'foot-far';

export type PocketKind = 'corner' | 'side';

export type PocketSpec = {
  id: PocketId;
  kind: PocketKind;
  center: Pt;
  mouthWidth: number;
  jawAngleDeg: number;
  shelfDepth: number;
  mouthPolygon: Pt[];
};

export type TableGeometry = {
  size: TableSize;
  cloth: PlayingSurface;
  /** Physical reference inches for this size */
  physical: (typeof PHYSICAL_IN)[TableSize];
  L: number;
  S: number;
  pocketCenters: Record<PocketId, Pt>;
  pockets: PocketSpec[];
  diamonds: {
    longNear: Pt[];
    longFar: Pt[];
    shortHead: Pt[];
    shortFoot: Pt[];
  };
  /**
   * Diamond offset from cloth edge into the rail (cloth units),
   * from real ~3-11/16" cushion-nose offset.
   */
  diamondRailInset: number;
  ballRadius: number;
  railThickness: number;
  /**
   * CSS max-width hint so 7ft draws smaller than 9ft at the same viewport
   * while keeping 2:1 aspect (9ft = 1.0, 7ft ≈ 0.78).
   */
  displayScale: number;
  headStringX: number;
  footSpot: Pt;
};

/**
 * Long-rail diamonds: 8 equal segments corner→corner; no mark on side pocket (4/8).
 * Fractions of L: 1/8, 2/8, 3/8, 5/8, 6/8, 7/8
 * (9ft: 12.5" spacing; 7ft: ~9.75" spacing)
 */
export const LONG_DIAMOND_FRACS = [1 / 8, 2 / 8, 3 / 8, 5 / 8, 6 / 8, 7 / 8] as const;

/**
 * Short-rail diamonds: 4 equal segments corner→corner.
 * Fractions of S: 1/4, 2/4, 3/4
 */
export const SHORT_DIAMOND_FRACS = [1 / 4, 2 / 4, 3 / 4] as const;

/** 18 sights: 6+6 long + 3+3 short (corners are pockets, not diamond marks). */
export const DIAMOND_SIGHT_COUNT =
  LONG_DIAMOND_FRACS.length * 2 + SHORT_DIAMOND_FRACS.length * 2;

/**
 * Build full table geometry for a size.
 * Cloth plane stays 100×50; physical scale drives rails, diamonds, balls, display.
 */
export function buildTableGeometry(size: TableSize): TableGeometry {
  const cloth = CLOTH;
  const L = cloth.length;
  const S = cloth.width;
  const phys = PHYSICAL_IN[size];
  const scale = L / phys.length; // cloth units per physical inch

  const pocketCenters: Record<PocketId, Pt> = {
    'head-near': { x: 0, y: 0 },
    'head-far': { x: 0, y: S },
    'side-near': { x: L / 2, y: 0 },
    'side-far': { x: L / 2, y: S },
    'foot-near': { x: L, y: 0 },
    'foot-far': { x: L, y: S },
  };

  // Pocket mouths in cloth units — slightly larger fraction on 7ft (smaller cloth inches)
  const cornerMouthIn = size === '7ft' ? 4.0 : 4.5;
  const sideMouthIn = size === '7ft' ? 4.6 : 5.0;
  const cornerMouth = cornerMouthIn * scale;
  const sideMouth = sideMouthIn * scale;
  const cornerJaw = size === '7ft' ? 24 : 22;
  const sideJaw = size === '7ft' ? 14 : 12;
  const cornerShelf = (size === '7ft' ? 1.9 : 2.1) * scale;
  const sideShelf = (size === '7ft' ? 1.7 : 1.85) * scale;

  const pockets: PocketSpec[] = [
    makeCornerPocket('head-near', pocketCenters['head-near'], 'sw', cornerMouth, cornerJaw, cornerShelf),
    makeCornerPocket('head-far', pocketCenters['head-far'], 'nw', cornerMouth, cornerJaw, cornerShelf),
    makeCornerPocket('foot-near', pocketCenters['foot-near'], 'se', cornerMouth, cornerJaw, cornerShelf),
    makeCornerPocket('foot-far', pocketCenters['foot-far'], 'ne', cornerMouth, cornerJaw, cornerShelf),
    makeSidePocket('side-near', pocketCenters['side-near'], 's', sideMouth, sideJaw, sideShelf),
    makeSidePocket('side-far', pocketCenters['side-far'], 'n', sideMouth, sideJaw, sideShelf),
  ];

  // WPA-style diamond fractions of pocket-center spans L and S
  const longNear = LONG_DIAMOND_FRACS.map((f) => ({ x: L * f, y: 0 }));
  const longFar = LONG_DIAMOND_FRACS.map((f) => ({ x: L * f, y: S }));
  const shortHead = SHORT_DIAMOND_FRACS.map((f) => ({ x: 0, y: S * f }));
  const shortFoot = SHORT_DIAMOND_FRACS.map((f) => ({ x: L, y: S * f }));

  // Ball radius: physical diameter relative to cloth length (readable boost)
  const physicalR = (phys.ballDia / 2) * scale;
  const ballRadius = physicalR * 1.65;

  // Rail thickness from real rail width
  const railThickness = Math.max(4.2, phys.railWidth * scale);

  // Diamond centerline from cushion nose (~3-11/16") into the rail
  const diamondRailInset = Math.min(
    railThickness * 0.72,
    Math.max(railThickness * 0.38, phys.diamondFromNose * scale),
  );

  // On-screen: 9ft fills container; 7ft scales by cloth length ratio (still 2:1)
  const displayScale = phys.length / PHYSICAL_IN['9ft'].length;

  return {
    size,
    cloth,
    physical: phys,
    L,
    S,
    pocketCenters,
    pockets,
    diamonds: { longNear, longFar, shortHead, shortFoot },
    diamondRailInset,
    ballRadius,
    railThickness,
    displayScale,
    headStringX: L * 0.25,
    footSpot: { x: L * 0.75, y: S * 0.5 },
  };
}

type CornerQuad = 'sw' | 'se' | 'nw' | 'ne';
type SideSide = 'n' | 's';

function makeCornerPocket(
  id: PocketId,
  center: Pt,
  quad: CornerQuad,
  mouthWidth: number,
  jawAngleDeg: number,
  shelfDepth: number,
): PocketSpec {
  const half = mouthWidth / 2;
  const alongX = quad === 'sw' || quad === 'nw' ? 1 : -1;
  const alongY = quad === 'sw' || quad === 'se' ? 1 : -1;

  const m1: Pt = { x: center.x + alongX * half, y: center.y };
  const m2: Pt = { x: center.x, y: center.y + alongY * half };

  const outX = -alongX;
  const outY = -alongY;

  const j1b: Pt = {
    x: m1.x + outX * shelfDepth * 0.3 + (m1.x - center.x) * 0.15,
    y: m1.y + outY * shelfDepth,
  };
  const j2b: Pt = {
    x: m2.x + outX * shelfDepth,
    y: m2.y + outY * shelfDepth * 0.3 + (m2.y - center.y) * 0.15,
  };
  const shelf: Pt = {
    x: center.x + outX * shelfDepth * 1.15,
    y: center.y + outY * shelfDepth * 1.15,
  };

  const mouthPolygon: Pt[] = [m1, j1b, shelf, j2b, m2];

  return {
    id,
    kind: 'corner',
    center,
    mouthWidth,
    jawAngleDeg,
    shelfDepth,
    mouthPolygon,
  };
}

function makeSidePocket(
  id: PocketId,
  center: Pt,
  side: SideSide,
  mouthWidth: number,
  jawAngleDeg: number,
  shelfDepth: number,
): PocketSpec {
  const half = mouthWidth / 2;
  const jaw = (jawAngleDeg * Math.PI) / 180;
  const outY = side === 's' ? -1 : 1;

  const mL: Pt = { x: center.x - half, y: center.y };
  const mR: Pt = { x: center.x + half, y: center.y };

  const flare = Math.tan(jaw) * shelfDepth;
  const jL: Pt = { x: mL.x - flare, y: center.y + outY * shelfDepth };
  const jR: Pt = { x: mR.x + flare, y: center.y + outY * shelfDepth };
  const shelf: Pt = { x: center.x, y: center.y + outY * shelfDepth * 1.25 };

  const mouthPolygon: Pt[] = [mL, mR, jR, shelf, jL];

  return {
    id,
    kind: 'side',
    center,
    mouthWidth,
    jawAngleDeg,
    shelfDepth,
    mouthPolygon,
  };
}

/** Nearest pocket center to a cloth point (for target highlight). */
export function nearestPocket(geo: TableGeometry, p: Pt): PocketSpec {
  let best = geo.pockets[0];
  let bestD = Infinity;
  for (const pk of geo.pockets) {
    const d = Math.hypot(pk.center.x - p.x, pk.center.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = pk;
    }
  }
  return best;
}

/** Human zone label for a cloth point (no coordinates). */
export function clothZoneLabel(p: Pt, geo: TableGeometry = buildTableGeometry('9ft')): string {
  const { L, S } = geo;
  const x = p.x / L;
  const y = p.y / S;

  const xBand =
    x < 0.2
      ? 'near the head rail'
      : x < 0.4
        ? 'in the kitchen half'
        : x < 0.6
          ? 'around center table'
          : x < 0.8
            ? 'in the foot half'
            : 'near the foot rail';

  const yBand =
    y < 0.28
      ? 'close to the near long rail'
      : y > 0.72
        ? 'close to the far long rail'
        : 'around the center line';

  for (const pk of geo.pockets) {
    if (Math.hypot(pk.center.x - p.x, pk.center.y - p.y) < 8) {
      const name =
        pk.id === 'side-near'
          ? 'near side pocket'
          : pk.id === 'side-far'
            ? 'far side pocket'
            : pk.id.startsWith('head')
              ? 'a head corner'
              : 'a foot corner';
      return `near ${name}`;
    }
  }

  return `${xBand}, ${yBand}`;
}
