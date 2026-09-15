import {
  computeRackupShadow,
  gamesFactor,
  rdConfidence,
  SHADOW_Z_95,
} from '../../src/ratings/shadow-rating';
import {
  formatFargoPair,
  formatShadowPair,
  RACKUP_SHADOW_DISCLAIMER,
} from '../../src/ratings/player-card.types';
import { unifyRackupRating } from '../../src/leagues/v2/rating/unified-rackup-rating';
import { ROC_DEFAULT_RATING, ROC_DEFAULT_RD } from '../../src/users/rating-display';
import {
  parseFargoPlayerPayload,
  parseFargoSearchPayload,
  parsePublishedFargoRating,
  FargoRateClient,
} from '../../src/ratings/fargo-rate.client';
import { nameSimilarity, normalizePersonName } from '../../src/ratings/name-fuzzy';

describe('RackUpRate shadow math', () => {
  it('gives robustness 0 and provisional for default ROC seed (0 matches)', () => {
    const s = computeRackupShadow({
      rating: ROC_DEFAULT_RATING,
      rd: ROC_DEFAULT_RD,
      matches: 0,
    });
    expect(s.rating).toBe(500);
    expect(s.robustness).toBe(0);
    expect(s.provisional).toBe(true);
    expect(s.official).toBe(false);
    expect(s.source).toBe('rackup_glicko_shadow');
    expect(s.confidence_low).toBe(Math.round(500 - SHADOW_Z_95 * 175));
    expect(s.confidence_high).toBe(Math.round(500 + SHADOW_Z_95 * 175));
  });

  it('does not use leagues-v2 0–3000 unifyRackupRating for the shadow number', () => {
    const unified = unifyRackupRating('fargo', 520);
    const shadow = computeRackupShadow({ rating: 520, rd: 80, matches: 25 });
    expect(shadow.rating).toBe(520);
    expect(shadow.rating).toBe(unified); // fargo pass-through happens to match
    const apaUnified = unifyRackupRating('apa', 5);
    const apaShadow = computeRackupShadow({ rating: 5, rd: 80, matches: 25 });
    expect(apaUnified).toBe(1650);
    expect(apaShadow.rating).toBe(5); // shadow is Glicko, not APA-mapped 0–3000
  });

  it('tightens CI as RD drops and clears provisional after enough games', () => {
    const wide = computeRackupShadow({ rating: 540, rd: 175, matches: 4 });
    const tight = computeRackupShadow({ rating: 540, rd: 45, matches: 40 });
    expect(wide.provisional).toBe(true);
    expect(tight.provisional).toBe(false);
    expect(tight.robustness).toBeGreaterThan(wide.robustness);
    expect(tight.confidence_high - tight.confidence_low).toBeLessThan(
      wide.confidence_high - wide.confidence_low,
    );
    expect(rdConfidence(30)).toBeCloseTo(1, 5);
    expect(rdConfidence(350)).toBeCloseTo(0, 5);
    expect(gamesFactor(0)).toBe(0);
  });

  it('formats the Fargo vs RackUpRate display pair', () => {
    const shadow = computeRackupShadow({ rating: 512, rd: 90, matches: 22 });
    expect(formatFargoPair(520, 410)).toBe('FargoRate: 520 (rob 410)');
    expect(formatFargoPair(null, 410)).toBeNull();
    expect(formatShadowPair(shadow)).toMatch(/^RackUpRate: 512 \(rob \d+\)$/);
    expect(RACKUP_SHADOW_DISCLAIMER).toMatch(/not official FargoRate/i);
  });
});

