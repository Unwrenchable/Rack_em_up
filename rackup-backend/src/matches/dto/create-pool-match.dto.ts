import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Create a standard pool match or RackUp Pyramid match.
 *
 * Pyramid: set game = "rackup-pyramid" (or "pyramid") + tableSizeFt + skillLevel.
 * raceTo is derived from presets if omitted.
 */
export class CreatePoolMatchDto {
  @IsUUID()
  playerAId!: string;

  @IsUUID()
  playerBId!: string;

  @IsOptional()
  @IsUUID()
  hallId?: string;

  @IsString()
  game!: string;

  /** Required for non-pyramid; optional for pyramid (auto from skill+table). */
  @ValidateIf((o) => {
    const g = String(o.game ?? '').toLowerCase();
    return !g.includes('pyramid');
  })
  @IsInt()
  @Min(1)
  raceTo?: number;

  /** Pyramid / table-aware styles: 7 or 9 */
  @IsOptional()
  @IsInt()
  @IsIn([7, 9])
  tableSizeFt?: number;

  /** Pyramid: BEGINNER | INTERMEDIATE | ADVANCED | PRO */
  @IsOptional()
  @IsString()
  skillLevel?: string;
}
