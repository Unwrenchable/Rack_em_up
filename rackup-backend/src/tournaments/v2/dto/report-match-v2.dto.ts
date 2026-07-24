import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ReportMatchV2Dto {
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

