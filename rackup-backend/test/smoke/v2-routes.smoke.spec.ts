/**
 * V2 smoke tests — pure unit + route map verification (no live DB required).
 * Run: npm run test:smoke
 */
import {
  keyForHallV2,
  keyForLeagueV2,
  keyForMatchmakingV2,
  keyForRealaiV2,
  keyForScorekeepingV2,
  keyForTournamentV2,
} from '../../src/common/redis-keys';
import {
  unifyRackupRating,
  unifiedToSkillBand,
  UNIFIED_RATING_MAX,
  UNIFIED_RATING_MIN,
} from '../../src/leagues/v2/rating/unified-rackup-rating';
import { listSotdMaps, getSotdMapById, sotdMapCount } from '../../src/realai/v2/sotd-shot-maps';

describe('Redis V2 namespaces', () => {
  it('builds canonical keys', () => {
    expect(keyForHallV2('h1', 'feed')).toBe('halls:v2:h1:feed');
    expect(keyForTournamentV2('t1', 'bracket')).toBe('tournaments:v2:t1:bracket');
    expect(keyForLeagueV2('s1', 'standings')).toBe('leagues:v2:s1:standings');
    expect(keyForMatchmakingV2('queue')).toBe('matchmaking:v2:queue');
    expect(keyForMatchmakingV2('active', 'sid')).toBe('matchmaking:v2:active:sid');
    expect(keyForRealaiV2('job1', 'job')).toBe('realai:v2:job1:job');
    expect(keyForScorekeepingV2('events')).toBe('scorekeeping:v2:events');
  });
});

describe('Unified rating normalization', () => {
  it('clamps and maps APA skill levels', () => {
    const apa = unifyRackupRating('APA', 5);
    expect(apa).toBeGreaterThanOrEqual(UNIFIED_RATING_MIN);
    expect(apa).toBeLessThanOrEqual(UNIFIED_RATING_MAX);
    expect(apa).toBe(400 + 5 * 250);
  });

  it('passes fargo through clamp', () => {
    expect(unifyRackupRating('FargoRate', 620)).toBe(620);
  });

  it('maps skill bands', () => {
    expect(unifiedToSkillBand(500)).toBe('novice');
    expect(unifiedToSkillBand(1200)).toBe('intermediate');
    expect(unifiedToSkillBand(1800)).toBe('advanced');
    expect(unifiedToSkillBand(2500)).toBe('pro');
  });
});

describe('SOTD maps catalog', () => {
  it('has 52 maps with required fields', () => {
    expect(sotdMapCount()).toBe(52);
    const maps = listSotdMaps();
    expect(maps).toHaveLength(52);
    const one = getSotdMapById('sotd-01');
    expect(one).toBeDefined();
    expect(one!.cue_ball_start).toBeDefined();
    expect(one!.object_ball_positions.length).toBeGreaterThan(0);
    expect(one!.intended_path.length).toBeGreaterThan(0);
    expect(one!.pocket_target).toBeDefined();
    expect(one!.source).toBe('catalog_fallback');
  });
});

/** Documented V2 route surface for smoke checklists / future e2e. */
describe('V2 route inventory', () => {
  const routes = [
    'POST /halls/v2/checkin',
    'POST /halls/v2/checkout',
    'GET /halls/v2/feed/:hallId',
    'GET /halls/v2/photos/:hallId',
    'POST /tournaments/v2/create',
    'POST /tournaments/v2/register',
    'POST /tournaments/v2/start',
    'POST /tournaments/v2/report-match',
    'GET /tournaments/v2/bracket/:id',
    'POST /leagues/v2/season/create',
    'GET /leagues/v2/season/:id/standings',
    'POST /leagues/v2/season/:id/report-match',
    'POST /matchmaking/v2/search',
    'POST /realai/v2/coach',
    'GET /realai/v2/sotd/maps',
    'GET /realai/v2/sotd/map/:id',
    'POST /realai/v2/summary-job',
    'GET /users/:id',
    'GET /users/profiles',
    'GET /health',
    'POST /shots/complete',
    'GET /shots/streak',
  ];

  it('lists expected V2 + health surfaces', () => {
    expect(routes.length).toBeGreaterThanOrEqual(15);
    expect(routes.some((r) => r.includes('sotd/maps'))).toBe(true);
    expect(routes.some((r) => r.includes('report-match'))).toBe(true);
    expect(routes.some((r) => r.includes('/health'))).toBe(true);
  });
});
