import { IsUUID } from 'class-validator';

export class RegisterTournamentDto {
  @IsUUID()
  user_id!: string;
}
