import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AdminUpdateMatchScoreDto {
  @IsUUID()
  tournamentId!: string;

  @IsUUID()
  matchId!: string;

  @IsInt()
  @Min(0)
  aScore!: number;

  @IsInt()
  @Min(0)
  bScore!: number;

  @IsOptional()
  @IsUUID()
  winnerId?: string;
}

export class AdminSwapPlayersDto {
  @IsUUID()
  tournamentId!: string;

  @IsUUID()
  matchId!: string;

  /** Alternate: place player into this match slot */
  @IsOptional()
  @IsUUID()
  playerId?: string;

  @IsOptional()
  @IsString()
  slot?: 'A' | 'B';
}

export class AdminReseedDto {
  @IsUUID()
  tournamentId!: string;

  /** manual | random | elo */
  @IsOptional()
  @IsString()
  seedStrategy?: 'manual' | 'random' | 'elo';

  /** When true, clears matches and regenerates even if ACTIVE */
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
