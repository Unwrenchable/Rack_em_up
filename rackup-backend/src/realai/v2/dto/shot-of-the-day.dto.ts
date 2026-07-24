import { IsOptional, IsString, IsArray } from 'class-validator';

export class ShotOfTheDayDto {
  @IsString()
  shotId!: string;

  @IsOptional()
  @IsArray()
  ballCoordinates?: any[];

  @IsOptional()
  @IsArray()
  cuePathSegments?: any[];

  @IsOptional()
  @IsArray()
  finalPositions?: any[];
}

