import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CoachDto {
  @IsUUID()
  matchId!: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsNumber()
  skillLevel?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

