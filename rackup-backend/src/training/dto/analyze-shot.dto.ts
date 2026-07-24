import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AnalyzeShotDto {
  /** Public or signed URL to clip (future: multipart upload). */
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  videoUrl?: string;

  /** Free-text what the player is working on. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  game?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  focus?: string;
}