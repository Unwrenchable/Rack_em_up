import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

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

  /** manual | random | elo — stored in formatConfigJson.seedStrategy */
  @IsOptional()
  @IsString()
  seed_strategy?: 'manual' | 'random' | 'elo';

  /** Skill-scaled in-event chip stacks (also implied by CHIP_RACE). */
  @IsOptional()
  @IsBoolean()
  chipBySkill?: boolean;
}

