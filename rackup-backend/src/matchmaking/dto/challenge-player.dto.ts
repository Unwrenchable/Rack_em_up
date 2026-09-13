import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CHALLENGE_GAMES, normalizeChallengeGame } from '../challenge-game';

export class ChallengePlayerDto {
  @IsUUID()
  opponentId!: string;

  @IsOptional()
  @Transform(({ value }) => normalizeChallengeGame(value))
  @IsString()
  @IsIn([...CHALLENGE_GAMES])
  game?: string;

  @IsOptional()
  @IsString()
  @IsIn(['casual', 'small', 'big_money'])
  stakes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(21)
  raceTo?: number;
}
