import { IsOptional, IsString } from 'class-validator';

export class CreateVegasSeedDto {
  @IsOptional()
  @IsString()
  region?: string;
}

