import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

/**
 * Arbiter resolution for DISPUTED money matches.
 * - complete: set scores + release escrow to winner
 * - refund: cancel result side-effects path (no Elo) + refund escrow
 * - no_contest: refund + complete without Elo
 */
export class ResolveDisputeDto {
  @IsUUID()
  arbiterId!: string;

  @IsIn(['complete', 'refund', 'no_contest'])
  resolution!: 'complete' | 'refund' | 'no_contest';

  @IsOptional()
  @IsInt()
  @Min(0)
  aScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bScore?: number;

  @IsOptional()
  @IsUUID()
  winnerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  notes?: string;
}
