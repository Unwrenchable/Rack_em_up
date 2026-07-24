import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
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
  role?: 'object' | 'blocker' | 'prop';
}

export class SotdPathSegmentDto {
  @ValidateNested()
  @Type(() => SotdPointDto)
  from!: SotdPointDto;

  @ValidateNested()
  @Type(() => SotdPointDto)
  to!: SotdPointDto;
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

/**
 * Full structured Shot-of-the-Day map payload.
 * Served from catalog fallback; optional RealAI enrichment may set source='realai'.
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

  coordinate_system!: { x: string; y: string; units: string };

  @IsString()
  source!: 'catalog_fallback' | 'realai';

  @IsString()
  ascii_table!: string;
}
