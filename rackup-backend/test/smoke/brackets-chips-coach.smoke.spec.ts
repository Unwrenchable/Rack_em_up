/**
 * Coach drill parser + elimination / chip-by-skill helpers (no live DB).
 * Run: npm run test:smoke
 */
import {
  drillsFromChatContent,
  drillsFromCoachResult,
  extractJsonValue,
} from '../../src/training/parse-coach-drills';
import {
  coachingTextFromResult,
  isDefaultLlmPlaceholder,
  isUnusableCoachEnvelope,
  isUnusableRealAiText,
} from '../../src/ai/realai-text-guard';
import {
  buildCoachAnalyzePayload,
  classifyVideoSource,
} from '../../src/training/video-analysis-payload';
import {
  classifyMatchSlots,
  dropsLoserToLosers,
  feederMatchIndices,
  isEliminationMode,
  isSingleElimFinal,
  losersDropPlacement,
  nextMatchPlacement,
  nextPowerOfTwo,
  winnersRoundsNeeded,
} from '../../src/tournaments/v2/bracket-advance';
import { TournamentV2Mode } from '../../src/tournaments/v2/entities/tournament-v2.entity';
import { TournamentBracketSide } from '../../src/tournaments/v2/entities/tournament-match-v2.entity';
import {
  CHIP_BAND_STACKS,
  CHIP_FORMULA_ID,
  CHIP_MATCH_POT,
  CHIP_SCOPE,
  chipTransferAmount,
  isChipBySkillEnabled,
  startingChipsForSkill,
} from '../../src/tournaments/v2/chip-by-skill';

describe('RealAI default_llm / plugin text guard', () => {
  it('rejects the live Render chat/completions config error', () => {
    const live =
      'Local RealAI is selected, but no local model is configured/loaded yet. Register a local model and set it as default_llm, then retry.';
    expect(isUnusableRealAiText(live)).toBe(true);
    expect(coachingTextFromResult(live)).toBeNull();
    expect(coachingTextFromResult({ analysis: live })).toBeNull();
  });

  it('accepts real coaching text from rackup-coach', () => {
    expect(
      coachingTextFromResult({
        analysis: 'Pause on the last alignment. Eye on the object ball.',
      }),
    ).toMatch(/object ball/);
    expect(isUnusableRealAiText('Pause on the last alignment.')).toBe(false);
  });

  it('rejects a plugin envelope that wraps the placeholder', () => {
    const live =
      'Local RealAI is selected, but no local model is configured/loaded yet. Register a local model and set it as default_llm, then retry.';
    expect(isDefaultLlmPlaceholder(live)).toBe(true);
    expect(isDefaultLlmPlaceholder('')).toBe(false);
    expect(
      isUnusableCoachEnvelope({
        ok: true,
        error: live,
        result: { analysis: live },
      }),
    ).toBe(true);
    expect(
      isUnusableCoachEnvelope({
        ok: true,
        result: { analysis: 'Pause on the last alignment.' },
      }),
    ).toBe(false);
  });

  it('formats recommended_drills from video_analysis', () => {
    const text = coachingTextFromResult({
      analysis: 'Cue ball drifted right on the last stun.',
      recommended_drills: [
        { title: 'Stop shot ladder', description: '15 center-table stops' },
        '10 follow / draw pairs',
      ],
    });
    expect(text).toMatch(/Cue ball drifted/);
    expect(text).toMatch(/Stop shot ladder/);
    expect(text).toMatch(/follow \/ draw/);
    expect(text).not.toMatch(/default_llm/);
  });
});

describe('video_analysis payload (URL + observations, no bytes)', () => {
  it('classifies YouTube, upload, and generic URLs', () => {
    expect(classifyVideoSource('https://youtube.com/shorts/b3ZlStHTwKc')).toBe(
      'youtube',
    );
    expect(classifyVideoSource('https://youtu.be/abc')).toBe('youtube');
    expect(classifyVideoSource('https://api.example.com/uploads/clips/x.mp4')).toBe(
      'upload',
    );
    expect(classifyVideoSource('https://cdn.example.com/shot.mp4')).toBe('url');
    expect(classifyVideoSource('')).toBe('none');
  });

  it('builds video_meta without raw bytes', () => {
    const payload = buildCoachAnalyzePayload({
      videoUrl: 'https://youtube.com/shorts/b3ZlStHTwKc',
      notes: 'Long straight missed thin',
      game: '9-ball',
      focus: 'cue-ball-control',
    });
    expect(payload.mode).toBe('video_analysis');
    expect(payload.video_meta).toEqual({
      url: 'https://youtube.com/shorts/b3ZlStHTwKc',
      source: 'youtube',
      kind: 'youtube',
      bytes_included: false,
    });
    expect(payload.observations).toBe('Long straight missed thin');
    expect(payload.prefer_local).toBe(false);
    expect(payload.vision_bytes).toBe(false);
    expect(JSON.stringify(payload)).not.toMatch(/default_llm/);
  });
});

