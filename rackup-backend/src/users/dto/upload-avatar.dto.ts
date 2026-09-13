import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UploadAvatarDto {
  /** Remote or previously stored URL. Optional if photoBase64 is set. */
  @ValidateIf((o) => !o.photoBase64)
  @IsString()
  avatarUrl?: string;

  /** data:image/...;base64,... stored under local uploads / S3. */
  @IsOptional()
  @IsString()
  photoBase64?: string;
}
