import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { PoolMatch } from '../matches/pool-match.entity';
import { PlayerExternalRating } from '../leagues/v2/entities/player-external-rating.entity';
import { ExternalRatingSource } from '../leagues/v2/entities/external-rating-source.entity';
import { toGlickoPublic } from '../users/rating-display';
import { PlayerIdentity } from './player-identity.entity';
import { IdentityResolverService } from './identity-resolver.service';
import { FargoRateClient } from './fargo-rate.client';
import { computeRackupShadow } from './shadow-rating';
import {
  formatFargoPair,
  formatShadowPair,
  RACKUP_SHADOW_DISCLAIMER,
  RACKUP_SHADOW_LABEL,
  type RackupLadderStats,
  type RackupShadow,
  type UnifiedPlayerCard,
} from './player-card.types';
import type { ManualLeagueImportDto, ShadowRecomputeDto } from './dto/ratings.dto';

/**
 * Assembles the Unified Player Card.
 *
 * ROC Glicko-2 is read from `users.*` into `rackup_stats` only.
 * Shadow is computed and stored on `player_identities`, never on `users.rating`.
 */
@Injectable()
export class PlayerCardService {
  private readonly logger = new Logger(PlayerCardService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(PlayerIdentity)
    private readonly identities: Repository<PlayerIdentity>,
    @InjectRepository(PlayerExternalRating)
    private readonly externalRatings: Repository<PlayerExternalRating>,
    @InjectRepository(ExternalRatingSource)
    private readonly sources: Repository<ExternalRatingSource>,
    @InjectRepository(PoolMatch)
    private readonly matches: Repository<PoolMatch>,
    private readonly resolver: IdentityResolverService,
    private readonly fargo: FargoRateClient,
  ) {}

