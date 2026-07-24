import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLeagueDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(32)
  game!: string;

  @IsString()
  @MaxLength(32)
  season!: string;

  @IsUUID()
  hallId!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  configJson?: Record<string, any>;

  @IsOptional()
  @Type(() => Date)
  startsAt?: Date;
}
