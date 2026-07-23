import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { TournamentV2, TournamentV2Mode } from './entities/tournament-v2.entity';
import { TournamentMatchV2, TournamentBracketSide, TournamentMatchStatus } from './entities/tournament-match-v2.entity';
import { BracketRound } from './entities/bracket-round.entity';
import { BracketNode } from './entities/bracket-node.entity';

@Injectable()
export class BracketGenerationService {
  constructor(
    @InjectRepository(TournamentMatchV2)
    private readonly matchRepo: Repository<TournamentMatchV2>,

    @InjectRepository(BracketRound)
    private readonly roundRepo: Repository<BracketRound>,

    @InjectRepository(BracketNode)
    private readonly nodeRepo: Repository<BracketNode>,
  ) {}

  async generateForTournament(tournament: TournamentV2): Promise<void> {
    const entrants = tournament.entrants ?? [];

    if (tournament.mode === TournamentV2Mode.SINGLE_ELIMINATION) {
      await this.generateSingleElimination(tournament, entrants);
      return;
    }

    if (tournament.mode === TournamentV2Mode.ROUND_ROBIN) {
      await this.generateRoundRobin(tournament, entrants);
      return;
    }

    // Default: double elimination baseline uses single-elim bracket with placeholder losers path.
    if (tournament.mode === TournamentV2Mode.DOUBLE_ELIMINATION) {
      await this.generateDoubleEliminationBaseline(tournament, entrants);
      return;
    }

    // Fallback
    await this.generateSingleElimination(tournament, entrants);
  }

  private nextPowerOfTwo(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  private async generateSingleElimination(tournament: TournamentV2, entrants: string[]) {
    const size = this.nextPowerOfTwo(entrants.length || 1);
    const seeded = [...entrants, ...new Array(size - entrants.length).fill(null)];

    const round = await this.roundRepo.save(
      this.roundRepo.create({ tournamentId: tournament.id, roundNumber: 1 }),
    );

    const matches: TournamentMatchV2[] = [];
    for (let i = 0; i < seeded.length; i += 2) {
      matches.push(
        this.matchRepo.create({
          tournamentId: tournament.id,
          round: 1,
          matchIndex: i / 2 + 1,
          playerAId: seeded[i],
          playerBId: seeded[i + 1],
          status: TournamentMatchStatus.ACTIVE,
          bracket: TournamentBracketSide.WINNERS,
        }),
      );
    }

    await this.matchRepo.save(matches);

    // Minimal nodes for future bracket visualization
    const nodes: BracketNode[] = matches.map((m, idx) =>
      this.nodeRepo.create({
        tournamentId: tournament.id,
        roundNumber: 1,
        nodeIndex: idx + 1,
        matchId: m.id,
      }),
    );
    await this.nodeRepo.save(nodes);
  }

  private async generateDoubleEliminationBaseline(tournament: TournamentV2, entrants: string[]) {
    // Phase 1 baseline: treat as single-elim winners bracket only.
    await this.generateSingleElimination(tournament, entrants);
  }

  private async generateRoundRobin(tournament: TournamentV2, entrants: string[]) {
    // Simple round-robin: create matches for each pair, round = pair index bucket.
    const roundsCreated = new Set<number>();

    let roundNumber = 1;
    const matches: TournamentMatchV2[] = [];

    for (let i = 0; i < entrants.length; i++) {
      for (let j = i + 1; j < entrants.length; j++) {
        if (!roundsCreated.has(roundNumber)) {
          roundsCreated.add(roundNumber);
          await this.roundRepo.save(this.roundRepo.create({ tournamentId: tournament.id, roundNumber }));
        }

        matches.push(
          this.matchRepo.create({
            tournamentId: tournament.id,
            round: roundNumber,
            matchIndex: matches.length + 1,
            playerAId: entrants[i],
            playerBId: entrants[j],
            status: TournamentMatchStatus.ACTIVE,
            bracket: TournamentBracketSide.WINNERS,
          }),
        );

        // Increment round occasionally to keep UI readable.
        if (matches.length % 10 === 0) roundNumber++;
      }
    }

    await this.matchRepo.save(matches);

    const nodes: BracketNode[] = matches.map((m, idx) =>
      this.nodeRepo.create({
        tournamentId: tournament.id,
        roundNumber: m.round,
        nodeIndex: idx + 1,
        matchId: m.id,
      }),
    );
    await this.nodeRepo.save(nodes);
  }
}

