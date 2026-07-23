import { IsUUID } from 'class-validator';

export class CheckOutDto {
  @IsUUID()
  hallId!: string;
}

