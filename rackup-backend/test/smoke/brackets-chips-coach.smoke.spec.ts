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
  classifyMatchSlots,
  dropsLoserToLosers,
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
  chipTransferAmount,
  isChipBySkillEnabled,
  startingChipsForSkill,
} from '../../src/tournaments/v2/chip-by-skill';

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
