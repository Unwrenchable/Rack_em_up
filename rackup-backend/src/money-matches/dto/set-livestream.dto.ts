import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SetLivestreamDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  livestreamUrl?: string | null;
}
