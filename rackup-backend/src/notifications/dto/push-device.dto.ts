import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterPushDeviceDto {
  @IsString()
  @MaxLength(512)
  token!: string;

  @IsOptional()
  @IsString()
  platform?: 'web' | 'ios' | 'android' | 'unknown';

  @IsOptional()
  @IsObject()
  prefs?: Record<string, boolean>;
}

export class UnregisterPushDeviceDto {
  @IsString()
  @MaxLength(512)
  token!: string;
}

export class TestPushDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
