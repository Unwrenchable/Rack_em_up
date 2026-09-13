import { TournamentV2Mode } from './entities/tournament-v2.entity';
import { TournamentBracketSide } from './entities/tournament-match-v2.entity';

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < Math.max(1, n)) p *= 2;
  return p;
}

/** Winners-bracket rounds needed for a power-of-two single-elim field (byes pad). */
export function winnersRoundsNeeded(entrantCount: number): number {
  const size = nextPowerOfTwo(Math.max(2, entrantCount));
  return Math.round(Math.log2(size));
}

export function nextMatchPlacement(
  round: number,
  matchIndex: number,
): { nextRound: number; nextMatchIndex: number; asPlayerA: boolean } {
  return {
    nextRound: round + 1,
    nextMatchIndex: Math.ceil(matchIndex / 2),
    asPlayerA: matchIndex % 2 === 1,
  };
}

/** Loser of winners R{n} M{i} drops into losers R{n} ceil(i/2). */
export function losersDropPlacement(
  winnersRound: number,
  winnersMatchIndex: number,
): { losersRound: number; losersMatchIndex: number; asPlayerA: boolean } {
  return {
    losersRound: winnersRound,
    losersMatchIndex: Math.ceil(winnersMatchIndex / 2),
    asPlayerA: winnersMatchIndex % 2 === 1,
  };
}

export function dropsLoserToLosers(mode: string | TournamentV2Mode): boolean {
  return mode === TournamentV2Mode.DOUBLE_ELIMINATION;
}

export function isEliminationMode(mode: string | TournamentV2Mode): boolean {
  return (
    mode === TournamentV2Mode.SINGLE_ELIMINATION ||
    mode === TournamentV2Mode.DOUBLE_ELIMINATION
  );
}

export function isSingleElimFinal(
  mode: string | TournamentV2Mode,
  bracket: string | TournamentBracketSide,
  round: number,
  entrantCount: number,
): boolean {
  return (
    mode === TournamentV2Mode.SINGLE_ELIMINATION &&
    bracket === TournamentBracketSide.WINNERS &&
    round >= winnersRoundsNeeded(entrantCount)
  );
}

/** Previous-round match indices that feed this slot (1-based). */
export function feederMatchIndices(
  round: number,
  matchIndex: number,
): { prevRound: number; indices: [number, number] } | null {
  if (round <= 1) return null;
  return {
    prevRound: round - 1,
    indices: [matchIndex * 2 - 1, matchIndex * 2],
  };
}

export type ByeKind = 'bye-a' | 'bye-b' | 'empty' | 'ready' | 'pending';

/** True when a winners-side result would fill this losers slot. */
export function winnersDropFillsLosersSlot(
  winnersRound: number,
  winnersMatchIndex: number,
  losersRound: number,
  losersMatchIndex: number,
): { fillsA: boolean } | null {
  const slot = losersDropPlacement(winnersRound, winnersMatchIndex);
  if (slot.losersRound !== losersRound || slot.losersMatchIndex !== losersMatchIndex) {
    return null;
  }
  return { fillsA: slot.asPlayerA };
}

export function classifyMatchSlots(
  playerAId?: string | null,
  playerBId?: string | null,
): ByeKind {
  const a = playerAId || null;
  const b = playerBId || null;
  if (a && b) return 'ready';
  if (a && !b) return 'bye-a';
  if (!a && b) return 'bye-b';
  return 'empty';
}
