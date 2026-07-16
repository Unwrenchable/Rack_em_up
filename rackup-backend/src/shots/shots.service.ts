import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CatalogShot,
  SHOT_CATALOG,
  catalogLength,
  getShotById,
  getShotByIndex,
} from './shot-catalog';

/** UTC calendar day key YYYY-MM-DD */
function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Day ordinal since epoch (UTC) for stable rotation. */
function utcDayIndex(d = new Date()): number {
  return Math.floor(d.getTime() / 86_400_000);
}

/**
 * Deterministic shuffle of 0..n-1 for a given cycle.
 * Each cycle length = catalog size → no repeats until full rotation.
 */
function rotationOrder(seed: number, n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type ShotOfTheDayResponse = {
  date: string;
  dayIndex: number;
  cycle: number;
  positionInCycle: number;
  cycleLength: number;
  daysUntilRepeat: number;
  shot: CatalogShot;
  note: string;
};

@Injectable()
export class ShotsService {
  private readonly n = catalogLength();

  getToday(date = new Date()): ShotOfTheDayResponse {
    const dayIndex = utcDayIndex(date);
    const cycle = Math.floor(dayIndex / this.n);
    const positionInCycle = dayIndex % this.n;
    const order = rotationOrder(cycle + 0x9e3779b9, this.n);
    const shotIndex = order[positionInCycle];
    const shot = getShotByIndex(shotIndex);

    return {
      date: utcDayKey(date),
      dayIndex,
      cycle,
      positionInCycle,
      cycleLength: this.n,
      daysUntilRepeat: this.n - positionInCycle,
      shot,
      note:
        'Rotation shuffles the full catalog each cycle so the same shot does not repeat until every shot has appeared once.',
    };
  }

  getCatalog(filters?: {
    difficulty?: string;
    category?: string;
  }): { total: number; shots: CatalogShot[] } {
    let shots = [...SHOT_CATALOG];
    if (filters?.difficulty) {
      const d = filters.difficulty.toLowerCase();
      shots = shots.filter((s) => s.difficulty.toLowerCase() === d);
    }
    if (filters?.category) {
      const c = filters.category.toLowerCase();
      shots = shots.filter((s) => s.category.toLowerCase() === c);
    }
    return { total: shots.length, shots };
  }

  getOne(id: string): CatalogShot {
    const shot = getShotById(id);
    if (!shot) throw new NotFoundException('Shot not found');
    return shot;
  }

  /** Upcoming N days of SOTD (for “what’s next” UI). */
  upcoming(count = 7): Array<{ date: string; shotId: string; name: string; difficulty: string }> {
    const out: Array<{ date: string; shotId: string; name: string; difficulty: string }> = [];
    const start = utcDayIndex();
    for (let i = 0; i < count; i++) {
      const d = new Date((start + i) * 86_400_000);
      const tod = this.getToday(d);
      out.push({
        date: tod.date,
        shotId: tod.shot.id,
        name: tod.shot.name,
        difficulty: tod.shot.difficulty,
      });
    }
    return out;
  }
}