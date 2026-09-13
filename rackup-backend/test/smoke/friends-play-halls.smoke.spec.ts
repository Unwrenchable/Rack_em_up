import { asUuid, isUuid } from '../../src/common/uuid';
import { normalizeChallengeGame } from '../../src/matchmaking/challenge-game';
import { sanitizeMoneyMatchFilters } from '../../src/money-matches/money-match-filters';

describe('UUID helpers', () => {
  it('accepts real player ids and rejects Play demo stubs', () => {
    expect(isUuid('0dbb14a2-c9db-4efe-97b1-c6e3a3108483')).toBe(true);
    expect(isUuid('p1')).toBe(false);
    expect(isUuid('h1')).toBe(false);
    expect(asUuid('h1')).toBeUndefined();
    expect(asUuid('  ')).toBeUndefined();
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

describe('normalizeChallengeGame', () => {
  it('accepts UI labels that used to 400 Challenge', () => {
    expect(normalizeChallengeGame('One-pocket')).toBe('one-pocket');
    expect(normalizeChallengeGame('8-Ball')).toBe('8-ball');
    expect(normalizeChallengeGame('All')).toBeUndefined();
    expect(normalizeChallengeGame('9-ball')).toBe('9-ball');
    expect(normalizeChallengeGame('not-a-game')).toBeUndefined();
  });
});
