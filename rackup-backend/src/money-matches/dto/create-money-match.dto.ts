import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
import { asUuid } from '../../common/uuid';

export class CreateMoneyMatchDto {
  @IsUUID()
  playerAId!: string;

  @IsUUID()
  playerBId!: string;

  /** Optional — Play used to send demo `h1`, which 400s @IsUUID. Invalid values are dropped. */
  @IsOptional()
  @Transform(({ value }) => asUuid(value))
  @IsUUID()
  hallId?: string;

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
