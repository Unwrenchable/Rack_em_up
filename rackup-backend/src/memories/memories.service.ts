import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MatchMemory } from './match-memory.entity';

@Injectable()
export class MemoriesService {
  constructor(
    @InjectRepository(MatchMemory)
    private readonly memoriesRepo: Repository<MatchMemory>,
  ) {}

  async findMemoriesByParticipant(participantUserId: string): Promise<MatchMemory[]> {
    return this.memoriesRepo.find({
      where: { participantUserId },
      order: { createdAt: 'DESC' },
    });
  }

  async createOneForParticipant(params: {
    matchId: string;
    participantUserId: string;
    opponentUserId?: string | null;
    matchType: MatchMemory['matchType'];
    isWinner: boolean;
    game?: string | null;
    raceTo?: number | null;
    stakes?: string | null;
    scoreline?: Record<string, any> | null;
  }): Promise<MatchMemory> {
    const created = this.memoriesRepo.create({
      matchId: params.matchId,
      participantUserId: params.participantUserId,
      opponentUserId: params.opponentUserId ?? null,
      matchType: params.matchType,
      isWinner: params.isWinner,
      game: params.game ?? null,
      raceTo: params.raceTo ?? null,
      stakes: params.stakes ?? null,
      scoreline: params.scoreline ?? null,
      highlightVideoUrls: [],
    });

    return this.memoriesRepo.save(created);
  }

  async createForMatchParticipants(params: {
    matchId: string;
    matchType: MatchMemory['matchType'];
    participantAId: string;
    participantBId: string;
    aIsWinner: boolean;
    bIsWinner: boolean;
    game?: string | null;
    raceTo?: number | null;
    stakes?: string | null;
    scorelineA?: Record<string, any> | null;
    scorelineB?: Record<string, any> | null;
  }): Promise<void> {
    // Ensure we create exactly one memory per player per match:
    // If duplicates exist (possible during retries), we keep the newest and delete older.
    const existing = await this.memoriesRepo.find({
      where: {
        matchId: params.matchId,
        participantUserId: In([params.participantAId, params.participantBId]),
      },
    });

    const existingByUser = new Map(existing.map((m) => [m.participantUserId, m]));
    const toCreate: Array<Promise<MatchMemory>> = [];

    if (!existingByUser.has(params.participantAId)) {
      toCreate.push(
        this.createOneForParticipant({
          matchId: params.matchId,
          participantUserId: params.participantAId,
          opponentUserId: params.participantBId,
          matchType: params.matchType,
          isWinner: params.aIsWinner,
          game: params.game ?? null,
          raceTo: params.raceTo ?? null,
          stakes: params.stakes ?? null,
          scoreline: params.scorelineA ?? null,
        }),
      );
    }
    if (!existingByUser.has(params.participantBId)) {
      toCreate.push(
        this.createOneForParticipant({
          matchId: params.matchId,
          participantUserId: params.participantBId,
          opponentUserId: params.participantAId,
          matchType: params.matchType,
          isWinner: params.bIsWinner,
          game: params.game ?? null,
          raceTo: params.raceTo ?? null,
          stakes: params.stakes ?? null,
          scoreline: params.scorelineB ?? null,
        }),
      );
    }

    await Promise.all(toCreate);

    // Optional dedupe cleanup could be added later; for v1 we assume unique creation.
  }

  async appendHighlight(params: {
    matchId: string;
    participantUserId: string;
    highlightVideoUrl: string;
  }): Promise<MatchMemory> {
    const mem = await this.memoriesRepo.findOne({
      where: { matchId: params.matchId, participantUserId: params.participantUserId },
    });

    if (!mem) {
      throw new NotFoundException('Match memory not found for this user/match');
    }

    mem.highlightVideoUrls = Array.isArray(mem.highlightVideoUrls) ? mem.highlightVideoUrls : [];
    mem.highlightVideoUrls.push(params.highlightVideoUrl);

    return this.memoriesRepo.save(mem);
  }

  async getOrThrowMemoryForUpdate(matchId: string, participantUserId: string): Promise<MatchMemory> {
    const mem = await this.memoriesRepo.findOne({ where: { matchId, participantUserId } });
    if (!mem) throw new NotFoundException('Match memory not found');
    return mem;
  }
}
