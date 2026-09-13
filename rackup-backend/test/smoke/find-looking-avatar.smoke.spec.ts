/**
 * Find looking board + avatar upload — no live DB required.
 * Run: npm run test:smoke
 */
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ObjectStorageService } from '../../src/common/object-storage.service';
import {
  haversineMeters,
  isLookingRequestActive,
  keepDiscoverableRows,
  LOOKING_BOARD_LIMIT,
  LOOKING_TTL_MS,
  mergeLookingByUser,
  rankLookingCandidate,
  type LookingBoardRow,
} from '../../src/matchmaking/looking-board.util';
import { MatchmakingService } from '../../src/matchmaking/matchmaking.service';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function boardRow(partial: Partial<LookingBoardRow> & Pick<LookingBoardRow, 'id' | 'user_id'>): LookingBoardRow {
  return {
    game: '9-ball',
    stakes: 'casual',
    min_rating: 400,
    max_rating: 600,
    distance_meters: 0,
    ratingProximity: 0,
    stakes_weight: 0,
    rank_score: 0,
    created_at: new Date('2026-01-01T00:00:00Z'),
    expires_at: new Date('2026-01-01T00:30:00Z'),
    source: 'v1',
    ...partial,
  };
}

describe('Looking board ranking', () => {
  it('places two Vegas pins well inside a 20 km radius', () => {
    const meters = haversineMeters(36.1699, -115.1398, 36.17, -115.14);
    expect(meters).toBeLessThan(200);
  });

  it('does not hide a looking row when radius is worldwide', () => {
    const ranked = rankLookingCandidate({
      searchLat: 36.17,
      searchLon: -115.14,
      entityLat: 40.71,
      entityLon: -74.01,
      minRating: 500,
      maxRating: 600,
      stakes: 'casual',
    });
    expect(ranked.distanceMeters).toBeGreaterThan(3_000_000);
    expect(ranked.distanceMeters).toBeLessThan(20_000_000);
  });
});

describe('Looking board merge', () => {
  it('keeps one card per user and prefers the newer V2 row', () => {
    const older = boardRow({
      id: 'v1',
      user_id: 'u1',
      source: 'v1',
      created_at: new Date('2026-01-01T00:00:00Z'),
      rank_score: 10,
    });
    const newer = boardRow({
      id: 'v2',
      user_id: 'u1',
      source: 'v2',
      created_at: new Date('2026-01-01T00:05:00Z'),
      rank_score: 5,
    });
    const other = boardRow({
      id: 'v1-b',
      user_id: 'u2',
      rank_score: 1,
      created_at: new Date('2026-01-01T00:01:00Z'),
    });
    const merged = mergeLookingByUser([older, newer, other]);
    expect(merged.map((r) => r.user_id).sort()).toEqual(['u1', 'u2']);
    expect(merged.find((r) => r.user_id === 'u1')?.id).toBe('v2');
  });
});

