import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type MoneyMatchStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED';

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