describe('FargoRate parser + read client', () => {
  it('does not invent ratings for Fargo sentinel -90', () => {
    expect(parsePublishedFargoRating('-90')).toBeNull();
    expect(parsePublishedFargoRating('406')).toBe(406);
    expect(parsePublishedFargoRating(undefined)).toBeNull();
  });

  it('parses live indexsearch { value: [...] } camelCase rows', () => {
    const rows = parseFargoSearchPayload({
      value: [
        {
          id: '58A4A5B5-D055-481F-9C3D-A9E901706D94',
          readableId: '1023262',
          firstName: 'Shane',
          lastName: 'Acello',
          location: 'WI',
          rating: '406',
          robustness: '599',
          provisionalRating: '0',
          effectiveRating: '406',
        },
        {
          id: '9EA75CEA-26C5-4C2A-964D-5776A74F7D91',
          readableId: '731732',
          firstName: 'Shane',
          lastName: '?',
          rating: '-90',
          robustness: '0',
          provisionalRating: '525',
          effectiveRating: '525',
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].rating).toBe(406);
    expect(rows[0].robustness).toBe(599);
    expect(rows[0].readable_id).toBe('1023262');
    expect(rows[1].rating).toBeNull();
    expect(rows[1].provisional_rating).toBe(525);
  });

  it('parses GET /players/:readableId PascalCase payload', () => {
    const p = parseFargoPlayerPayload({
      RowId: '58a4a5b5-d055-481f-9c3d-a9e901706d94',
      Id: 1023262,
      FirstName: 'Shane',
      LastName: 'Acello',
      FargoRating: '406',
      Robustness: '599',
      ProvisionalRating: '0',
      FullName: 'Shane Acello',
    });
    expect(p?.fargo_id?.toLowerCase()).toBe('58a4a5b5-d055-481f-9c3d-a9e901706d94');
    expect(p?.readable_id).toBe('1023262');
    expect(p?.rating).toBe(406);
    expect(p?.name).toBe('Shane Acello');
  });

  it('searches and gets players via GET only, with cache, never inventing', async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const fetchMock = (async (input: string | URL, init?: { method?: string }) => {
      const url = String(input);
      calls.push({ url, method: init?.method });
      if (url.includes('/indexsearch?')) {
        return new Response(
          JSON.stringify({
            value: [
              {
                id: '58A4A5B5-D055-481F-9C3D-A9E901706D94',
                readableId: '1023262',
                firstName: 'Shane',
                lastName: 'Acello',
                rating: '406',
                robustness: '599',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/players/1023262')) {
        return new Response(
          JSON.stringify({
            RowId: '58a4a5b5-d055-481f-9c3d-a9e901706d94',
            Id: 1023262,
            FirstName: 'Shane',
            LastName: 'Acello',
            FargoRating: '406',
            Robustness: '599',
            FullName: 'Shane Acello',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/players/58A4A5B5')) {
        return new Response(JSON.stringify({ Message: 'The request is invalid.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('nope', { status: 404 });
    }) as typeof fetch;

    const client = new FargoRateClient(fetchMock);
    const search = await client.search('Shane Acello');
    expect(search[0].rating).toBe(406);
    const again = await client.search('Shane Acello');
    expect(again[0].rating).toBe(406);
    expect(calls.filter((c) => c.url.includes('indexsearch')).length).toBe(1);

    const player = await client.getPlayer('1023262');
    expect(player?.rating).toBe(406);
    const uuidMiss = await client.getPlayer('58A4A5B5-D055-481F-9C3D-A9E901706D94');
    expect(uuidMiss).toBeNull();

    expect(calls.every((c) => !c.method || c.method === 'GET')).toBe(true);
    expect(calls.some((c) => /\/(matches|lms|submit)/i.test(c.url))).toBe(false);
  });
});

describe('Cross-league name fuzzy', () => {
  it('normalizes and scores obvious same-person names', () => {
    expect(normalizePersonName('Shane Van Boening Jr.')).toBe('shane van boening');
    expect(nameSimilarity('Shane Van Boening', 'Van Boening, Shane')).toBeGreaterThan(0.86);
    expect(nameSimilarity('Alice Smith', 'Bob Jones')).toBeLessThan(0.4);
  });
});
