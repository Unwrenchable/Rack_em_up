/**
 * Instructor-grade pool table geometry for SOTD diagrams.
 *
 * Coordinate system (cloth / playing surface):
 *   x: 0 = head rail → length = foot rail
 *   y: 0 = near long rail → width = far long rail
 *
 * Diamonds are computed from pocket-center spans L and S (not a uniform grid).
 */

export type TableSize = '7ft' | '9ft';

export type Pt = { x: number; y: number };

/** Playing surface size in diagram units (always 2:1 aspect). */
export type PlayingSurface = {
  length: number; // L span for long rails (corner→corner along x)
  width: number; // S span for short rails (corner→corner along y)
};

/**
 * Physical reference (inches) — used only to scale ball / pocket / rail
 * relative to cloth. Diamonds always use fractional L/S rules.
 */
const PHYSICAL_IN: Record<TableSize, { length: number; width: number; ballDia: number }> = {
  '9ft': { length: 100, width: 50, ballDia: 2.25 },
  '7ft': { length: 78, width: 39, ballDia: 2.25 },
};

/** Diagram cloth always 100 × 50 for a clean 2:1 SVG (fractions map cleanly). */
export const CLOTH: PlayingSurface = { length: 100, width: 50 };

export type PocketId =
  | 'head-near' // (0, 0)
  | 'head-far' // (0, W)
  | 'side-near' // (L/2, 0)
  | 'side-far' // (L/2, W)
  | 'foot-near' // (L, 0)
  | 'foot-far'; // (L, W)

export type PocketKind = 'corner' | 'side';

export type PocketSpec = {
  id: PocketId;
  kind: PocketKind;
  /** Center of the pocket mouth on the cloth perimeter. */
  center: Pt;
  /** Mouth width along the cloth edge (diagram units). */
  mouthWidth: number;
  /** Jaw opening angle from the rail line (degrees). */
  jawAngleDeg: number;
  /** Shelf depth into the pocket (diagram units). */
  shelfDepth: number;
  /** Trapezoid polygon in cloth coords (mouth outer → shelf inner). */
  mouthPolygon: Pt[];
};

export type TableGeometry = {
  size: TableSize;
  cloth: PlayingSurface;
  /** Distance between long-rail corner pocket centers (= cloth.length). */
  L: number;
  /** Distance between short-rail corner pocket centers (= cloth.width). */
  S: number;
  /** Pocket centers (6). */
  pocketCenters: Record<PocketId, Pt>;
  pockets: PocketSpec[];
  /**
   * Diamond positions on each rail, in cloth-edge coordinates
   * (x,y on the perimeter). Render on the wood rail outside the cloth.
   */
  diamonds: {
    longNear: Pt[]; // y = 0
    longFar: Pt[]; // y = S
    shortHead: Pt[]; // x = 0
    shortFoot: Pt[]; // x = L
  };
  /** Ball radius in cloth units (scaled so 7ft balls read larger). */
  ballRadius: number;
  /** Rail band thickness in cloth units (wood outside cloth). */
  railThickness: number;
  /** Head-string x (¼ table from head). */
  headStringX: number;
  /** Foot spot. */
  footSpot: Pt;
};

/** Long-rail diamond fractions of L (3 per half, 6 total). */
export const LONG_DIAMOND_FRACS = [1 / 12, 3 / 12, 5 / 12, 7 / 12, 9 / 12, 11 / 12] as const;

/** Short-rail diamond fractions of S (3 total). */
export const SHORT_DIAMOND_FRACS = [1 / 4, 2 / 4, 3 / 4] as const;

/**
 * Build full table geometry for a size.
 * L and S come from pocket-center geometry; diamonds use fractional rules only.
 */