describe('Coach drill parse (RealAI reachable must not false-fallback)', () => {
  it('reads rackup-coach practice_plan.blocks', () => {
    const drills = drillsFromCoachResult({
      practice_plan: {
        duration_minutes: 45,
        blocks: [
          { order: 1, skill: 'position_play', minutes: 15, drill: 'Stop shot ladder' },
          { order: 2, skill: 'banks', minutes: 12, drill: 'Cross-corner banks', difficulty: 'Hard' },
          { order: 3, skill: 'break', minutes: 10, drill: 'Break box', description: '10 breaks' },
        ],
      },
    });
    expect(drills).toHaveLength(3);
    expect(drills![0].title).toBe('Stop shot ladder');
    expect(drills![0].source).toBe('realai');
    expect(drills![1].difficulty).toBe('Hard');
  });

  it('reads fenced JSON that used to trip the bare-array parser', () => {
    const content = [
      'Here are your drills:',
      '```json',
      JSON.stringify({
        drills: [
          { title: 'Stun lines', focus: 'CB', minutes: 12, difficulty: 'Medium', description: 'Center-table stun' },
          { title: 'Thin cuts', focus: 'Aim', minutes: 10, difficulty: 'Easy', description: 'Half-ball cuts' },
        ],
      }),
      '```',
    ].join('\n');
    const drills = drillsFromChatContent(content);
    expect(drills?.length).toBeGreaterThanOrEqual(2);
    expect(drills![0].title).toBe('Stun lines');
    expect(extractJsonValue(content)).toBeTruthy();
  });

  it('reads numbered prose when JSON is missing', () => {
    const drills = drillsFromChatContent(
      [
        '1. Long pot ladder — 15 straight-ins, leave the cue ball center.',
        '2. Bank ladder from five spots until you make eight of ten.',
        '3. Break box: ten breaks, log the second-ball pocket.',
      ].join('\n'),
    );
    expect(drills).toHaveLength(3);
    expect(drills![0].title.toLowerCase()).toContain('long pot');
  });

  it('returns null for empty / unreadable payloads (true fallback)', () => {
    expect(drillsFromCoachResult(null)).toBeNull();
    expect(drillsFromCoachResult({})).toBeNull();
    expect(drillsFromChatContent('ok')).toBeNull();
  });
});

describe('Single / double elimination advance rules', () => {
  it('never drops losers in SINGLE_ELIMINATION', () => {
    expect(dropsLoserToLosers(TournamentV2Mode.SINGLE_ELIMINATION)).toBe(false);
    expect(dropsLoserToLosers(TournamentV2Mode.DOUBLE_ELIMINATION)).toBe(true);
    expect(dropsLoserToLosers(TournamentV2Mode.CHIP_RACE)).toBe(false);
    expect(isEliminationMode(TournamentV2Mode.ROUND_ROBIN)).toBe(false);
  });

  it('pads odd fields with byes and completes SE at the last winners round', () => {
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(winnersRoundsNeeded(3)).toBe(2);
    expect(winnersRoundsNeeded(2)).toBe(1);
    expect(winnersRoundsNeeded(5)).toBe(3);
    expect(
      isSingleElimFinal(
        TournamentV2Mode.SINGLE_ELIMINATION,
        TournamentBracketSide.WINNERS,
        2,
        3,
      ),
    ).toBe(true);
    expect(
      isSingleElimFinal(
        TournamentV2Mode.SINGLE_ELIMINATION,
        TournamentBracketSide.WINNERS,
        1,
        3,
      ),
    ).toBe(false);
    expect(
      isSingleElimFinal(
        TournamentV2Mode.DOUBLE_ELIMINATION,
        TournamentBracketSide.WINNERS,
        2,
        4,
      ),
    ).toBe(false);
  });

  it('places winners in the next slot and DE losers on the losers side', () => {
    expect(nextMatchPlacement(1, 1)).toEqual({
      nextRound: 2,
      nextMatchIndex: 1,
      asPlayerA: true,
    });
    expect(nextMatchPlacement(1, 2)).toEqual({
      nextRound: 2,
      nextMatchIndex: 1,
      asPlayerA: false,
    });
    expect(losersDropPlacement(1, 1)).toEqual({
      losersRound: 1,
      losersMatchIndex: 1,
      asPlayerA: true,
    });
    expect(losersDropPlacement(1, 2)).toEqual({
      losersRound: 1,
      losersMatchIndex: 1,
      asPlayerA: false,
    });
  });

  it('classifies bye vs ready matches', () => {
    expect(classifyMatchSlots('a', 'b')).toBe('ready');
    expect(classifyMatchSlots('a', null)).toBe('bye-a');
    expect(classifyMatchSlots(null, 'b')).toBe('bye-b');
    expect(classifyMatchSlots(null, null)).toBe('empty');
  });
});

