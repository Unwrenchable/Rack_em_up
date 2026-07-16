import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMoneyMatchDto {
  @IsUUID()
  playerAId!: string;

  @IsUUID()
  playerBId!: string;

  @IsUUID()
  hallId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  game!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  raceTo!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  livestreamUrl?: string;
}
