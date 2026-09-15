import { Inject, Injectable, Optional } from '@nestjs/common';

/**
 * Read-only FargoRate public API client.
 *
 * Live shape (probed 2026-09-15, no auth):
 *   GET https://dashboard.fargorate.com/api/indexsearch?q=<name>
 *     → { value: [{ id (uuid), readableId, firstName, lastName, rating, robustness,
 *                  provisionalRating, effectiveRating, location, membershipId }] }
 *   GET https://dashboard.fargorate.com/api/players/<readableId>
 *     → { RowId, Id, FirstName, LastName, FargoRating, Robustness, ProvisionalRating, FullName }
 *
 * Numeric `readableId` / `Id` is required for GET /players/:id (uuid path returns 400).
 * Never POST. Never invent ratings — missing/sentinel values stay null.
 */

export const FARGO_DEFAULT_BASE = 'https://dashboard.fargorate.com/api';
export const FARGO_DEFAULT_TIMEOUT_MS = 8_000;
export const FARGO_DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

export type FargoPlayerRead = {
  fargo_id: string | null;
  readable_id: string | null;
  membership_id: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string;
  location: string | null;
  /** Published rating; null if missing or Fargo sentinel (< 0, e.g. "-90"). */
  rating: number | null;
  robustness: number | null;
  provisional_rating: number | null;
  effective_rating: number | null;
  raw: Record<string, unknown>;
};

export class FargoRateError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'FargoRateError';
  }
}

type CacheEntry<T> = { at: number; value: T };

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function fargoApiBase(): string {
  const raw = (process.env.FARGO_API_BASE ?? FARGO_DEFAULT_BASE).trim().replace(/\/+$/, '');
  return raw || FARGO_DEFAULT_BASE;
}

export function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/** Fargo uses negative placeholders (commonly -90) for unpublished ratings. */
export function parsePublishedFargoRating(v: unknown): number | null {
  const n = parseOptionalNumber(v);
  if (n == null || n < 0) return null;
  return n;
}

function pickExact(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(raw, key) && raw[key] != null) return raw[key];
  }
  return undefined;
}

function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  const exact = pickExact(raw, ...keys);
  if (exact != null) return exact;
  const lower = new Map<string, unknown>();
  for (const [k, val] of Object.entries(raw)) lower.set(k.toLowerCase(), val);
  for (const key of keys) {
    const hit = lower.get(key.toLowerCase());
    if (hit != null) return hit;
  }
  return undefined;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuid(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return UUID_RE.test(s) ? s : null;
}

