import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyzeShotDto {
  /** Public, uploaded, or YouTube URL. Multipart clips: POST /training/clips first. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  videoUrl?: string;

  /** Free-text what the player is working on. */
  @IsOptional()
  @IsString()
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