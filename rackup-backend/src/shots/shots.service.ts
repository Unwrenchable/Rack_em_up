import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CatalogShot,
  SHOT_CATALOG,
  catalogLength,
  getShotById,
  getShotByIndex,
} from './shot-catalog';
import { SotdCompletion } from './sotd-completion.entity';

/** UTC calendar day key YYYY-MM-DD */
function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Day ordinal since epoch (UTC) for stable rotation. */
function utcDayIndex(d = new Date()): number {
  return Math.floor(d.getTime() / 86_400_000);
}

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

  constructor(
    @InjectRepository(SotdCompletion)
    private readonly completionsRepo: Repository<SotdCompletion>,
  ) {}

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

  /** Record "I made it" for today's SOTD and return streak. */
  async completeToday(userId: string, shotId?: string): Promise<{
    completed: boolean;
    date: string;
    shotId: string;
    streak: number;
  }> {
    const today = this.getToday();
    const id = shotId && getShotById(shotId) ? shotId : today.shot.id;
    const date = today.date;

    const existing = await this.completionsRepo.findOne({
      where: { userId, completedOn: date },
    });
    if (!existing) {
      await this.completionsRepo.save(
        this.completionsRepo.create({
          userId,
          shotId: id,
          completedOn: date,
        }),
      );
    }

    const streak = await this.computeStreak(userId);
    return { completed: true, date, shotId: id, streak };
  }

  async getStreak(userId: string): Promise<{ streak: number; lastCompletedOn: string | null }> {
    const streak = await this.computeStreak(userId);
    const last = await this.completionsRepo.find({
      where: { userId },
      order: { completedOn: 'DESC' },
      take: 1,
    });
    return { streak, lastCompletedOn: last[0]?.completedOn ?? null };
  }

  private async computeStreak(userId: string): Promise<number> {
    const rows = await this.completionsRepo.find({
      where: { userId },
      order: { completedOn: 'DESC' },
      take: 400,
    });
    if (!rows.length) return 0;

    const days = new Set(rows.map((r) => r.completedOn));
    let streak = 0;
    let cursor = utcDayIndex();
    // Allow streak to start from today or yesterday if today not yet complete
    if (!days.has(utcDayKey(new Date(cursor * 86_400_000)))) {
      cursor -= 1;
    }
    while (days.has(utcDayKey(new Date(cursor * 86_400_000)))) {
      streak += 1;
      cursor -= 1;
    }
    return streak;
  }
}
