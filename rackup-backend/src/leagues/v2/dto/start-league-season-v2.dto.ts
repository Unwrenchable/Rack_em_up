import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class StartLeagueSeasonV2Dto {
  @IsUUID()
  seasonId!: string;

  @IsOptional()
  @IsUUID('all', { each: true })
  initialPlayers?: string[];
}

