import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ReportStatus = 'OPEN' | 'REVIEWING' | 'CLOSED';

@Entity({ name: 'player_reports' })
export class PlayerReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId!: string;

  @Column({ name: 'reported_user_id', type: 'uuid' })
  reportedUserId!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'text', nullable: true })
  details!: string | null;

  @Column({ type: 'text', default: 'OPEN' })
  status!: ReportStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}