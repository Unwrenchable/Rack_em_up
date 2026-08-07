import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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
}
