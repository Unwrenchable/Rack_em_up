import { IsUUID } from 'class-validator';

export class RegisterTournamentV2Dto {
  @IsUUID()
  tournamentId!: string;
}

