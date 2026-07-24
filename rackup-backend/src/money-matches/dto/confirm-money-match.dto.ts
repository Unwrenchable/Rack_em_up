import { IsIn, IsUUID } from 'class-validator';

export class ConfirmMoneyMatchDto {
  matchId!: string; // controller sets from route param

  @IsUUID()
  confirmingPlayerId!: string;

  @IsIn(['A', 'B'])
  confirmingSide!: 'A' | 'B';
}
