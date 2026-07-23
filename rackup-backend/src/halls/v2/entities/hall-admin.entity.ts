import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'hall_admins_v2' })
export class HallAdmin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'hall_id', type: 'uuid' })
  hallId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;
}

