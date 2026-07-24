import { IsInt, IsUUID, Min } from 'class-validator';

export class ReportLeagueMatchV2Dto {
  @IsUUID()
  scheduledMatchId!: string;

  @IsInt()
  @Min(0)
  playerAScore!: number;

  @IsInt()
  @Min(0)
  playerBScore!: number;
}

