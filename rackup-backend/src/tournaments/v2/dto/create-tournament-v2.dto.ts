import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

import { TournamentV2Mode } from '../entities/tournament-v2.entity';

export class CreateTournamentV2Dto {
  @IsString()
  name!: string;

  @IsString()
  game!: string;

  @IsEnum(TournamentV2Mode)
  mode!: TournamentV2Mode;

  @IsOptional()
  @IsObject()
  format_config?: Record<string, any>;
}

