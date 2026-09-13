import { asUuid } from '../common/uuid';

export type MoneyMatchFilters = {
  status?: string;
  playerId?: string;
  hallId?: string;
};

const STATUSES = new Set(['PENDING', 'ACTIVE', 'COMPLETED', 'DISPUTED']);

/**
 * Play / curl often send demo ids (`p1`, `h1`) or junk `status`.
 * Passing those into Postgres uuid columns 500s; ValidationPipe 400s.
 * Drop invalid filters so GET /money-matches still returns the board.
 */
export function sanitizeMoneyMatchFilters(
  filters?: { status?: string; playerId?: string; hallId?: string } | null,
): MoneyMatchFilters {
  const statusRaw = String(filters?.status ?? '')
    .trim()
    .toUpperCase();
  return {
    status: STATUSES.has(statusRaw) ? statusRaw : undefined,
    playerId: asUuid(filters?.playerId),
    hallId: asUuid(filters?.hallId),
  };
}
