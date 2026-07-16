import { IsInt, IsUUID, Min } from 'class-validator';

export class ReportTournamentMatchDto {
  @IsUUID()
  match_id!: string;

  @IsInt()
  @Min(0)
  a_score!: number;

  @IsInt()
  @Min(0)
  b_score!: number;
}
