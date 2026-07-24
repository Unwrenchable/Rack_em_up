import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ClaimHallDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tableCount?: number;
}