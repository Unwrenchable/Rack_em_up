import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchMatchmakingDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  radius!: number; // meters

  @IsOptional()
  @IsString()
  @IsIn(['8-ball', '9-ball', '10-ball', 'one-pocket'])
  game?: string;

  @IsOptional()
  @IsString()
  @IsIn(['casual', 'small', 'big_money'])
  stakes?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  min_rating?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  max_rating?: number;
}
