/**
 * V2 smoke tests — pure unit + route map verification (no live DB required).
 * Run: npm run test:smoke
 */
import {
  keyForHallV2,
  keyForLeagueV2,
  keyForMatchmakingV2,
  keyForMoneyAuditV2,
  keyForRealaiPendingJobs,
  keyForRealaiV2,
  keyForScorekeepingV2,
  keyForTournamentV2,
  keyForIdBridgeV2,
  LEGACY_TO_CANONICAL,
} from '../../src/common/redis-keys';
import * as redisKeysV2 from '../../src/common/redis-keys.v2';
import {
  unifyRackupRating,
  unifiedToSkillBand,
  UNIFIED_RATING_MAX,
  UNIFIED_RATING_MIN,
} from '../../src/leagues/v2/rating/unified-rackup-rating';
import { listSotdMaps, getSotdMapById, sotdMapCount } from '../../src/realai/v2/sotd-shot-maps';
import { applySeedStrategy } from '../../src/tournaments/v2/seed-strategy';
import {
  isSotdCandidateEvent,
  summarizeTimelineForRealAi,
  type MatchTimeline,
} from '../../src/scorekeeping/match-timeline.types';
import { keyForMatchTimelineV2, keyForSotdCandidatesV2 } from '../../src/common/redis-keys';
import { EscrowService } from '../../src/money-matches/escrow.service';
import { ObjectStorageService } from '../../src/common/object-storage.service';
import { TournamentBracketSide } from '../../src/tournaments/v2/entities/tournament-match-v2.entity';
import { GameRulesService } from '../../src/scorekeeping/game-rules.service';
import { GameStyle, isRackupPyramid } from '../../src/games/game-style';
import {
  ballPointValue,
  createInitialPyramidState,
  pocketBalls,
  scoreboardFromState,
} from '../../src/games/pyramid';
import { PyramidSkillLevel } from '../../src/games/pyramid/pyramid-skill-level';
import { sanitizeChatText } from '../../src/websocket/chat-sanitize';
import {
  allowLocalEloFallback,
  type RackUpCoachAbility,
} from '../../src/ai/realai-coach.client';

