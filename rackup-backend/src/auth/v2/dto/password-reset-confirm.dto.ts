import { IsString, MinLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @IsString()
  userId!: string;

  @IsString()
  token!: string;

  @IsString()
  @MinLength(6)
  new_password!: string;
}

