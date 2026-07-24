import { IsInt, Min } from 'class-validator';

export class ReportPoolMatchDto {
  @IsInt()
  @Min(0)
  aScore!: number;

  @IsInt()
  @Min(0)
  bScore!: number;
}