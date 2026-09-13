const GAMES = ['8-ball', '9-ball', '10-ball', 'one-pocket'] as const;
export type ChallengeGame = (typeof GAMES)[number];

/**
 * Find / Social sometimes send "One-pocket", "8-Ball", or a looking-row label.
 * Strict @IsIn 400s the challenge; normalize so Challenge still lands.
 */
export function normalizeChallengeGame(raw?: string | null): ChallengeGame | undefined {
  if (raw == null) return undefined;
  const g = String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (!g || g === 'all') return undefined;
  if (g.includes('10')) return '10-ball';
  if (g.includes('8')) return '8-ball';
  if (g.includes('one') || g.includes('pocket')) return 'one-pocket';
  if (g.includes('9')) return '9-ball';
  return (GAMES as readonly string[]).includes(g) ? (g as ChallengeGame) : undefined;
}

export const CHALLENGE_GAMES = GAMES;
