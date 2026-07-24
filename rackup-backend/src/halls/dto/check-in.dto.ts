import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @IsString()
  hallId?: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @IsOptional()
  @IsString()
  game?: string;
}