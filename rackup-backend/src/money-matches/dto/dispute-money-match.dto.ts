import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DisputeMoneyMatchDto {
  matchId!: string; // controller sets from route param

  @IsNotEmpty()
  @MaxLength(256)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  details?: string;
}
