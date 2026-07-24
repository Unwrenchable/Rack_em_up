import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UploadHallPhotoDto {
  @IsUUID()
  hallId!: string;

  /** Remote or previously stored URL. Optional if photoBase64 is set. */
  @ValidateIf((o) => !o.photoBase64)
  @IsString()
  photoUrl?: string;

  /** data:image/...;base64,... stored under local uploads. */
  @IsOptional()
  @IsString()
  photoBase64?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

