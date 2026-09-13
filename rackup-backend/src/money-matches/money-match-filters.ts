import { asUuid } from '../common/uuid';

export type MoneyMatchFilters = {
  status?: string;
  playerId?: string;
  hallId?: string;
};

const STATUSES = new Set(['PENDING', 'ACTIVE', 'COMPLETED', 'DISPUTED']);

export function moneyMatchQueryErrors(
  filters?: { status?: string; playerId?: string; hallId?: string } | null,
): string[] {
  const errors: string[] = [];
  const status = String(filters?.status ?? '').trim();
  if (status && !STATUSES.has(status.toUpperCase())) {
    errors.push('status must be PENDING, ACTIVE, COMPLETED, or DISPUTED');
  }
  if (filters?.playerId && !asUuid(filters.playerId)) {
    errors.push('playerId must be a UUID');
  }
  if (filters?.hallId && !asUuid(filters.hallId)) {
    errors.push('hallId must be a UUID');
  }
  return errors;
}

/**
 * Play / curl often send demo ids (`p1`, `h1`) or junk `status`.
 * Passing those into Postgres uuid columns 500s.
 * After the controller 400s bad query strings, this still drops junk
 * so findAll never binds an invalid uuid.
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