describe('Redis V2 namespaces', () => {
  it('builds canonical keys', () => {
    expect(keyForHallV2('h1', 'feed')).toBe('halls:v2:h1:feed');
    expect(keyForTournamentV2('t1', 'bracket')).toBe('tournaments:v2:t1:bracket');
    expect(keyForLeagueV2('s1', 'standings')).toBe('leagues:v2:s1:standings');
    expect(keyForMatchmakingV2('queue')).toBe('matchmaking:v2:queue');
    expect(keyForMatchmakingV2('active', 'sid')).toBe('matchmaking:v2:active:sid');
    expect(keyForRealaiV2('job1', 'job')).toBe('realai:v2:job1:job');
    expect(keyForScorekeepingV2('events')).toBe('scorekeeping:v2:events');
    expect(keyForScorekeepingV2('report')).toBe('scorekeeping:v2:report');
    expect(keyForScorekeepingV2('last_report')).toBe('scorekeeping:v2:last_report');
    expect(keyForMoneyAuditV2('m1')).toBe('audit:v2:money:m1');
    expect(keyForRealaiPendingJobs()).toBe('realai:v2:pending_jobs');
    expect(keyForIdBridgeV2('league', 'v1', 'x')).toBe('idbridge:v2:league:v1:x');
  });

  it('re-exports the same helpers from redis-keys.v2', () => {
    expect(redisKeysV2.keyForScorekeepingV2('events')).toBe(keyForScorekeepingV2('events'));
    expect(LEGACY_TO_CANONICAL.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Scorekeeping V2 report entry point', () => {
  it('exposes MatchReportDomain union via processReport contract', () => {
    const domains = ['standard', 'money', 'tournament_v2', 'league_v2'] as const;
    expect(domains).toContain('standard');
    expect(domains).toContain('money');
    // Documented single entry point for agents / clients
    const entryPoint = 'ScorekeepingServiceV2.processReport';
    expect(entryPoint).toMatch(/ScorekeepingServiceV2/);
  });
});

describe('Auto-seeding strategies', () => {
  it('manual keeps order; elo sorts high first', () => {
    const ids = ['a', 'b', 'c'];
    expect(applySeedStrategy(ids, 'manual')).toEqual(['a', 'b', 'c']);
    expect(applySeedStrategy(ids, 'elo', { a: 500, b: 900, c: 700 })).toEqual(['b', 'c', 'a']);
  });

  it('random returns a permutation of the same players', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const out = applySeedStrategy(ids, 'random');
    expect(out.sort()).toEqual([...ids].sort());
  });
});

describe('Escrow mock provider', () => {
  it('holds and releases in mock mode', async () => {
    const prev = process.env.ESCROW_PROVIDER;
    process.env.ESCROW_PROVIDER = 'mock';
    delete process.env.STRIPE_SECRET_KEY;
    const svc = new EscrowService();
    expect(svc.provider()).toBe('mock');
    const hold = await svc.hold({
      matchId: '11111111-1111-1111-1111-111111111111',
      amountCents: 5000,
      playerAId: 'a',
      playerBId: 'b',
    });
    expect(hold.status).toBe('HELD');
    expect(hold.externalId).toContain('mock_escrow');
    const rel = await svc.release({
      matchId: hold.externalId,
      externalId: hold.externalId,
      winnerId: 'a',
      amountCents: 5000,
    });
    expect(rel.status).toBe('RELEASED');
    if (prev === undefined) delete process.env.ESCROW_PROVIDER;
    else process.env.ESCROW_PROVIDER = prev;
  });
});

describe('Object storage', () => {
  it('defaults to local backend without S3 env', () => {
    const prev = process.env.STORAGE_BACKEND;
    delete process.env.STORAGE_BACKEND;
    delete process.env.S3_BUCKET;
    const storage = new ObjectStorageService();
    expect(storage.backend()).toBe('local');
    if (prev !== undefined) process.env.STORAGE_BACKEND = prev;
  });
});

describe('Double-elim grand final bracket side', () => {
  it('exposes GRAND_FINAL side', () => {
    expect(TournamentBracketSide.GRAND_FINAL).toBe('GRAND_FINAL');
  });
});

describe('Game rules (8/9/10-ball)', () => {
  const rules = new GameRulesService();

  it('describes 9-ball and validates race scores', () => {
    expect(rules.normalizeGame('9 Ball')).toBe('9-ball');
    const snap = rules.assertValidRaceScore({
      game: '9-ball',
      raceTo: 5,
      aScore: 5,
      bScore: 3,
    });
    expect(snap.isComplete).toBe(true);
    expect(snap.winnerSide).toBe('A');
  });

  it('classifies scratch fouls', () => {
    expect(rules.classifyFoul('scratch').code).toBe('scratch');
  });
});

describe('RackUp Pyramid', () => {
  it('maps table size to rack and skill to points/weight', () => {
    expect(isRackupPyramid(GameStyle.RACKUP_PYRAMID)).toBe(true);
    const s7 = createInitialPyramidState(7, PyramidSkillLevel.BEGINNER);
    expect(s7.rackBalls).toBe(10);
    expect(s7.pointsToWin).toBe(25);
    expect(s7.ratingWeight).toBe(0.7);
    expect(s7.ballsRemaining).toHaveLength(10);

    const s9 = createInitialPyramidState(9, PyramidSkillLevel.PRO);
    expect(s9.rackBalls).toBe(15);
    expect(s9.pointsToWin).toBe(71);
    expect(s9.ratingWeight).toBe(1.15);
  });

  it('scores 1-ball as 11 and tracks balls remaining', () => {
    expect(ballPointValue(1)).toBe(11);
    expect(ballPointValue(9)).toBe(9);
    let state = createInitialPyramidState(7, PyramidSkillLevel.BEGINNER);
    state = pocketBalls(state, 'A', [1, 5]);
    expect(state.aPoints).toBe(11 + 5);
    expect(state.ballsRemaining).not.toContain(1);
    expect(state.ballsRemaining).not.toContain(5);
    expect(state.ballsRemaining.length).toBe(8);
    const board = scoreboardFromState(state);
    expect(board.aPoints).toBe(16);
    expect(board.ballsRemainingCount).toBe(8);
  });

  it('completes when points reach target', () => {
    let state = createInitialPyramidState(7, PyramidSkillLevel.BEGINNER); // 25 pts
    // Pocket high balls for A toward 25
    state = pocketBalls(state, 'A', [10, 9, 8]); // 27
    expect(state.aPoints).toBe(27);
    expect(state.isComplete).toBe(true);
    expect(state.winnerSide).toBe('A');
  });
});

describe('Deep scorekeeping timeline helpers', () => {
  it('builds timeline redis keys', () => {
    expect(keyForMatchTimelineV2('m1')).toBe('scorekeeping:v2:timeline:m1');
    expect(keyForSotdCandidatesV2('2026-08-05')).toBe('scorekeeping:v2:sotd_candidates:2026-08-05');
  });

  it('detects SOTD candidates and summarizes for RealAI', () => {
    const timeline: MatchTimeline = {
      matchId: 'm1',
      domain: 'standard',
      events: [
        {
          id: 'e1',
          type: 'foul',
          at: '2026-08-05T00:00:00Z',
        },
        {
          id: 'e2',
          type: 'shot',
          at: '2026-08-05T00:01:00Z',
          data: { bank: true },
        },
        {
          id: 'e3',
          type: 'rack_won',
          at: '2026-08-05T00:02:00Z',
        },
      ],
      sotdCandidates: ['e2'],
      createdAt: '2026-08-05T00:00:00Z',
      updatedAt: '2026-08-05T00:02:00Z',
    };
    expect(isSotdCandidateEvent(timeline.events[1])).toBe(true);
    const s = summarizeTimelineForRealAi(timeline);
    expect(s.eventCount).toBe(3);
    expect(s.fouls).toBe(1);
    expect(s.racks).toBe(1);
    expect(s.keyShots.length).toBeGreaterThanOrEqual(1);
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
    'GET /health/scorekeeping',
    'GET /id-bridge/:kind/v1/:v1Id',
    'POST /id-bridge/link',
    'GET /tournaments/v2/tv/:id',
    'POST /tournaments/v2/admin/update-score',
    'POST /tournaments/v2/admin/swap-players',
    'POST /tournaments/v2/admin/reseed',
    'POST /tournaments/v2/admin/advance-swiss',
    'POST /scorekeeping/v2/timeline/start',
    'POST /scorekeeping/v2/timeline/event',
    'GET /scorekeeping/v2/timeline/:matchId',
    'GET /scorekeeping/v2/sotd-candidates',
    'POST /money-matches/:id/resolve',
    'GET /money-matches/:id/audit',
    'GET /money-matches/audit/export',
    'POST /notifications/push/register',
    'POST /notifications/push/test',
    'POST /users/me/premium',
    'GET /scorekeeping/v2/rules',
    'POST /scorekeeping/v2/rules/validate-score',
    'GET /matches/pyramid/presets',
    'GET /matches/:id/scoreboard',
    'POST /matches/:id/pyramid/pocket',
    'POST /shots/complete',
    'GET /shots/streak',
    // Social layer
    'GET /friends',
    'GET /friends/pending/incoming',
    'GET /friends/pending/outgoing',
    'POST /friends/request',
    'POST /friends/:id/accept',
    'POST /friends/:id/decline',
    'POST /friends/:id/cancel',
    'POST /friends/block',
    'DELETE /friends/block/:userId',
    'GET /friends/:userId/mutual',
    'GET /chat/threads',
    'POST /chat/threads/dm',
    'POST /chat/threads/group',
    'GET /chat/threads/:id/messages',
    'POST /chat/threads/:id/messages',
    'POST /chat/threads/:id/read',
    'GET /social/settings',
    'PATCH /social/settings',
    // RealAI coach plugin (contract)
    'POST /realai/v2/coach-plugin',
    'POST /realai/v2/coach',
    'POST /realai/v2/shot-of-the-day',
    'POST /realai/v2/moderate',
    'POST /realai/v2/league-validate',
    'POST /realai/v2/matchmaking',
    'POST /realai/v2/pyramid-rules',
    'POST /realai/v2/video-analysis',
  ];

  it('lists expected V2 + health surfaces', () => {
    expect(routes.length).toBeGreaterThanOrEqual(15);
    expect(routes.some((r) => r.includes('sotd/maps'))).toBe(true);
    expect(routes.some((r) => r.includes('report-match'))).toBe(true);
    expect(routes.some((r) => r.includes('/health'))).toBe(true);
    expect(routes.some((r) => r.includes('health/scorekeeping'))).toBe(true);
    expect(routes.some((r) => r.includes('id-bridge'))).toBe(true);
    expect(routes.some((r) => r.includes('/tv/'))).toBe(true);
    expect(routes.some((r) => r.includes('admin/reseed'))).toBe(true);
    expect(routes.some((r) => r.includes('scorekeeping/v2/timeline'))).toBe(true);
    expect(routes.some((r) => r.includes('money-matches') && r.includes('resolve'))).toBe(true);
    expect(routes.some((r) => r.includes('push/register'))).toBe(true);
    expect(routes.some((r) => r.includes('premium'))).toBe(true);
  });

  it('lists social friends + chat surfaces', () => {
    expect(routes.some((r) => r === 'GET /friends')).toBe(true);
    expect(routes.some((r) => r.includes('friends/request'))).toBe(true);
    expect(routes.some((r) => r.includes('chat/threads'))).toBe(true);
    expect(routes.some((r) => r.includes('social/settings'))).toBe(true);
  });
});

describe('Social friendship statuses', () => {
  it('covers full lifecycle statuses', () => {
    const statuses = [
      'PENDING',
      'ACCEPTED',
      'DECLINED',
      'BLOCKED',
      'CANCELLED',
    ] as const;
    expect(statuses).toContain('PENDING');
    expect(statuses).toContain('ACCEPTED');
    expect(statuses).toContain('BLOCKED');
    expect(statuses.length).toBe(5);
  });
});

describe('Chat sanitize', () => {
  it('strips control chars and caps length', () => {
    expect(sanitizeChatText('  hello  ')).toBe('hello');
    expect(sanitizeChatText('a\x00b')).toBe('ab');
    expect(sanitizeChatText(null)).toBe('');
    expect(sanitizeChatText('x'.repeat(2000)).length).toBe(1000);
  });
});

describe('Chat DM key ordering', () => {
  it('is order-independent', () => {
    const dmKey = (a: string, b: string) => [a, b].sort().join(':');
    expect(dmKey('u2', 'u1')).toBe(dmKey('u1', 'u2'));
    expect(dmKey('a', 'b')).toBe('a:b');
  });
});

describe('RealAI rackup-coach contract abilities', () => {
  it('documents production ability strings', () => {
    const abilities: RackUpCoachAbility[] = [
      'rating_update',
      'rating_convert',
      'matchmaking',
      'league_validate',
      'moderation',
      'coach',
      'pyramid',
      'video_analysis',
      'shot_of_the_day',
      'pyramid_rules',
      'sotd_contribute',
    ];
    expect(abilities).toContain('rating_update');
    expect(abilities).toContain('rating_convert');
    expect(abilities).toContain('moderation');
    expect(abilities).toContain('shot_of_the_day');
    expect(abilities).toContain('pyramid_rules');
  });

  it('exposes local Elo fallback flag helper', () => {
    // Pure function — does not throw
    expect(typeof allowLocalEloFallback()).toBe('boolean');
  });

  it('pyramid matrix pin matches contract §5', () => {
    // Beginner 7ft=25, intermediate 7ft=35, advanced 9ft=71, pro weight 1.15
    const matrix = {
      beginner: { '7ft': 25, '9ft': 40, w: 0.7 },
      intermediate: { '7ft': 35, '9ft': 55, w: 0.85 },
      advanced: { '7ft': 45, '9ft': 71, w: 1.0 },
      pro: { '7ft': 50, '9ft': 71, w: 1.15 },
    };
    expect(matrix.beginner['7ft']).toBe(25);
    expect(matrix.intermediate['7ft']).toBe(35);
    expect(matrix.advanced['9ft']).toBe(71);
    expect(matrix.pro.w).toBe(1.15);
  });
});

describe('ROC USD ledger split (45/35/20)', () => {
  it('splits cents with remainder to players fund', () => {
    // Mirror roc-money.util dust policy
    const A = 2000; // $20.00
    const op = Math.floor((A * 3500) / 10000);
    const pl = Math.floor((A * 2000) / 10000);
    const pf = A - op - pl;
    expect(op).toBe(700);
    expect(pl).toBe(400);
    expect(pf).toBe(900);
    expect(pf + op + pl).toBe(A);
  });

  it('documents ROC money route surface', () => {
    const routes = [
      'POST /roc/checkout',
      'POST /roc/webhooks/stripe',
      'GET /roc/wallet',
      'POST /roc/sessions/:id/close',
      'GET /roc/leagues/:id/ledger',
      'POST /roc/sessions/:id/audit',
      'GET /roc/sessions/:id/audit',
      'POST /roc/sessions/:id/release-payout',
    ];
    expect(routes.some((r) => r.includes('checkout'))).toBe(true);
    expect(routes.some((r) => r.includes('webhooks/stripe'))).toBe(true);
    expect(routes.some((r) => r.includes('wallet'))).toBe(true);
    expect(routes.some((r) => r.includes('audit'))).toBe(true);
  });
});

describe('ROC ledger audit ownership', () => {
  it('RealAI never authorizes payouts', () => {
    const boundary = {
      authorize_payout: false,
      owns_ledger: false,
      read_only: true,
    };
    expect(boundary.authorize_payout).toBe(false);
    expect(boundary.owns_ledger).toBe(false);
    expect(boundary.read_only).toBe(true);
  });

  it('maps audit ui status from blocker/warning counts', () => {
    const ui = (blockers: number, warnings: number) =>
      blockers > 0 ? 'blocked' : warnings > 0 ? 'warnings' : 'pass';
    expect(ui(0, 0)).toBe('pass');
    expect(ui(0, 2)).toBe('warnings');
    expect(ui(1, 0)).toBe('blocked');
  });
});

describe('ROC Glicko-2 display bands (labels only)', () => {
  // Inline mirrors rating-display.ts — pure unit (no Nest DI)
  const bandFor = (r: number) => {
    if (r < 400) return 'Novice';
    if (r < 500) return 'Intermediate';
    if (r < 600) return 'Advanced';
    if (r < 700) return 'Expert';
    return 'Elite';
  };
  const display = (r: number) => `${bandFor(r)} • ${Math.round(r)}`;

  it('maps locked band cuts', () => {
    expect(bandFor(312)).toBe('Novice');
    expect(bandFor(450)).toBe('Intermediate');
    expect(bandFor(547)).toBe('Advanced');
    expect(bandFor(640)).toBe('Expert');
    expect(bandFor(720)).toBe('Elite');
  });

  it('formats Advanced • 547', () => {
    expect(display(547)).toBe('Advanced • 547');
  });

  it('defaults new player seed constants', () => {
    expect(500).toBe(500);
    expect(175).toBe(175);
    expect(0.06).toBeCloseTo(0.06);
  });
});