describe('Chip-by-skill band_v1', () => {
  it('is in-event stacks only (not wallet cash)', () => {
    expect(CHIP_SCOPE).toBe('in_event_stacks');
    expect(CHIP_FORMULA_ID).toBe('band_v1');
  });

  it('gives weaker bands more starting chips', () => {
    expect(startingChipsForSkill({ rating: 300, ratingBand: 'Novice' }).chips).toBe(
      CHIP_BAND_STACKS.Novice,
    );
    expect(startingChipsForSkill({ rating: 500 }).chips).toBe(CHIP_BAND_STACKS.Advanced);
    expect(startingChipsForSkill({ rating: 720 }).chips).toBe(CHIP_BAND_STACKS.Elite);
    expect(startingChipsForSkill({ rating: 500 }).formula).toBe(CHIP_FORMULA_ID);
    expect(CHIP_BAND_STACKS.Novice).toBeGreaterThan(CHIP_BAND_STACKS.Elite);
  });

  it('enables chips for CHIP_RACE or format_config.chipBySkill', () => {
    expect(isChipBySkillEnabled('CHIP_RACE', {})).toBe(true);
    expect(isChipBySkillEnabled('SINGLE_ELIMINATION', { chipBySkill: true })).toBe(true);
    expect(isChipBySkillEnabled('SINGLE_ELIMINATION', {})).toBe(false);
  });

  it('caps match pot at the loser stack', () => {
    expect(chipTransferAmount(400, CHIP_MATCH_POT)).toBe(400);
    expect(chipTransferAmount(5000)).toBe(CHIP_MATCH_POT);
  });
});

/** In-memory report-match — same placement rules as TournamentsV2Service. */
type SimMatch = {
  id: string;
  round: number;
  matchIndex: number;
  playerAId: string | null;
  playerBId: string | null;
  bracket: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';
  status: 'ACTIVE' | 'COMPLETED';
  winnerId: string | null;
};

function pairRound1(entrants: string[]): SimMatch[] {
  const size = nextPowerOfTwo(entrants.length || 1);
  const seeded = [...entrants, ...new Array(size - entrants.length).fill(null)];
  const matches: SimMatch[] = [];
  for (let i = 0; i < seeded.length; i += 2) {
    if (!seeded[i] && !seeded[i + 1]) continue;
    matches.push({
      id: `w1-${i / 2 + 1}`,
      round: 1,
      matchIndex: i / 2 + 1,
      playerAId: seeded[i],
      playerBId: seeded[i + 1],
      bracket: 'WINNERS',
      status: 'ACTIVE',
      winnerId: null,
    });
  }
  return matches;
}

function place(
  matches: SimMatch[],
  round: number,
  matchIndex: number,
  playerId: string,
  bracket: SimMatch['bracket'],
) {
  const { nextRound, nextMatchIndex, asPlayerA } = nextMatchPlacement(round, matchIndex);
  let next = matches.find(
    (m) => m.round === nextRound && m.matchIndex === nextMatchIndex && m.bracket === bracket,
  );
  if (!next) {
    next = {
      id: `${bracket}-${nextRound}-${nextMatchIndex}`,
      round: nextRound,
      matchIndex: nextMatchIndex,
      playerAId: null,
      playerBId: null,
      bracket,
      status: 'ACTIVE',
      winnerId: null,
    };
    matches.push(next);
  }
  if (asPlayerA) next.playerAId = playerId;
  else next.playerBId = playerId;
}

function hasPendingFeeder(matches: SimMatch[], m: SimMatch): boolean {
  const feed = feederMatchIndices(m.round, m.matchIndex);
  if (!feed) return false;
  const emptyA = !m.playerAId;
  const emptyB = !m.playerBId;
  for (const idx of feed.indices) {
    const feeder = matches.find(
      (x) => x.round === feed.prevRound && x.matchIndex === idx && x.bracket === m.bracket,
    );
    if (!feeder) continue;
    if (feeder.status !== 'COMPLETED') {
      const fillsA = idx % 2 === 1;
      if (fillsA && emptyA) return true;
      if (!fillsA && emptyB) return true;
    }
  }
  return false;
}

