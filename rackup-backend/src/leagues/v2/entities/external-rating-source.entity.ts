import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('external_rating_sources_v2')
@Index(['name'], { unique: true })
export class ExternalRatingSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  region!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  rawConfig?: Record<string, any>;
}

