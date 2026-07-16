import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePoolMatchDto {
  @IsUUID()
  playerAId!: string;

  @IsUUID()
  playerBId!: string;

  @IsOptional()
  @IsUUID()
  hallId?: string;

  @IsString()
  game!: string;

  @IsInt()
  @Min(1)
  raceTo!: number;
}