export function buildTableGeometry(size: TableSize): TableGeometry {
  const cloth = CLOTH;
  const L = cloth.length;
  const S = cloth.width;

  const pocketCenters: Record<PocketId, Pt> = {
    'head-near': { x: 0, y: 0 },
    'head-far': { x: 0, y: S },
    'side-near': { x: L / 2, y: 0 },
    'side-far': { x: L / 2, y: S },
    'foot-near': { x: L, y: 0 },
    'foot-far': { x: L, y: S },
  };

  // Pocket mouths: 7ft reads slightly more open relative to cloth.
  const cornerMouth = size === '7ft' ? 5.4 : 4.6;
  const sideMouth = size === '7ft' ? 6.4 : 5.5;
  const cornerJaw = size === '7ft' ? 24 : 22; // 20–28°
  const sideJaw = size === '7ft' ? 14 : 12; // 10–18°
  const cornerShelf = size === '7ft' ? 2.4 : 2.1;
  const sideShelf = size === '7ft' ? 2.1 : 1.85;

  const pockets: PocketSpec[] = [
    makeCornerPocket('head-near', pocketCenters['head-near'], 'sw', cornerMouth, cornerJaw, cornerShelf),
    makeCornerPocket('head-far', pocketCenters['head-far'], 'nw', cornerMouth, cornerJaw, cornerShelf),
    makeCornerPocket('foot-near', pocketCenters['foot-near'], 'se', cornerMouth, cornerJaw, cornerShelf),
    makeCornerPocket('foot-far', pocketCenters['foot-far'], 'ne', cornerMouth, cornerJaw, cornerShelf),
    makeSidePocket('side-near', pocketCenters['side-near'], 's', sideMouth, sideJaw, sideShelf),
    makeSidePocket('side-far', pocketCenters['side-far'], 'n', sideMouth, sideJaw, sideShelf),
  ];

  // Diamonds from pocket-center spans — not a uniform grid
  const longNear = LONG_DIAMOND_FRACS.map((f) => ({ x: L * f, y: 0 }));
  const longFar = LONG_DIAMOND_FRACS.map((f) => ({ x: L * f, y: S }));
  const shortHead = SHORT_DIAMOND_FRACS.map((f) => ({ x: 0, y: S * f }));
  const shortFoot = SHORT_DIAMOND_FRACS.map((f) => ({ x: L, y: S * f }));

  // Ball size from physical diameter / table length, then mild diagram boost for readability.
  // 7ft still reads larger relative to cloth than 9ft.
  const phys = PHYSICAL_IN[size];
  const physicalR = (phys.ballDia / 2 / phys.length) * L;
  const ballRadius = physicalR * (size === '7ft' ? 1.85 : 1.7);

  const railThickness = size === '7ft' ? 6.4 : 5.6;

  return {
    size,
    cloth,
    L,
    S,
    pocketCenters,
    pockets,
    diamonds: { longNear, longFar, shortHead, shortFoot },
    ballRadius,
    railThickness,
    headStringX: L * 0.25,
    footSpot: { x: L * 0.75, y: S * 0.5 },
  };
}

type CornerQuad = 'sw' | 'se' | 'nw' | 'ne';
type SideSide = 'n' | 's';

/**
 * Corner pocket mouth as a trapezoid with jaw angles.
 * Mouth sits on the cloth corner; jaws open into the pocket (outside cloth).
 */
function makeCornerPocket(
  id: PocketId,
  center: Pt,
  quad: CornerQuad,
  mouthWidth: number,
  jawAngleDeg: number,
  shelfDepth: number,
): PocketSpec {
  const half = mouthWidth / 2;
  const jaw = (jawAngleDeg * Math.PI) / 180;
  // Unit directions along each rail from the corner
  const alongX = quad === 'sw' || quad === 'nw' ? 1 : -1; // into table along x
  const alongY = quad === 'sw' || quad === 'se' ? 1 : -1; // into table along y

  // Mouth points on cloth edges (two points on each adjacent rail)
  const m1: Pt = { x: center.x + alongX * half, y: center.y }; // along x-rail
  const m2: Pt = { x: center.x, y: center.y + alongY * half }; // along y-rail

  // Outer jaw tips (outside cloth) — expand by jaw angle + shelf
  const outX = -alongX; // outward from cloth
  const outY = -alongY;
  const jawLen = shelfDepth / Math.cos(jaw) + half * 0.15;

  const j1: Pt = {
    x: m1.x + outX * Math.sin(jaw) * jawLen + outY * 0 * jawLen,
    y: m1.y + outY * Math.cos(jaw) * jawLen,
  };
  // For corner, jaws go diagonally out
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

  // Trapezoid-ish: mouth edge → outer shelf (simplified 5-pt for jaw feel)
  const mouthPolygon: Pt[] = [m1, j1b, shelf, j2b, m2];

  void j1; // kept for jaw math reference

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

  // Mouth along the long rail
  const mL: Pt = { x: center.x - half, y: center.y };
  const mR: Pt = { x: center.x + half, y: center.y };

  // Jaw tips flare outward
  const flare = Math.tan(jaw) * shelfDepth;
  const jL: Pt = { x: mL.x - flare, y: center.y + outY * shelfDepth };
  const jR: Pt = { x: mR.x + flare, y: center.y + outY * shelfDepth };
  // Shelf back (deeper center)
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
    x < 0.2 ? 'near the head rail' : x < 0.4 ? 'in the kitchen half' : x < 0.6 ? 'around center table' : x < 0.8 ? 'in the foot half' : 'near the foot rail';

  const yBand =
    y < 0.28 ? 'close to the near long rail' : y > 0.72 ? 'close to the far long rail' : 'around the center line';

  // Pocket proximity
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
