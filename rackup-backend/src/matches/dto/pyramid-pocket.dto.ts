import { ArrayMinSize, IsArray, IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';

export class PyramidPocketDto {
  @IsUUID()
  playerId!: string;

  /** Object balls pocketed this shot (1–10 or 1–15). */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(15, { each: true })
  balls!: number[];
}

export class PyramidSideDto {
  @IsIn(['A', 'B'])
  side!: 'A' | 'B';
}
