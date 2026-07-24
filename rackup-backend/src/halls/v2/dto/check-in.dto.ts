import { IsUUID } from 'class-validator';

export class CheckInDto {
  @IsUUID()
  hallId!: string;
}

