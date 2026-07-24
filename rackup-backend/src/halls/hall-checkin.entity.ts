import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'hall_checkins' })
export class HallCheckin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'hall_id', type: 'uuid' })
  hallId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'text', nullable: true })
  game!: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}