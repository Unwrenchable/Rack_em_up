import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CheckInVisibility,
  UserSocialSettings,
} from './user-social-settings.entity';

@Injectable()
export class SocialSettingsService {
  constructor(
    @InjectRepository(UserSocialSettings)
    private readonly repo: Repository<UserSocialSettings>,
  ) {}

  async getOrCreate(userId: string): Promise<UserSocialSettings> {
    let row = await this.repo.findOne({ where: { userId } });
    if (!row) {
      row = await this.repo.save(
        this.repo.create({
          userId,
          checkInVisibility: 'FRIENDS',
          checkInVisibleToUserIds: [],
          checkInDefaultTtlMinutes: 180,
          showOnlineToFriends: true,
          allowDmFromNonFriends: false,
        }),
      );
    }
    return row;
  }

  async update(
    userId: string,
    patch: Partial<{
      checkInVisibility: CheckInVisibility;
      checkInVisibleToUserIds: string[];
      checkInDefaultTtlMinutes: number;
      showOnlineToFriends: boolean;
      allowDmFromNonFriends: boolean;
    }>,
  ): Promise<UserSocialSettings> {
    const row = await this.getOrCreate(userId);
    if (patch.checkInVisibility != null) row.checkInVisibility = patch.checkInVisibility;
    if (patch.checkInVisibleToUserIds != null) {
      row.checkInVisibleToUserIds = patch.checkInVisibleToUserIds;
    }
    if (patch.checkInDefaultTtlMinutes != null) {
      row.checkInDefaultTtlMinutes = Math.max(15, Math.min(24 * 60, patch.checkInDefaultTtlMinutes));
    }
    if (patch.showOnlineToFriends != null) row.showOnlineToFriends = patch.showOnlineToFriends;
    if (patch.allowDmFromNonFriends != null) {
      row.allowDmFromNonFriends = patch.allowDmFromNonFriends;
    }
    return this.repo.save(row);
  }
}
