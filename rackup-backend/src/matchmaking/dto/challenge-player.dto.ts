import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ChallengePlayerDto {
  @IsUUID()
  opponentId!: string;

  @IsOptional()
  @IsString()
  @IsIn(['8-ball', '9-ball', '10-ball', 'one-pocket'])
  game?: string;

  @IsOptional()
  @IsString()
  @IsIn(['casual', 'small', 'big_money'])
  stakes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(21)
  raceTo?: number;
}
