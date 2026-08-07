import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import {
  allowLocalEloFallback,
  realaiRatingConvert,
  realaiRatingUpdate,
  type GlickoPlayerAfter,
  type RackUpPlayerContext,
} from '../ai/realai-coach.client';
import {
  formatRatingDisplay,
  ROC_DEFAULT_RATING,
  ROC_DEFAULT_RD,
  ROC_DEFAULT_VOLATILITY,
  toGlickoPublic,
  type GlickoPublicPayload,
} from './rating-display';

export type ApplyMatchResultOpts = {
  /**
   * Multiplier on Glicko update strength when RealAI accepts rating_weight
   * (Pyramid skill tiers: 0.7 / 0.85 / 1.0 / 1.15).
   */
  ratingWeight?: number;
  /** @deprecated Elo K — ignored for Glicko-2 RealAI path; used only in local fallback. */
  baseK?: number;
  game?: string;
  gameStyle?: string;
  format?: string;
  tableSize?: string;
  skillLevel?: string;
  winnerScore?: number;
  loserScore?: number;
  forfeit?: boolean;
  matchId?: string;
  sessionId?: string;
  rocLeagueId?: string;
  /** Prefer RealAI; if false, force local (tests). Default true. */
  useRealAi?: boolean;
};

export type RatingApplyResult = {
  winnerRating: number;
  loserRating: number;
  winnerRd: number;
  loserRd: number;
  winnerDisplay: string;
  loserDisplay: string;
  provider: 'realai' | 'local_fallback';
  winnerDelta?: number;
  loserDelta?: number;
  algorithm?: string;
  ladder?: string;
  /** @deprecated local fallback only */
  kUsed?: number;
};

/**
 * ROC Glicko-2 ladder persistence.
 *
 * RealAI owns Glicko-2 math (`rating_update` / `rating_convert`).
 * RackUp only writes rating, rd, volatility, matches, display fields.
 * Ledger / session payouts are independent (never mixed here).
 *
 * Contract: ROC_GLICKO2_RATING_CONTRACT.md
 */
