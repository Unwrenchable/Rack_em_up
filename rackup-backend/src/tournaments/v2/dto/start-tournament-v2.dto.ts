import { IsOptional, IsString, IsUUID } from 'class-validator';

export class StartTournamentV2Dto {
  @IsUUID()
  tournamentId!: string;

  /** Override seed strategy at start: manual | random | elo */
  @IsOptional()
  @IsString()
  seed_strategy?: 'manual' | 'random' | 'elo';
}

