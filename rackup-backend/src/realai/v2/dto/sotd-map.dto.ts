import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** Normalized table point: x 0–100 (head→foot), y 0–50 (bottom→top). */
export class SotdPointDto {
  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;
}

export class SotdObjectBallDto extends SotdPointDto {
  @IsNumber()
  ballId!: number;

  @IsOptional()
  @IsString()
  role?: 'object' | 'blocker' | 'prop' | 'helper';
}

export class SotdPathSegmentDto {
  @ValidateNested()
  @Type(() => SotdPointDto)
  from!: SotdPointDto;

  @ValidateNested()
  @Type(() => SotdPointDto)
  to!: SotdPointDto;

  @IsOptional()
  @IsIn(['solid', 'dashed'])
  style?: 'solid' | 'dashed';

  @IsOptional()
  @IsIn(['ground', 'airborne', 'object', 'cue_after'])
  kind?: 'ground' | 'airborne' | 'object' | 'cue_after';
}

export class SotdEnglishDto {
  @IsString()
  tip_zone!: string;

  @IsNumber()
  sidespin!: number;

  @IsNumber()
  backspin!: number;

  @IsNumber()
  follow!: number;

  @IsString()
  label!: string;
}

export class SotdLandingZoneDto extends SotdPointDto {
  @IsString()
  label!: string;
}

export class SotdGhostBallDto extends SotdPointDto {
  @IsOptional()
  @IsNumber()
  radius?: number;

  @IsOptional()
  @IsBoolean()
  show?: boolean;
}

/**
 * Full structured Shot-of-the-Day map payload.
 * Served from the static Rack catalogue. RealAI is never used to generate diagrams.
 */
export class SotdShotMapDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  difficulty!: string;

  @IsNumber()
  difficulty_rating!: number;

  @IsString()
  category!: string;

  @IsString()
  speed_category!: string;

  @IsString()
  tip_zone!: string;

  @ValidateNested()
  @Type(() => SotdPointDto)
  cue_ball_start!: SotdPointDto;

  object_ball_positions!: SotdObjectBallDto[];

  intended_path!: SotdPathSegmentDto[];

  @ValidateNested()
  @Type(() => SotdEnglishDto)
  english!: SotdEnglishDto;

  landing_zones!: SotdLandingZoneDto[];

  @ValidateNested()
  @Type(() => SotdPointDto)
  pocket_target!: SotdPointDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SotdGhostBallDto)
  ghost_ball?: SotdGhostBallDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SotdPointDto)
  contact_point?: SotdPointDto;

  coordinate_system!: { x: string; y: string; units: string };

  @IsString()
  source!: 'catalogue' | 'realai';

  @IsString()
  ascii_table!: string;
}
