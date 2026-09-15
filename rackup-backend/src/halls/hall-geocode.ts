/**
 * Hall pin resolution: known venues first, then Nominatim, never a silent Vegas default.
 *
 * Nominatim source for Backstop: "533 Avenue B, Boulder City, NV 89005"
 * → 35.9773965, -114.8375001 (2026-09-14). Official site lists 533 Avenue B;
 * stored USPS line 525 Avenue B, Boulder City, NV 89005-2731 is the same block.
 */

export type GeoPoint = { lat: number; lon: number };

export type ResolvedHallLocation = GeoPoint & {
  source: 'known' | 'nominatim' | 'provided';
  displayName?: string;
  address?: string;
};

export type HallLocationInput = {
  name?: string;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
};

export const VEGAS_DEFAULT: GeoPoint = { lat: 36.1699, lon: -115.1398 };

export const BACKSTOP_SPORTS_PUB = {
  id: 'hall-backstop-boulder',
  name: 'Backstop Sports Pub',
  address: '533 Avenue B, Boulder City, NV 89005',
  lat: 35.9773965,
  lon: -114.8375001,
  source: 'nominatim:533 Avenue B, Boulder City, NV 89005',
} as const;

const KNOWN_HALLS: Array<{
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  match: (name: string, address: string) => boolean;
}> = [
  {
    id: BACKSTOP_SPORTS_PUB.id,
    name: BACKSTOP_SPORTS_PUB.name,
    address: BACKSTOP_SPORTS_PUB.address,
    lat: BACKSTOP_SPORTS_PUB.lat,
    lon: BACKSTOP_SPORTS_PUB.lon,
    match: (name, address) => {
      if (/backstop/i.test(name)) return true;
      return /avenue\s*b/i.test(address) && /boulder\s*city/i.test(address);
    },
  },
];

const VEGAS_DEFAULTS: GeoPoint[] = [
  VEGAS_DEFAULT,
  { lat: 36.17, lon: -115.14 },
];

export function isFiniteCoord(
  lat?: number | null,
  lon?: number | null,
): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    !(lat === 0 && lon === 0)
  );
}

function asPoint(lat?: number | null, lon?: number | null): GeoPoint | null {
  if (!isFiniteCoord(lat, lon) || typeof lon !== 'number') return null;
  return { lat, lon };
}

export function nearlyEqual(a: number, b: number, eps = 0.012): boolean {
  return Math.abs(a - b) < eps;
}

export function isVegasDefaultCoords(lat?: number | null, lon?: number | null): boolean {
  const pt = asPoint(lat, lon);
  if (!pt) return false;
  return VEGAS_DEFAULTS.some((p) => nearlyEqual(pt.lat, p.lat) && nearlyEqual(pt.lon, p.lon));
}

/** Central Las Vegas / Winchester / Paradise box — not Boulder City (~35.98, -114.84). */
export function isLasVegasMetro(lat?: number | null, lon?: number | null): boolean {
  const pt = asPoint(lat, lon);
  if (!pt) return false;
  return pt.lat >= 36.0 && pt.lat <= 36.36 && pt.lon >= -115.42 && pt.lon <= -114.95;
}

export function lookupKnownHall(
  name?: string | null,
  address?: string | null,
): ResolvedHallLocation | null {
  const n = (name ?? '').trim();
  const a = (address ?? '').trim();
  if (!n && !a) return null;
  for (const hall of KNOWN_HALLS) {
    if (hall.match(n, a)) {
      return {
        lat: hall.lat,
        lon: hall.lon,
        source: 'known',
        displayName: hall.name,
        address: hall.address,
      };
    }
  }
  return null;
}

export function addressConflictsWithPin(
  address: string | null | undefined,
  lat?: number | null,
  lon?: number | null,
): boolean {
  if (!address || !isFiniteCoord(lat, lon)) return false;
  if (/boulder\s*city/i.test(address) && isLasVegasMetro(lat, lon)) return true;
  return false;
}

export function shouldReplaceCoords(
  current: GeoPoint,
  next: GeoPoint,
  eps = 0.002,
): boolean {
  return !nearlyEqual(current.lat, next.lat, eps) || !nearlyEqual(current.lon, next.lon, eps);
}

function providedLooksTrusted(input: HallLocationInput): boolean {
  if (!isFiniteCoord(input.lat, input.lon)) return false;
  if (isVegasDefaultCoords(input.lat, input.lon) && (input.address || input.name)) {
    return false;
  }
  if (addressConflictsWithPin(input.address, input.lat, input.lon)) {
    return false;
  }
  return true;
}

async function geocodeNominatim(query: string): Promise<ResolvedHallLocation | null> {
  if (typeof fetch !== 'function') return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RackUpHallGeocode/1.0 (https://github.com/Unwrenchable/Rack_em_up)',
      },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const hit = rows[0];
    const lat = hit?.lat != null ? Number(hit.lat) : NaN;
    const lon = hit?.lon != null ? Number(hit.lon) : NaN;
    if (!isFiniteCoord(lat, lon)) return null;
    return {
      lat,
      lon,
      source: 'nominatim',
      displayName: hit.display_name,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a hall pin. Known venues win; Vegas defaults are never kept when an
 * address or known name can place the room correctly.
 */
export async function resolveHallLocation(
  input: HallLocationInput,
): Promise<ResolvedHallLocation | null> {
  const known = lookupKnownHall(input.name, input.address);
  if (known) return known;

  const trusted = providedLooksTrusted(input) ? asPoint(input.lat, input.lon) : null;
  if (trusted) {
    return { ...trusted, source: 'provided' };
  }

  const query = [input.address, input.name].filter((x) => x && String(x).trim()).join(', ');
  if (query) {
    const remote = await geocodeNominatim(query);
    if (remote) return remote;
  }

  const fallback = asPoint(input.lat, input.lon);
  if (fallback && !isVegasDefaultCoords(fallback.lat, fallback.lon)) {
    return { ...fallback, source: 'provided' };
  }

  return null;
}
