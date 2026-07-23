import { IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  userId!: string;

  @IsString()
  token!: string;
}

