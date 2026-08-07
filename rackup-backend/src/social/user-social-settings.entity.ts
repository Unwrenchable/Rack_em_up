import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CheckInVisibility = 'FRIENDS' | 'SELECTED_FRIENDS' | 'NOBODY';

@Entity({ name: 'user_social_settings' })
export class UserSocialSettings {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    name: 'check_in_visibility',
    type: 'varchar',
    length: 32,
    default: 'FRIENDS',
  })
  checkInVisibility!: CheckInVisibility;

  @Column({ name: 'check_in_visible_to', type: 'jsonb', default: () => "'[]'" })
  checkInVisibleToUserIds!: string[];

  @Column({ name: 'check_in_ttl_minutes', type: 'int', default: 180 })
  checkInDefaultTtlMinutes!: number;

  @Column({ name: 'show_online_to_friends', type: 'boolean', default: true })
  showOnlineToFriends!: boolean;

  @Column({ name: 'allow_dm_from_non_friends', type: 'boolean', default: false })
  allowDmFromNonFriends!: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
