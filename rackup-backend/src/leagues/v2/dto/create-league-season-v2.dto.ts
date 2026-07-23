import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateLeagueSeasonV2Dto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsArray()
  weekly_schedule?: any[];

  // Optional: allow immediate participants snapshot.
  @IsOptional()
  @IsArray()
  initialPlayers?: string[];
}

