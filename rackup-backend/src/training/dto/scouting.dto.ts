import { IsUUID } from 'class-validator';

export class ScoutingDto {
  @IsUUID()
  opponentUserId!: string;
}