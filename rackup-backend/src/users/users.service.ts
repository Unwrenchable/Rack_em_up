import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from './users.entity';
import { ObjectStorageService } from '../common/object-storage.service';
import {
  formatRatingDisplay,
  ROC_DEFAULT_RATING,
  ROC_DEFAULT_RD,
  ROC_DEFAULT_VOLATILITY,
  toGlickoPublic,
  type GlickoPublicPayload,
} from './rating-display';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
}

export type PublicUserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  reputation: number;
  rating: number;
  rd: number;
  volatility: number;
  matches: number;
  band: string;
  /** Canonical chip e.g. "Advanced • 547" */
  ratingDisplay: string;
  ladder: 'roc_glicko2';
  role: string;
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly storage: ObjectStorageService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  private toPublic(u: User): PublicUserProfile {
    const g: GlickoPublicPayload = toGlickoPublic({
      rating: u.rating,
      rd: u.rd,
      volatility: u.volatility,
      matches: u.matches,
      band: u.ratingBand,
      display: u.ratingDisplay,
    });
    return {
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      reputation: u.reputation ?? 0,
      rating: g.rating,
      rd: g.rd,
      volatility: g.volatility,
      matches: g.matches,
      band: g.band,
      ratingDisplay: g.display,
      ladder: 'roc_glicko2',
      role: u.role,
    };
  }

  /** Safe public fields only (no email / password). */
  async getPublicProfile(id: string): Promise<PublicUserProfile | null> {
    const u = await this.findById(id);
    if (!u) return null;
    return this.toPublic(u);
  }

  async findPublicByIds(ids: string[]): Promise<PublicUserProfile[]> {
    if (!ids.length) return [];
    const unique = [...new Set(ids)];
    const rows = await this.usersRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: unique })
      .getMany();
    return rows.map((u) => this.toPublic(u));
  }

  /**
   * Minimal safe player search: display name contains `q`, or exact email match.
   * Never returns email. Caller must be authenticated.
   */
  async searchPublic(q: string, opts?: { excludeId?: string; limit?: number }): Promise<PublicUserProfile[]> {
    const needle = q.trim().slice(0, 64);
    if (needle.length < 2) return [];
    const limit = Math.min(20, Math.max(1, opts?.limit ?? 12));
    const escaped = needle.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const qb = this.usersRepository.createQueryBuilder('u').where(
      new Brackets((sub) => {
        sub.where(`u.displayName ILIKE :name ESCAPE '\\'`, { name: `%${escaped}%` });
        if (needle.includes('@')) {
          sub.orWhere('LOWER(u.email) = LOWER(:email)', { email: needle });
        }
      }),
    );
    if (opts?.excludeId) {
      qb.andWhere('u.id != :me', { me: opts.excludeId });
    }
    const rows = await qb.orderBy('u.display_name', 'ASC').take(limit).getMany();
    return rows.map((u) => this.toPublic(u));
  }

  async setPremiumTier(
    userId: string,
    tier: 'free' | 'premium' | 'hall_pro',
    days = 30,
  ): Promise<{
    id: string;
    premiumTier: string;
    premiumUntil: Date | null;
    premiumActive: boolean;
  }> {
    const u = await this.findById(userId);
    if (!u) throw new Error('User not found');
    u.premiumTier = tier;
    u.premiumUntil =
      tier === 'free'
        ? null
        : new Date(Date.now() + Math.max(1, days) * 24 * 60 * 60 * 1000);
    await this.usersRepository.save(u);
    const premiumActive =
      u.premiumTier !== 'free' &&
      (!u.premiumUntil || u.premiumUntil > new Date());
    return {
      id: u.id,
      premiumTier: u.premiumTier,
      premiumUntil: u.premiumUntil,
      premiumActive,
    };
  }

  isPremiumActive(u: User): boolean {
    if (!u.premiumTier || u.premiumTier === 'free') return false;
    if (!u.premiumUntil) return true;
    return u.premiumUntil > new Date();
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const rating = ROC_DEFAULT_RATING;
    const user = this.usersRepository.create({
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      premiumTier: 'free',
      rating,
      rd: ROC_DEFAULT_RD,
      volatility: ROC_DEFAULT_VOLATILITY,
      matches: 0,
      ratingBand: 'Advanced',
      ratingDisplay: formatRatingDisplay(rating, 'Advanced'),
      ratingUpdatedAt: null,
      lastMatchDelta: null,
    });

    return this.usersRepository.save(user);
  }

  async getLeaderboard(options: { limit: number; game?: string }) {
    const { limit } = options;
    return this.usersRepository.find({
      order: { rating: 'DESC' },
      take: limit,
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { emailVerifiedAt: new Date() });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { passwordHash });
  }

  async updateAvatarUrl(userId: string, avatarUrl: string): Promise<string> {
    const u = await this.findById(userId);
    if (!u) throw new BadRequestException('User not found');
    u.avatarUrl = avatarUrl;
    await this.usersRepository.save(u);
    return avatarUrl;
  }

  /**
   * Hall-photo style upload: data-URL or pass-through https / /uploads URL.
   */
  async uploadAvatar(
    userId: string,
    input: { photoBase64?: string; avatarUrl?: string },
  ): Promise<{ avatarUrl: string }> {
    const avatarUrl = await this.resolveAvatarUrl(userId, input);
    await this.updateAvatarUrl(userId, avatarUrl);
    return { avatarUrl };
  }

  private async resolveAvatarUrl(
    userId: string,
    input: { photoBase64?: string; avatarUrl?: string },
  ): Promise<string> {
    if (input.photoBase64 && input.photoBase64.startsWith('data:')) {
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(input.photoBase64);
      if (!match) {
        throw new BadRequestException('Invalid image data URL');
      }
      const approxBytes = Math.floor((match[2].length * 3) / 4);
      if (approxBytes > MAX_AVATAR_BYTES) {
        throw new BadRequestException('Avatar must be 2 MB or smaller');
      }
      try {
        const put = await this.storage.putDataUrl(`avatars/${userId}`, input.photoBase64);
        return put.url;
      } catch (e) {
        throw new BadRequestException(e instanceof Error ? e.message : 'Invalid photo');
      }
    }
    if (
      input.avatarUrl &&
      (input.avatarUrl.startsWith('http://') ||
        input.avatarUrl.startsWith('https://') ||
        input.avatarUrl.startsWith('/uploads/'))
    ) {
      return input.avatarUrl;
    }
    throw new BadRequestException('avatarUrl or photoBase64 required');
  }
}
