import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('player_external_ratings_v2')
@Index(['playerId', 'sourceId'])
export class PlayerExternalRating {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  seasonId!: string;

  @Column({ type: 'uuid' })
  sourceId!: string;

  @Column({ type: 'uuid' })
  playerId!: string;

  @Column({ type: 'int' })
  externalRating!: number;

  @Column({ type: 'int', nullable: true })
  unifiedRating?: number | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}

