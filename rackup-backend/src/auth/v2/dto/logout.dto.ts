import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsString()
  deviceSessionId!: string;
}

export class DeviceSessionRevokedDto {
  @IsString()
  deviceSessionId!: string;
}

