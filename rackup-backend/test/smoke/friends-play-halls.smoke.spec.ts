import { asUuid, isUuid } from '../../src/common/uuid';
import { normalizeChallengeGame } from '../../src/matchmaking/challenge-game';
import {
  moneyMatchQueryErrors,
  sanitizeMoneyMatchFilters,
} from '../../src/money-matches/money-match-filters';
import {
  DEFAULT_SEARCH_ORIGIN,
  DEFAULT_SEARCH_RADIUS_M,
} from '../../src/matchmaking/looking-board.util';

describe('UUID helpers', () => {
  it('accepts real player ids and rejects Play demo stubs', () => {
    expect(isUuid('0dbb14a2-c9db-4efe-97b1-c6e3a3108483')).toBe(true);
    expect(isUuid('p1')).toBe(false);
    expect(isUuid('h1')).toBe(false);
    expect(asUuid('h1')).toBeUndefined();
    expect(asUuid('  ')).toBeUndefined();
  });
});

describe('moneyMatchQueryErrors', () => {
  it('400s playerId=not-a-uuid (live probe) instead of letting Postgres 500', () => {
    expect(moneyMatchQueryErrors({ playerId: 'not-a-uuid' })).toEqual([
      'playerId must be a UUID',
    ]);
    expect(moneyMatchQueryErrors({ hallId: 'h1' })).toEqual(['hallId must be a UUID']);
    expect(moneyMatchQueryErrors({})).toEqual([]);
    expect(moneyMatchQueryErrors({ status: 'ACTIVE' })).toEqual([]);
  });
});

describe('sanitizeMoneyMatchFilters', () => {
  it('drops demo playerId/hallId so GET /money-matches does not 400/500', () => {
    const safe = sanitizeMoneyMatchFilters({
      status: 'open',
      playerId: 'p1',
      hallId: 'h1',
    });
    expect(safe.status).toBeUndefined();
    expect(safe.playerId).toBeUndefined();
    expect(safe.hallId).toBeUndefined();
  });

  it('keeps valid status + UUIDs', () => {
    const id = '4d8703eb-6b41-47c0-9791-fb10b9ffaed6';
    const safe = sanitizeMoneyMatchFilters({
      status: 'active',
      playerId: id,
      hallId: id,
    });
    expect(safe.status).toBe('ACTIVE');
    expect(safe.playerId).toBe(id);
    expect(safe.hallId).toBe(id);
  });
});

describe('matchmaking search defaults', () => {
  it('uses Vegas origin + worldwide radius when lat/lon omitted', () => {
    expect(DEFAULT_SEARCH_ORIGIN.lat).toBeCloseTo(36.1699);
    expect(DEFAULT_SEARCH_ORIGIN.lon).toBeCloseTo(-115.1398);
    expect(DEFAULT_SEARCH_RADIUS_M).toBe(21_000_000);
  });
});

describe('normalizeChallengeGame', () => {
  it('accepts UI labels that used to 400 Challenge', () => {
    expect(normalizeChallengeGame('One-pocket')).toBe('one-pocket');
    expect(normalizeChallengeGame('8-Ball')).toBe('8-ball');
    expect(normalizeChallengeGame('All')).toBeUndefined();
    expect(normalizeChallengeGame('9-ball')).toBe('9-ball');
    expect(normalizeChallengeGame('not-a-game')).toBeUndefined();
  });
});