function asNumericId(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  return /^\d+$/.test(s) ? s : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function parseFargoPlayerPayload(json: unknown): FargoPlayerRead | null {
  const raw = asRecord(json);
  if (!raw) return null;
  if (typeof raw.Message === 'string' && !pick(raw, 'Id', 'id', 'readableId')) return null;

  const first = pick(raw, 'firstName', 'FirstName');
  const last = pick(raw, 'lastName', 'LastName');
  const full = pick(raw, 'FullName', 'fullName', 'name');
  const firstS = first != null ? String(first).trim() : '';
  const lastS = last != null ? String(last).trim() : '';
  const nameFromParts = `${firstS} ${lastS}`.trim();
  const name =
    (full != null && String(full).trim()) ||
    nameFromParts ||
    '';

  const uuidS =
    asUuid(pickExact(raw, 'RowId', 'rowId', 'id')) ??
    asUuid(pick(raw, 'RowId', 'rowId'));
  const readableS =
    asNumericId(pickExact(raw, 'readableId', 'Id')) ??
    asNumericId(pick(raw, 'readableId'));

  const locParts = [
    pick(raw, 'location'),
    pick(raw, 'City', 'city'),
    pick(raw, 'State', 'state'),
  ]
    .map((x) => (x != null ? String(x).trim() : ''))
    .filter(Boolean);

  return {
    fargo_id: uuidS,
    readable_id: readableS,
    membership_id: (() => {
      const m = pick(raw, 'membershipId', 'BBMMembershipId', 'membershipNumber');
      return m != null && String(m).trim() ? String(m).trim() : null;
    })(),
    first_name: firstS || null,
    last_name: lastS || null,
    name: name || (readableS ? `Fargo #${readableS}` : 'Unknown'),
    location: locParts.length ? locParts.join(' ') : null,
    rating: parsePublishedFargoRating(pick(raw, 'rating', 'FargoRating')),
    robustness: parseOptionalNumber(pick(raw, 'robustness', 'Robustness')),
    provisional_rating: parsePublishedFargoRating(
      pick(raw, 'provisionalRating', 'ProvisionalRating'),
    ),
    effective_rating: parsePublishedFargoRating(
      pick(raw, 'effectiveRating', 'effective_rating'),
    ),
    raw,
  };
}

export function parseFargoSearchPayload(json: unknown): FargoPlayerRead[] {
  if (Array.isArray(json)) {
    return json.map(parseFargoPlayerPayload).filter((x): x is FargoPlayerRead => x != null);
  }
  const rec = asRecord(json);
  if (!rec) return [];
  const list = rec.value ?? rec.Value ?? rec.results ?? rec.Results;
  if (!Array.isArray(list)) {
    const one = parseFargoPlayerPayload(json);
    return one ? [one] : [];
  }
  return list.map(parseFargoPlayerPayload).filter((x): x is FargoPlayerRead => x != null);
}

@Injectable()
export class FargoRateClient {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly fetchImpl: typeof fetch;

  constructor(
    @Optional() @Inject('FARGO_FETCH') fetchImpl?: typeof fetch,
  ) {
    this.fetchImpl = fetchImpl ?? fetch.bind(globalThis);
  }

  search(q: string): Promise<FargoPlayerRead[]> {
    const query = q.trim().slice(0, 80);
    if (query.length < 2) return Promise.resolve([]);
    return this.cached(`search:${query.toLowerCase()}`, () => this.getSearch(query));
  }

  getPlayer(id: string): Promise<FargoPlayerRead | null> {
    const key = String(id ?? '').trim();
    if (!key) return Promise.resolve(null);
    return this.cached(`player:${key}`, () => this.getPlayerUncached(key));
  }

  private timeoutMs(): number {
    return envInt('FARGO_TIMEOUT_MS', FARGO_DEFAULT_TIMEOUT_MS);
  }

  private ttlMs(): number {
    return envInt('FARGO_CACHE_TTL_MS', FARGO_DEFAULT_CACHE_TTL_MS);
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();
    if (hit && now - hit.at < this.ttlMs()) return hit.value;
    const value = await load();
    this.cache.set(key, { at: now, value });
    return value;
  }

  private async getSearch(q: string): Promise<FargoPlayerRead[]> {
    const url = `${fargoApiBase()}/indexsearch?q=${encodeURIComponent(q)}`;
    const json = await this.getJson(url);
    return parseFargoSearchPayload(json);
  }

  private async getPlayerUncached(id: string): Promise<FargoPlayerRead | null> {
    // Live API: numeric readableId only. Uuid path returns 400 "request is invalid".
    const url = `${fargoApiBase()}/players/${encodeURIComponent(id)}`;
    try {
      const json = await this.getJson(url);
      return parseFargoPlayerPayload(json);
    } catch (e) {
      if (e instanceof FargoRateError && e.status === 400 && !/^\d+$/.test(id)) {
        return null;
      }
      throw e;
    }
  }

  private async getJson(url: string): Promise<unknown> {
    if (!/^https:\/\/dashboard\.fargorate\.com\/api\/(indexsearch|players\/)/i.test(url) &&
        !url.includes('/indexsearch?') &&
        !/\/players\/[^/]+$/.test(url)) {
      throw new FargoRateError(`Refusing Fargo URL outside read endpoints: ${url}`);
    }
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'RackUp/1.0 (read-only FargoRate; no LMS)',
        },
        signal: AbortSignal.timeout(this.timeoutMs()),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new FargoRateError(`FargoRate timeout/network: ${msg}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new FargoRateError(
        `FargoRate HTTP ${res.status}: ${text.slice(0, 180)}`,
        res.status,
      );
    }
    return res.json();
  }
}
