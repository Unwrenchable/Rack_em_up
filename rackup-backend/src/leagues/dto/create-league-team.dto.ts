import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLeagueTeamDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsUUID()
  captainId!: string;

  @IsOptional()
  rosterJson?: Record<string, any>;
}
