import { IsDateString, IsInt, IsUUID, Min } from 'class-validator';

export class ScheduleLeagueMatchV2Dto {
  @IsInt()
  @Min(0)
  weekIndex!: number;

  @IsUUID()
  playerAId!: string;

  @IsUUID()
  playerBId!: string;

  @IsDateString()
  scheduledAt?: string;
}