function resolveByes(matches: SimMatch[], mode: TournamentV2Mode, n: number): string | null {
  let champion: string | null = null;
  let progressed = true;
  let guard = 0;
  while (progressed && guard++ < 16) {
    progressed = false;
    for (const m of [...matches]) {
      if (m.status !== 'ACTIVE') continue;
      const kind = classifyMatchSlots(m.playerAId, m.playerBId);
      if (kind !== 'bye-a' && kind !== 'bye-b') continue;
      if (hasPendingFeeder(matches, m)) continue;
      const winner = kind === 'bye-a' ? m.playerAId : m.playerBId;
      if (!winner) continue;
      m.status = 'COMPLETED';
      m.winnerId = winner;
      progressed = true;
      if (isSingleElimFinal(mode, m.bracket, m.round, n)) {
        champion = winner;
      } else {
        place(matches, m.round, m.matchIndex, winner, m.bracket);
      }
    }
  }
  return champion;
}

function reportSim(
  matches: SimMatch[],
  matchId: string,
  winnerId: string,
  mode: TournamentV2Mode,
  n: number,
): { champion: string | null } {
  const match = matches.find((m) => m.id === matchId);
  if (!match) throw new Error('missing match');
  match.status = 'COMPLETED';
  match.winnerId = winnerId;
  if (isSingleElimFinal(mode, match.bracket, match.round, n)) {
    return { champion: winnerId };
  }
  place(matches, match.round, match.matchIndex, winnerId, match.bracket);
  if (match.bracket === 'WINNERS' && dropsLoserToLosers(mode)) {
    const loser = winnerId === match.playerAId ? match.playerBId : match.playerAId;
    if (loser) {
      const slot = losersDropPlacement(match.round, match.matchIndex);
      let next = matches.find(
        (m) =>
          m.round === slot.losersRound &&
          m.matchIndex === slot.losersMatchIndex &&
          m.bracket === 'LOSERS',
      );
      if (!next) {
        next = {
          id: `L-${slot.losersRound}-${slot.losersMatchIndex}`,
          round: slot.losersRound,
          matchIndex: slot.losersMatchIndex,
          playerAId: null,
          playerBId: null,
          bracket: 'LOSERS',
          status: 'ACTIVE',
          winnerId: null,
        };
        matches.push(next);
      }
      if (slot.asPlayerA) next.playerAId = loser;
      else next.playerBId = loser;
    }
  }
  const champ = resolveByes(matches, mode, n);
  return { champion: champ };
}

describe('In-memory report-match (live SE3 / DE4 repro)', () => {
  it('SINGLE_ELIMINATION with 3 entrants never grows a LOSERS match and completes', () => {
    const entrants = ['p1', 'p2', 'p3'];
    const matches = pairRound1(entrants);
    resolveByes(matches, TournamentV2Mode.SINGLE_ELIMINATION, 3);

    const playable = matches.find(
      (m) => m.status === 'ACTIVE' && m.playerAId && m.playerBId,
    );
    expect(playable).toBeTruthy();
    reportSim(
      matches,
      playable!.id,
      playable!.playerAId!,
      TournamentV2Mode.SINGLE_ELIMINATION,
      3,
    );
    expect(matches.filter((m) => m.bracket === 'LOSERS')).toHaveLength(0);

    const final = matches.find((m) => m.round === 2 && m.status === 'ACTIVE');
    expect(final?.playerAId && final?.playerBId).toBeTruthy();
    const done = reportSim(
      matches,
      final!.id,
      final!.playerAId!,
      TournamentV2Mode.SINGLE_ELIMINATION,
      3,
    );
    expect(done.champion).toBe(final!.playerAId);
    expect(matches.some((m) => m.bracket === 'LOSERS')).toBe(false);
  });

  it('DOUBLE_ELIMINATION with 4 entrants keeps losers and reaches both sides', () => {
    const entrants = ['a', 'b', 'c', 'd'];
    const matches = pairRound1(entrants);
    expect(matches.filter((m) => m.bracket === 'WINNERS')).toHaveLength(2);

    for (const m of [...matches].filter((x) => x.round === 1 && x.bracket === 'WINNERS')) {
      reportSim(matches, m.id, m.playerAId!, TournamentV2Mode.DOUBLE_ELIMINATION, 4);
    }

    const losers = matches.filter((m) => m.bracket === 'LOSERS');
    expect(losers.length).toBeGreaterThanOrEqual(1);
    expect(losers.some((m) => m.playerAId && m.playerBId)).toBe(true);

    const winnersFinal = matches.find((m) => m.round === 2 && m.bracket === 'WINNERS');
    expect(winnersFinal?.playerAId && winnersFinal?.playerBId).toBeTruthy();
  });
});