  async getCardForUser(
    userId: string,
    opts?: { refreshFargo?: boolean },
  ): Promise<UnifiedPlayerCard> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const resolved = await this.resolver.resolve({
      userId: user.id,
      name: user.displayName,
      refreshFargo: opts?.refreshFargo,
    });
    const notes = [...resolved.notes];
    if (!opts?.refreshFargo && this.linkedFargoStale(resolved.identity)) {
      await this.resolver.refreshFargo(resolved.identity, notes, { allowNameSearch: false });
    }
    const importNotes = await this.overlayLeagueImports(resolved.identity, user.id);
    await this.ensureShadow(resolved.identity, user);
    await this.identities.save(resolved.identity);
    return this.toCard(resolved.identity, user, [...notes, ...importNotes], resolved.method);
  }

  async getCardByUnifiedId(unifiedId: string): Promise<UnifiedPlayerCard> {
    const identity = await this.resolver.findByUnifiedId(unifiedId);
    if (!identity) throw new NotFoundException('Player identity not found');
    const user = identity.userId
      ? await this.users.findOne({ where: { id: identity.userId } })
      : null;
    const notes: string[] = [];
    if (user) {
      notes.push(...(await this.overlayLeagueImports(identity, user.id)));
      await this.ensureShadow(identity, user);
      await this.identities.save(identity);
    }
    return this.toCard(identity, user, notes, 'unified_id');
  }

  async recomputeShadow(dto: ShadowRecomputeDto, fallbackUserId?: string): Promise<UnifiedPlayerCard> {
    const userId = dto.userId ?? fallbackUserId;
    if (dto.unifiedId && !userId) {
      const identity = await this.resolver.findByUnifiedId(dto.unifiedId);
      if (!identity) throw new NotFoundException('Player identity not found');
      if (!identity.userId) {
        throw new BadRequestException(
          'Shadow recompute needs a linked RackUp user (ROC Glicko-2).',
        );
      }
      return this.getCardForUser(identity.userId);
    }
    if (!userId) throw new BadRequestException('userId or unifiedId required');
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const resolved = await this.resolver.resolve({ userId, name: user.displayName });
    const shadow = this.writeShadow(resolved.identity, user);
    await this.identities.save(resolved.identity);
    this.logger.log(
      `shadow recomputed unified=${resolved.identity.id} user=${user.id} ` +
        `RackUpRate=${shadow.rating} rob=${shadow.robustness} (users.rating untouched)`,
    );
    return this.toCard(resolved.identity, user, resolved.notes, 'shadow_recompute');
  }

  /**
   * After RatingService.seedFromExternal — persist the *external* number onto
   * the card continuum. Does not write `from_value` onto `users.rating`
   * (seed already went through RealAI rating_convert for ROC Glicko).
   */
  async recordExternalSeed(
    userId: string,
    input: { from_system: string; from_value: number; from_scale?: string },
  ): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) return;
    const { identity } = await this.resolver.resolve({
      userId,
      name: user.displayName,
    });
    const sys = (input.from_system ?? '').toLowerCase();
    const v = input.from_value;
    if (!Number.isFinite(v)) return;

    if (sys.includes('fargo')) {
      if (v >= 0) identity.fargoRating = v;
    } else if (sys.includes('apa')) {
      identity.apaSl = v;
    } else if (sys.includes('bca') || sys.includes('scp')) {
      identity.bcaElo = v;
    } else if (sys.includes('tap')) {
      identity.tapStats = {
        ...(identity.tapStats ?? {}),
        skill: v,
        notes: input.from_scale ?? identity.tapStats?.notes,
        imported_at: new Date().toISOString(),
      };
    }
    this.writeShadow(identity, user);
    await this.identities.save(identity);
  }

  async manualImport(dto: ManualLeagueImportDto): Promise<UnifiedPlayerCard> {
    if (
      process.env.TAP_SCRAPE_ENABLED === '1' ||
      process.env.BCA_SCRAPE_ENABLED === '1'
    ) {
      this.logger.warn(
        'TAP_SCRAPE_ENABLED/BCA_SCRAPE_ENABLED is set — scrape is still not implemented; using manual import only',
      );
    }
    const resolved = await this.resolver.resolve({
      userId: dto.userId,
      unifiedId: dto.unifiedId,
      name: dto.name,
      fargo_id: dto.fargo_id,
      fargo_readable_id: dto.fargo_readable_id,
      apa_member_id: dto.apa_member_id,
      bca_id: dto.bca_id,
      tap_id: dto.tap_id,
    });
    const identity = resolved.identity;
    if (dto.apa_sl != null) identity.apaSl = dto.apa_sl;
    if (dto.bca_elo != null) identity.bcaElo = dto.bca_elo;
    if (dto.tap_stats) this.resolver.applyTapStats(identity, dto.tap_stats);
    await this.identities.save(identity);

    const user = identity.userId
      ? await this.users.findOne({ where: { id: identity.userId } })
      : null;
    if (user) this.writeShadow(identity, user);
    await this.identities.save(identity);
    return this.toCard(identity, user, resolved.notes, resolved.method);
  }

  searchFargo(q: string) {
    return this.fargo.search(q);
  }

  private linkedFargoStale(identity: PlayerIdentity): boolean {
    if (!identity.fargoReadableId && !identity.fargoId) return false;
    if (!identity.fargoFetchedAt) return true;
    const ttl = Number(process.env.FARGO_CACHE_TTL_MS ?? 10 * 60 * 1000);
    const ms = Number.isFinite(ttl) && ttl > 0 ? ttl : 10 * 60 * 1000;
    return Date.now() - identity.fargoFetchedAt.getTime() > ms;
  }

  private writeShadow(identity: PlayerIdentity, user: User): RackupShadow {
    const shadow = computeRackupShadow({
      rating: user.rating,
      rd: user.rd,
      matches: user.matches,
      volatility: user.volatility,
    });
    identity.shadowRating = shadow.rating;
    identity.shadowRobustness = shadow.robustness;
    identity.shadowProvisional = shadow.provisional;
    identity.shadowConfidenceLow = shadow.confidence_low;
    identity.shadowConfidenceHigh = shadow.confidence_high;
    identity.shadowComputedAt = new Date();
    return shadow;
  }

  private async ensureShadow(identity: PlayerIdentity, user: User): Promise<void> {
    if (
      identity.shadowRating == null ||
      identity.shadowComputedAt == null ||
      (user.ratingUpdatedAt && identity.shadowComputedAt < user.ratingUpdatedAt)
    ) {
      this.writeShadow(identity, user);
    }
  }

  /**
   * Overlay leagues-v2 *raw* external ratings onto card fields.
   * Uses `externalRating` (source scale), never `unifiedRating` (0–3000).
   */
  private async overlayLeagueImports(identity: PlayerIdentity, playerId: string): Promise<string[]> {
    const notes: string[] = [];
    const rows = await this.externalRatings.find({
      where: { playerId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    if (!rows.length) return notes;
    const sourceIds = [...new Set(rows.map((r) => r.sourceId))];
    const sources = sourceIds.length
      ? await this.sources.find({ where: { id: In(sourceIds) } })
      : [];
    const byId = new Map(sources.map((s) => [s.id, s]));

    const seen = new Set<string>();
    for (const row of rows) {
      const srcName = (byId.get(row.sourceId)?.name ?? '').toLowerCase();
      const key = srcName || row.sourceId;
      if (seen.has(key)) continue;
      seen.add(key);
      const raw = row.externalRating;
      if (srcName.includes('apa') && identity.apaSl == null) {
        identity.apaSl = raw;
      } else if (srcName.includes('fargo') && identity.fargoRating == null && raw >= 0) {
        identity.fargoRating = raw;
        notes.push('Fargo on card from leagues-v2 import (not live API)');
      } else if ((srcName.includes('bca') || srcName.includes('scp')) && identity.bcaElo == null) {
        identity.bcaElo = raw;
      } else if (srcName.includes('tap') && identity.tapStats == null) {
        identity.tapStats = {
          skill: raw,
          imported_at: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
        };
      }
    }
    return notes;
  }

  private async toCard(
    identity: PlayerIdentity,
    user: User | null,
    notes: string[],
    method: string,
  ): Promise<UnifiedPlayerCard> {
    const shadow = this.shadowFromIdentity(identity, user);
    const rackup_stats = user ? await this.rackupStats(user) : null;

    return {
      player: {
        name: identity.displayName || user?.displayName || 'Unknown',
        apa_sl: identity.apaSl,
        fargo_rating: identity.fargoRating,
        fargo_robustness: identity.fargoRobustness,
        bca_elo: identity.bcaElo,
        tap_stats: identity.tapStats,
        rackup_stats,
        unified_id: identity.id,
        rackup_shadow: shadow,
        fargo_id: identity.fargoId,
        fargo_readable_id: identity.fargoReadableId,
        apa_member_id: identity.apaMemberId,
        bca_id: identity.bcaId,
        tap_id: identity.tapId,
      },
      display: {
        fargo: formatFargoPair(identity.fargoRating, identity.fargoRobustness),
        rackup_shadow: formatShadowPair(shadow),
        disclaimer: RACKUP_SHADOW_DISCLAIMER,
      },
      meta: {
        user_id: identity.userId,
        fargo_fetched_at: identity.fargoFetchedAt?.toISOString() ?? null,
        shadow_computed_at: identity.shadowComputedAt?.toISOString() ?? null,
        resolve_method: method,
        notes: [
          ...notes,
          'ROC Glicko-2 is rackup_stats only; RackUpRate shadow is not official Fargo.',
        ],
      },
    };
  }

  private shadowFromIdentity(identity: PlayerIdentity, user: User | null): RackupShadow | null {
    if (identity.shadowRating != null) {
      return {
        rating: identity.shadowRating,
        robustness: identity.shadowRobustness ?? 0,
        provisional: identity.shadowProvisional,
        confidence_low: identity.shadowConfidenceLow ?? identity.shadowRating,
        confidence_high: identity.shadowConfidenceHigh ?? identity.shadowRating,
        official: false,
        source: 'rackup_glicko_shadow',
        label: RACKUP_SHADOW_LABEL,
      };
    }
    if (user) return computeRackupShadow(user);
    return null;
  }

  private async rackupStats(user: User): Promise<RackupLadderStats> {
    const g = toGlickoPublic({
      rating: user.rating,
      rd: user.rd,
      volatility: user.volatility,
      matches: user.matches,
      band: user.ratingBand,
      display: user.ratingDisplay,
    });
    const matches = await this.matches.find({
      where: [{ playerAId: user.id }, { playerBId: user.id }],
    });
    const completed = matches.filter((m) => m.status === 'COMPLETED');
    const wins = completed.filter((m) =>
      m.playerAId === user.id ? (m.aScore ?? 0) > (m.bScore ?? 0) : (m.bScore ?? 0) > (m.aScore ?? 0),
    ).length;
    return {
      ...g,
      last_match_delta: user.lastMatchDelta,
      wins,
      losses: completed.length - wins,
      completed_matches: completed.length,
    };
  }
}
