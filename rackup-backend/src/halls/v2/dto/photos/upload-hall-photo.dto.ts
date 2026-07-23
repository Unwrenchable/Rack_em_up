import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadHallPhotoDto {
  @IsUUID()
  hallId!: string;

  @IsString()
  photoUrl!: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

