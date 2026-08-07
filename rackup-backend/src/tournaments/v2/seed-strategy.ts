import type { SeedStrategy } from './entities/tournament-v2.entity';

/**
 * Auto-seeding strategies for tournament entrants.
 * - manual: keep registration order
 * - random: Fisher–Yates shuffle
 * - elo: highest rating first (then stable id for ties)
 */
export function applySeedStrategy(
  entrants: string[],
  strategy: SeedStrategy = 'manual',
  ratings: Record<string, number> = {},
): string[] {
  const list = [...entrants];
  if (list.length <= 1) return list;

  if (strategy === 'random') {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  if (strategy === 'elo') {
    return list.sort((a, b) => {
      const ra = ratings[a] ?? 0;
      const rb = ratings[b] ?? 0;
      if (rb !== ra) return rb - ra;
      return a.localeCompare(b);
    });
  }

  // manual
  return list;
}

export function parseSeedStrategy(raw: unknown): SeedStrategy {
  if (raw === 'random' || raw === 'elo' || raw === 'manual') return raw;
  return 'manual';
}