@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /** Public chip payload for profiles / operators. */
  publicPayload(u: User): GlickoPublicPayload {
    return toGlickoPublic({
      rating: u.rating,
      rd: u.rd,
      volatility: u.volatility,
      matches: u.matches,
      band: u.ratingBand,
      display: u.ratingDisplay,
    });
  }

  async applyMatchResult(
    winnerId: string,
    loserId: string,
    opts?: ApplyMatchResultOpts,
  ): Promise<RatingApplyResult | void> {
    if (!winnerId || !loserId || winnerId === loserId) return;

    const [winner, loser] = await Promise.all([
      this.usersRepo.findOne({ where: { id: winnerId } }),
      this.usersRepo.findOne({ where: { id: loserId } }),
    ]);
    if (!winner || !loser) return;

    this.ensureGlickoDefaults(winner);
    this.ensureGlickoDefaults(loser);

    const useRealAi = opts?.useRealAi !== false;
    if (useRealAi) {
      try {
        return await this.applyViaRealAiGlicko(winner, loser, opts);
      } catch (e) {
        this.logger.warn(
          `RealAI Glicko rating_update failed: ${e instanceof Error ? e.message : e}`,
        );
        if (!allowLocalEloFallback()) {
          throw new ServiceUnavailableException(
            'RealAI rating_update (Glicko-2) unavailable — match rating not applied. ' +
              'Set REALAI_FALLBACK_LOCAL_ELO=1 for offline local fallback (not production Glicko).',
          );
        }
        this.logger.warn(
          'Falling back to local rating adjust (REALAI_FALLBACK_LOCAL_ELO) — not Glicko-2',
        );
      }
    }

    return this.applyLocalFallback(winner, loser, opts);
  }

  /**
   * One-time seed from external league rating via RealAI `rating_convert`.
   * Only when matches == 0 (no ROC Glicko history).
   */
  async seedFromExternal(
    userId: string,
    input: {
      from_system: string;
      from_value: number;
      from_scale?: string;
      also_known?: Array<Record<string, unknown>>;
    },
  ): Promise<GlickoPublicPayload> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new ServiceUnavailableException('User not found');

    if ((user.matches ?? 0) > 0) {
      this.logger.warn(
        `seedFromExternal skipped user=${userId} matches=${user.matches}`,
      );
      return this.publicPayload(user);
    }

    try {
      const converted = await realaiRatingConvert({
        player: {
          player_id: user.id,
          display_name: user.displayName,
          rating: user.rating ?? ROC_DEFAULT_RATING,
          rd: user.rd ?? ROC_DEFAULT_RD,
          volatility: user.volatility ?? ROC_DEFAULT_VOLATILITY,
          matches_played_rackup: 0,
          rating_system: 'rackup',
          primary_rating_system: input.from_system,
          league_ratings: { [input.from_system]: input.from_value },
        },
        from_system: input.from_system,
        from_value: input.from_value,
        from_scale: input.from_scale,
        also_known: input.also_known,
      });

      const seed = converted.glicko2_seed;
      user.rating = seed?.rating ?? converted.rackup_rating_estimate;
      user.rd = seed?.rd ?? 150;
      user.volatility = seed?.volatility ?? ROC_DEFAULT_VOLATILITY;
      user.matches = 0;
      user.ratingBand = seed?.band ?? converted.band_label ?? null;
      user.ratingDisplay =
        seed?.display ??
        converted.display ??
        formatRatingDisplay(user.rating, user.ratingBand);
      user.ratingUpdatedAt = new Date();
      user.lastMatchDelta = null;
      await this.usersRepo.save(user);
      return this.publicPayload(user);
    } catch (e) {
      this.logger.warn(
        `rating_convert seed failed: ${e instanceof Error ? e.message : e}`,
      );
      // Offline seed defaults
      this.ensureGlickoDefaults(user);
      await this.usersRepo.save(user);
      return this.publicPayload(user);
    }
  }

  private ensureGlickoDefaults(u: User): void {
    if (u.rating == null || !Number.isFinite(Number(u.rating))) {
      u.rating = ROC_DEFAULT_RATING;
    }
    if (u.rd == null || !Number.isFinite(Number(u.rd))) {
      u.rd = ROC_DEFAULT_RD;
    }
    if (u.volatility == null || !Number.isFinite(Number(u.volatility))) {
      u.volatility = ROC_DEFAULT_VOLATILITY;
    }
    if (u.matches == null || !Number.isFinite(Number(u.matches))) {
      u.matches = 0;
    }
  }

  private playerContext(u: User, discipline?: string): RackUpPlayerContext {
    return {
      player_id: u.id,
      display_name: u.displayName,
      rating: Number(u.rating),
      rd: Number(u.rd ?? ROC_DEFAULT_RD),
      volatility: Number(u.volatility ?? ROC_DEFAULT_VOLATILITY),
      matches_played_rackup: Number(u.matches ?? 0),
      rating_system: 'rackup',
      discipline,
    };
  }

  private applySide(user: User, after: GlickoPlayerAfter, deltaHint?: number): void {
    const before = Number(user.rating);
    user.rating = after.rating;
    user.rd = after.rd;
    user.volatility = after.volatility;
    user.matches = (user.matches ?? 0) + 1;
    user.ratingBand = after.band ?? null;
    user.ratingDisplay =
      after.display ?? formatRatingDisplay(after.rating, after.band);
    user.ratingUpdatedAt = new Date();
    user.lastMatchDelta =
      deltaHint != null && Number.isFinite(deltaHint)
        ? deltaHint
        : after.rating - before;
  }

  private async applyViaRealAiGlicko(
    winner: User,
    loser: User,
    opts?: ApplyMatchResultOpts,
  ): Promise<RatingApplyResult> {
    const weight = Number.isFinite(opts?.ratingWeight)
      ? Math.max(0.1, Math.min(2, Number(opts!.ratingWeight)))
      : 1;
    const game = opts?.gameStyle ?? opts?.game ?? 'eight_ball';
    const format = opts?.format ?? 'SINGLES';
    const margin =
      opts?.winnerScore != null && opts?.loserScore != null
        ? Math.abs(opts.winnerScore - opts.loserScore)
        : undefined;

    // Snapshot pre-match (both use pre-match states for Glicko)
    const wBefore = {
      rating: Number(winner.rating),
      rd: Number(winner.rd ?? ROC_DEFAULT_RD),
      vol: Number(winner.volatility ?? ROC_DEFAULT_VOLATILITY),
    };
    const lBefore = {
      rating: Number(loser.rating),
      rd: Number(loser.rd ?? ROC_DEFAULT_RD),
      vol: Number(loser.volatility ?? ROC_DEFAULT_VOLATILITY),
    };

    const common = {
      game,
      game_style: game,
      format,
      table_size: opts?.tableSize,
      skill_level: opts?.skillLevel,
      rating_weight: weight,
      forfeit: opts?.forfeit ?? false,
      margin,
      match_id: opts?.matchId,
      session_id: opts?.sessionId,
      roc_league_id: opts?.rocLeagueId,
      player_ids_json: [winner.id, loser.id],
    };

    // Winner perspective — RealAI may return both winner_after and loser_after
    const wRes = await realaiRatingUpdate({
      player: this.playerContext(winner, game),
      opponent_id: loser.id,
      opponent_rating: lBefore.rating,
      opponent_rd: lBefore.rd,
      opponent_volatility: lBefore.vol,
      won: true,
      my_score: opts?.winnerScore,
      opp_score: opts?.loserScore,
      ...common,
    });

    let winnerAfter: GlickoPlayerAfter = wRes.winner_after ??
      wRes.player_after ?? {
        player_id: winner.id,
        rating: wRes.rating_after,
        rd: wRes.rd_after ?? wBefore.rd,
        volatility: wRes.volatility_after ?? wBefore.vol,
        band: wRes.band ?? wRes.band_after,
        display: wRes.display_after,
      };

    let loserAfter: GlickoPlayerAfter | undefined = wRes.loser_after;

    if (!loserAfter) {
      // Second call — loser perspective with pre-match opponent state
      const lRes = await realaiRatingUpdate({
        player: this.playerContext(loser, game),
        opponent_id: winner.id,
        opponent_rating: wBefore.rating,
        opponent_rd: wBefore.rd,
        opponent_volatility: wBefore.vol,
        won: false,
        my_score: opts?.loserScore,
        opp_score: opts?.winnerScore,
        ...common,
      });
      loserAfter = lRes.loser_after ??
        lRes.player_after ?? {
          player_id: loser.id,
          rating: lRes.rating_after,
          rd: lRes.rd_after ?? lBefore.rd,
          volatility: lRes.volatility_after ?? lBefore.vol,
          band: lRes.band ?? lRes.band_after,
          display: lRes.display_after,
        };
      // Prefer dual winner_after if second call also has it (shouldn't overwrite)
      if (lRes.winner_after && lRes.winner_after.player_id === winner.id) {
        winnerAfter = lRes.winner_after;
      }
    }

    // Ensure ids
    winnerAfter = { ...winnerAfter, player_id: winner.id };
    loserAfter = { ...loserAfter, player_id: loser.id };

    this.applySide(winner, winnerAfter);
    this.applySide(loser, loserAfter);
    winner.reputation = Math.min(100, (winner.reputation ?? 0) + 1);

    await this.usersRepo.save([winner, loser]);

    return {
      winnerRating: winner.rating,
      loserRating: loser.rating,
      winnerRd: winner.rd,
      loserRd: loser.rd,
      winnerDisplay: winner.ratingDisplay ?? formatRatingDisplay(winner.rating),
      loserDisplay: loser.ratingDisplay ?? formatRatingDisplay(loser.rating),
      provider: 'realai',
      winnerDelta: winner.lastMatchDelta ?? undefined,
      loserDelta: loser.lastMatchDelta ?? undefined,
      algorithm: wRes.algorithm ?? 'glicko2_v1',
      ladder: wRes.ladder ?? 'roc_glicko2',
    };
  }

  /**
   * Offline-only crude rating nudge — NOT Glicko-2.
   * Production must use RealAI.
   */
  private async applyLocalFallback(
    winner: User,
    loser: User,
    opts?: ApplyMatchResultOpts,
  ): Promise<RatingApplyResult> {
    const weight = Number.isFinite(opts?.ratingWeight)
      ? Math.max(0.1, Math.min(2, Number(opts!.ratingWeight)))
      : 1;
    const baseK = opts?.baseK ?? 24;
    const K = baseK * weight;

    const wR = Number(winner.rating);
    const lR = Number(loser.rating);
    const expectedW = 1 / (1 + Math.pow(10, (lR - wR) / 400));
    const expectedL = 1 - expectedW;

    winner.rating = wR + K * (1 - expectedW);
    loser.rating = Math.max(100, lR + K * (0 - expectedL));
    // Soft RD shrink when playing offline (not true Glicko)
    winner.rd = Math.max(30, Number(winner.rd ?? ROC_DEFAULT_RD) * 0.98);
    loser.rd = Math.max(30, Number(loser.rd ?? ROC_DEFAULT_RD) * 0.98);
    winner.volatility = winner.volatility ?? ROC_DEFAULT_VOLATILITY;
    loser.volatility = loser.volatility ?? ROC_DEFAULT_VOLATILITY;
    winner.matches = (winner.matches ?? 0) + 1;
    loser.matches = (loser.matches ?? 0) + 1;
    winner.ratingBand = null;
    loser.ratingBand = null;
    winner.ratingDisplay = formatRatingDisplay(winner.rating);
    loser.ratingDisplay = formatRatingDisplay(loser.rating);
    winner.ratingUpdatedAt = new Date();
    loser.ratingUpdatedAt = new Date();
    winner.lastMatchDelta = winner.rating - wR;
    loser.lastMatchDelta = loser.rating - lR;
    winner.reputation = Math.min(100, (winner.reputation ?? 0) + 1);

    await this.usersRepo.save([winner, loser]);
    return {
      winnerRating: winner.rating,
      loserRating: loser.rating,
      winnerRd: winner.rd,
      loserRd: loser.rd,
      winnerDisplay: winner.ratingDisplay!,
      loserDisplay: loser.ratingDisplay!,
      provider: 'local_fallback',
      winnerDelta: winner.lastMatchDelta,
      loserDelta: loser.lastMatchDelta,
      algorithm: 'local_elo_fallback_not_glicko2',
      ladder: 'roc_glicko2',
      kUsed: K,
    };
  }
}
