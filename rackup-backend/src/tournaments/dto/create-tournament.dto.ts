import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTournamentDto {
  @IsUUID()
  organizer_id!: string;

  @IsOptional()
  @IsUUID()
  hall_id?: string;

  @IsString()
  name!: string;

  @IsString()
  @IsIn(['SINGLE_ELIM', 'DOUBLE_ELIM'])
  format!: 'SINGLE_ELIM' | 'DOUBLE_ELIM';

  @IsString()
  game!: string;

  @IsDateString()
  starts_at!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  race_to?: number;

  @IsArray()
  @IsUUID(undefined, { each: true })
  entrants!: string[];
}
