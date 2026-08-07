import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/** Flexible coach body — maps to RealAI ability coach | pyramid. */
export class CoachDto {
  @IsOptional()
  @IsUUID()
  matchId?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** full | practice_plan | pre_match | mental | pattern | pyramid */
  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  discipline?: string;

  @IsOptional()
  @IsString()
  tableSize?: string;

  @IsOptional()
  skillLevel?: string | number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  minutes?: number;

  @IsOptional()
  @IsNumber()
  myScore?: number;

  @IsOptional()
  @IsNumber()
  oppScore?: number;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weaknesses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

