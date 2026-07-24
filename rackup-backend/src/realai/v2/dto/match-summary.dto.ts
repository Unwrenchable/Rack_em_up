import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class MatchSummaryDto {
  @IsUUID()
  matchId!: string;

  @IsOptional()
  @IsArray()
  keyShots?: any[];

  @IsOptional()
  @IsString()
  context?: string;
}

