import { IsInt, IsUUID, Min } from 'class-validator';

export class CompleteMoneyMatchDto {
  @IsUUID()
  reportingPlayerId!: string;

  @IsInt()
  @Min(0)
  aScore!: number;

  @IsInt()
  @Min(0)
  bScore!: number;
}