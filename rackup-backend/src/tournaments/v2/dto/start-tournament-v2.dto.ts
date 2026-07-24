import { IsUUID } from 'class-validator';

export class StartTournamentV2Dto {
  @IsUUID()
  tournamentId!: string;
}

