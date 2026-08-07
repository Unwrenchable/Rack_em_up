import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type IdBridgeKind = 'league' | 'tournament';

/**
 * Canonical mapping between V1 UI ids and V2 domain records
 * so standings / brackets resolve instead of returning empty.
 */
@Entity({ name: 'id_bridges' })
@Unique(['kind', 'v1Id'])
@Unique(['kind', 'v2Id'])
@Index(['kind', 'v1Id'])
@Index(['kind', 'v2Id'])
export class IdBridge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  kind!: IdBridgeKind;

  @Column({ name: 'v1_id', type: 'uuid' })
  v1Id!: string;

  @Column({ name: 'v2_id', type: 'uuid' })
  v2Id!: string;

  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
