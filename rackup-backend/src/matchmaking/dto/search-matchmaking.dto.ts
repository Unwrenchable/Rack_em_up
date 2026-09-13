import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  DEFAULT_SEARCH_ORIGIN,
  DEFAULT_SEARCH_RADIUS_M,
} from '../looking-board.util';

function numOr(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Live GET /matchmaking/search with no query used to 400 because
 * `@Transform(Number)` turned missing lat/lon into NaN.
 * Defaults keep Find / friends-nearby / curl working when geolocation is denied.
 */
export class SearchMatchmakingDto {
  @Transform(({ value }) => numOr(value, DEFAULT_SEARCH_ORIGIN.lat))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number = DEFAULT_SEARCH_ORIGIN.lat;

  @Transform(({ value }) => numOr(value, DEFAULT_SEARCH_ORIGIN.lon))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number = DEFAULT_SEARCH_ORIGIN.lon;

  @Transform(({ value }) => numOr(value, DEFAULT_SEARCH_RADIUS_M))
  @IsNumber()
  @Min(1)
  radius: number = DEFAULT_SEARCH_RADIUS_M;

  @IsOptional()
  @IsString()
  @IsIn(['8-ball', '9-ball', '10-ball', 'one-pocket'])
  game?: string;

  @IsOptional()
  @IsString()
  @IsIn(['casual', 'small', 'big_money'])
  stakes?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsNumber()
  min_rating?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsNumber()
  max_rating?: number;
}
