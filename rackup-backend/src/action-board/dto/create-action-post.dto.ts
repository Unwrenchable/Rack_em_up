import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateActionPostDto {
  @IsString()
  @MinLength(3)
  @MaxLength(280)
  body!: string;

  @IsString()
  game!: string;

  @IsString()
  stakes!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lon?: number;
}