describe('Looking request expiry', () => {
  it('treats expired rows as inactive (the live empty-board bug)', () => {
    const now = new Date('2026-09-13T16:00:00Z');
    const expired = new Date('2026-09-13T15:20:00Z');
    expect(isLookingRequestActive(expired, now)).toBe(false);
    expect(isLookingRequestActive(new Date(now.getTime() + LOOKING_TTL_MS), now)).toBe(true);
  });

  it('refreshes an expired V1 row on repeat POST /matchmaking/request', async () => {
    const existing = {
      id: 'lfm-1',
      userId: 'user-1',
      lat: 36.17,
      lon: -115.14,
      game: '8-ball',
      stakes: 'casual',
      minRating: 400,
      maxRating: 600,
      createdAt: new Date('2026-09-13T14:00:00Z'),
      expiresAt: new Date('2026-09-13T14:30:00Z'),
    };
    const qb = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const repo = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn((x) => x),
      save: jest.fn(async (row) => row),
      createQueryBuilder: jest.fn(() => qb),
    };
    const v2Repo = { createQueryBuilder: jest.fn(() => qb) };
    const gateway = { emitRequestCreated: jest.fn(), emitRequestCancelled: jest.fn(), emitMatchFound: jest.fn() };
    const svc = new MatchmakingService(
      repo as any,
      v2Repo as any,
      {} as any,
      gateway as any,
      {} as any,
      {} as any,
    );

    const saved = await svc.createRequest(
      {
        user_id: 'user-1',
        lat: 36.1699,
        lon: -115.1398,
        game: '9-ball',
        stakes: 'small',
        min_rating: 450,
        max_rating: 650,
      },
      'user-1',
    );

    expect(repo.save).toHaveBeenCalled();
    expect(saved.game).toBe('9-ball');
    expect(saved.stakes).toBe('small');
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now() + 20 * 60 * 1000);
    expect(isLookingRequestActive(saved.expiresAt)).toBe(true);
    expect(gateway.emitRequestCreated).toHaveBeenCalled();
    expect(repo.createQueryBuilder).toHaveBeenCalled();
  });

  it('does not create a match when the opponent has blocked the challenger', async () => {
    const matches = { create: jest.fn() };
    const chat = {
      getOrCreateDm: jest.fn().mockRejectedValue(Object.assign(new Error('blocked'), { status: 403 })),
      send: jest.fn(),
    };
    const users = {
      findById: jest.fn().mockResolvedValue({ id: 'u2', displayName: 'Pat' }),
    };
    const svc = new MatchmakingService(
      { createQueryBuilder: jest.fn() } as any,
      { createQueryBuilder: jest.fn() } as any,
      matches as any,
      { emitMatchFound: jest.fn() } as any,
      chat as any,
      users as any,
    );
    await expect(svc.challenge('u1', { opponentId: 'u2' })).rejects.toThrow(/blocked/);
    expect(chat.getOrCreateDm).toHaveBeenCalledWith('u1', 'u2', { allowNonFriends: true });
    expect(matches.create).not.toHaveBeenCalled();
    expect(chat.send).not.toHaveBeenCalled();
  });
});

describe('Looking board limits', () => {
  it('caps the public board so worldwide polls stay bounded', () => {
    expect(LOOKING_BOARD_LIMIT).toBe(50);
    const rows = Array.from({ length: 80 }, (_, i) =>
      boardRow({ id: `r${i}`, user_id: `u${i}`, rank_score: i }),
    );
    expect(mergeLookingByUser(rows).slice(0, LOOKING_BOARD_LIMIT)).toHaveLength(50);
  });

  it('hides leftover V1 cards after a V2 match but keeps a new PENDING card', () => {
    const matched = new Set(['u1']);
    const leftoverV1 = boardRow({ id: 'v1-old', user_id: 'u1', source: 'v1' });
    const newLive = boardRow({ id: 'v2-new', user_id: 'u1', source: 'v2' });
    const other = boardRow({ id: 'v2-b', user_id: 'u2', source: 'v2' });
    const kept = keepDiscoverableRows([leftoverV1, newLive, other], matched);
    expect(kept.map((r) => r.id).sort()).toEqual(['v2-b', 'v2-new']);
  });
});

describe('Avatar upload storage', () => {
  it('stores a data-URL under avatars/{userId}', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rackup-avatar-'));
    const prev = process.env.UPLOAD_DIR;
    process.env.UPLOAD_DIR = tmp;
    try {
      const storage = new ObjectStorageService();
      const put = await storage.putDataUrl('avatars/test-user', TINY_PNG);
      expect(put.backend).toBe('local');
      expect(put.key).toMatch(/^avatars\/test-user\//);
      expect(put.url).toContain('/uploads/');
      const filePath = path.join(tmp, put.key);
      const stat = await fs.stat(filePath);
      expect(stat.size).toBeGreaterThan(0);
    } finally {
      if (prev === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = prev;
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
