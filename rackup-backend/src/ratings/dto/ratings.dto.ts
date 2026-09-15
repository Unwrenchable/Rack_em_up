import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class FargoSearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  q!: string;
}

export class ShadowRecomputeDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  unifiedId?: string;
}

export class ResolveIdentityDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  unifiedId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fargo_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  fargo_readable_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  apa_member_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bca_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tap_id?: string;

  @IsOptional()
  @IsBoolean()
  refreshFargo?: boolean;

  @IsOptional()
  @IsBoolean()
  lookupApa?: boolean;
}

export class TapStatsImportDto {
  @IsOptional()
  @IsNumber()
  skill?: number;

  @IsOptional()
  @IsNumber()
  charter_points?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  division?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;

  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}

/** Manual TAP/BCA/APA field import — no scrape. */
export class ManualLeagueImportDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  unifiedId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsNumber()
  apa_sl?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  apa_member_id?: string;

  @IsOptional()
  @IsNumber()
  bca_elo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  bca_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tap_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TapStatsImportDto)
  tap_stats?: TapStatsImportDto;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fargo_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  fargo_readable_id?: string;
}
