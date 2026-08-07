import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PushPlatform = 'web' | 'ios' | 'android' | 'unknown';

@Entity({ name: 'push_devices' })
@Index(['userId'])
@Index(['token'], { unique: true })
export class PushDevice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  token!: string;

  @Column({ type: 'varchar', length: 16, default: 'unknown' })
  platform!: PushPlatform;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  /** User prefers money / match / social pushes */
  @Column({ name: 'prefs_json', type: 'jsonb', default: () => "'{}'" })
  prefsJson!: Record<string, boolean>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
