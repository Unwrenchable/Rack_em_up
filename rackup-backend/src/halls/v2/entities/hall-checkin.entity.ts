import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'hall_checkins_v2' })
export class HallCheckIn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ name: 'hall_id', type: 'uuid' })
  hallId!: string;

  @Column({ name: 'checked_in_at', type: 'timestamp' })
  checkedInAt!: Date;

  @Column({ name: 'checked_out_at', type: 'timestamp', nullable: true, default: null })
  checkedOutAt!: Date | null;


  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

