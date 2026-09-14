import {
  BACKSTOP_SPORTS_PUB,
  addressConflictsWithPin,
  isLasVegasMetro,
  isVegasDefaultCoords,
  lookupKnownHall,
  shouldReplaceCoords,
} from '../../src/halls/hall-geocode';
import { countPlayersByHall, latestCheckinPerUser } from '../../src/halls/occupancy';

describe('unique hall occupancy', () => {
  it('keeps only the newest check-in per user', () => {
    const older = new Date('2026-09-14T18:00:00.000Z');
    const newer = new Date('2026-09-14T19:00:00.000Z');
    const rows = [
      { userId: 'u1', hallId: 'old-hall', createdAt: older },
      { userId: 'u1', hallId: 'new-hall', createdAt: newer },
      { userId: 'u2', hallId: 'old-hall', createdAt: older },
    ];
    const unique = latestCheckinPerUser(rows);
    expect(unique).toHaveLength(2);
    expect(unique.find((r) => r.userId === 'u1')?.hallId).toBe('new-hall');
    const counts = countPlayersByHall(rows);
    expect(counts.get('old-hall')).toBe(1);
    expect(counts.get('new-hall')).toBe(1);
  });
});

describe('Backstop / hall geocode', () => {
  it('pins Backstop Sports Pub in Boulder City, not Winchester', () => {
    const pin = lookupKnownHall(
      'Backstop Sports Pub',
      '525 Avenue B, Boulder City, NV 89005-2731',
    );
    expect(pin).not.toBeNull();
    expect(pin!.lat).toBeCloseTo(BACKSTOP_SPORTS_PUB.lat, 4);
    expect(pin!.lon).toBeCloseTo(BACKSTOP_SPORTS_PUB.lon, 4);
    expect(isLasVegasMetro(pin!.lat, pin!.lon)).toBe(false);
    expect(pin!.lat).toBeLessThan(36);
    expect(pin!.lon).toBeGreaterThan(-115);
  });

  it('treats the Halls create-form Vegas default as untrusted', () => {
    expect(isVegasDefaultCoords(36.1699, -115.1398)).toBe(true);
    expect(isVegasDefaultCoords(36.17, -115.14)).toBe(true);
    expect(isVegasDefaultCoords(BACKSTOP_SPORTS_PUB.lat, BACKSTOP_SPORTS_PUB.lon)).toBe(
      false,
    );
  });

  it('flags a Boulder City address sitting on a Vegas metro pin', () => {
    expect(
      addressConflictsWithPin(
        '525 Avenue B, Boulder City, NV 89005-2731',
        36.1699,
        -115.1398,
      ),
    ).toBe(true);
    expect(
      shouldReplaceCoords(
        { lat: 36.1699, lon: -115.1398 },
        { lat: BACKSTOP_SPORTS_PUB.lat, lon: BACKSTOP_SPORTS_PUB.lon },
      ),
    ).toBe(true);
  });
});
