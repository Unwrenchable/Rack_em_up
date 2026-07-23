import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class PlayerInsightsDto {
  @IsUUID()
  playerId!: string;

  @IsOptional()
  @IsArray()
  recentMatches?: string[];
}

