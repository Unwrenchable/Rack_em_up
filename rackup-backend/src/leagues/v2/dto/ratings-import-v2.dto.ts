import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsObject, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class PlayerRatingRowDto {
  @IsUUID()
  playerId!: string;

  @IsInt()
  @Min(0)
  rating!: number;
}

export class RatingsImportV2Dto {
  @IsUUID()
  seasonId!: string;

  @IsString()
  sourceName!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsObject()
  rawConfig?: Record<string, any>;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlayerRatingRowDto)
  ratings!: PlayerRatingRowDto[];
}

