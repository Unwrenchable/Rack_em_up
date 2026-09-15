/**
 * Hall occupancy helpers — one player counts in at most one hall.
 */

export type OccupancyRow = {
  userId: string;
  hallId: string;
  createdAt: Date;
};

/** Keep only the newest check-in per user so stale rows cannot double-count. */
export function latestCheckinPerUser<T extends OccupancyRow>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const prev = latest.get(row.userId);
    if (!prev || row.createdAt > prev.createdAt) {
      latest.set(row.userId, row);
    }
  }
  return [...latest.values()];
}

export function countPlayersByHall<T extends OccupancyRow>(
  rows: T[],
): Map<string, number> {
  const unique = latestCheckinPerUser(rows);
  const counts = new Map<string, number>();
  for (const row of unique) {
    counts.set(row.hallId, (counts.get(row.hallId) ?? 0) + 1);
  }
  return counts;
}
