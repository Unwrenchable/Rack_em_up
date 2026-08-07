import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type MoneyMatchStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED';
export type MoneyEscrowStatus = 'NONE' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED';

@Entity({ name: 'money_matches' })
export class MoneyMatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'player_a_id', type: 'uuid' })
  playerAId!: string;

  @Column({ name: 'player_b_id', type: 'uuid' })
  playerBId!: string;

  @Column({ name: 'hall_id', type: 'uuid' })
  hallId!: string;

  @Column({ type: 'text' })
  game!: string;

  @Column({ name: 'race_to', type: 'int' })
  raceTo!: number;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: number;

  @Column({ name: 'livestream_url', type: 'text', nullable: true })
  livestreamUrl!: string | null;

  @Column({ type: 'text', default: 'PENDING' })
  status!: MoneyMatchStatus;

  @Column({ name: 'result_json', type: 'jsonb', nullable: true })
  resultJson!: Record<string, any> | null;

  @Column({ name: 'a_confirmed', type: 'boolean', default: false })
  aConfirmed!: boolean;

  @Column({ name: 'b_confirmed', type: 'boolean', default: false })
  bConfirmed!: boolean;

  /** Phase 3D escrow */
  @Column({ name: 'escrow_status', type: 'varchar', length: 16, default: 'NONE' })
  escrowStatus!: MoneyEscrowStatus;

  @Column({ name: 'escrow_provider', type: 'varchar', length: 16, nullable: true })
  escrowProvider!: string | null;

  @Column({ name: 'escrow_external_id', type: 'varchar', length: 128, nullable: true })
  escrowExternalId!: string | null;

  @Column({ name: 'escrow_json', type: 'jsonb', nullable: true })
  escrowJson!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
