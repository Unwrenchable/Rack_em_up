import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerIdentity } from './player-identity.entity';
import { User } from '../users/users.entity';
import { NAME_MATCH_AMBIGUOUS_GAP, NAME_MATCH_THRESHOLD, nameSimilarity, normalizePersonName } from './name-fuzzy';
import { ApaClient } from './apa.client';
import { FargoRateClient } from './fargo-rate.client';
import type { ResolveIdentityDto } from './dto/ratings.dto';
import type { TapStats } from './player-card.types';

export type IdentityResolveHints = ResolveIdentityDto;

export type IdentityResolveResult = {
  identity: PlayerIdentity;
  method: string;
  created: boolean;
  notes: string[];
  ambiguous?: Array<{ unified_id: string; name: string; score: number }>;
};

function firstNonEmpty(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

@Injectable()
export class IdentityResolverService {
  private readonly logger = new Logger(IdentityResolverService.name);

  constructor(
    @InjectRepository(PlayerIdentity)
    private readonly identities: Repository<PlayerIdentity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly fargo: FargoRateClient,
    private readonly apa: ApaClient,
  ) {}

  async resolve(hints: IdentityResolveHints): Promise<IdentityResolveResult> {
    const notes: string[] = [];
    const found = await this.findExisting(hints, notes);
    let identity: PlayerIdentity;
    let created = false;
    let method = found?.method ?? 'created';

    if (found) {
      identity = found.identity;
    } else {
      const user = hints.userId
        ? await this.users.findOne({ where: { id: hints.userId } })
        : null;
      const displayName =
        firstNonEmpty(hints.name, user?.displayName) ?? 'Unknown player';
      identity = this.identities.create({
        userId: user?.id ?? hints.userId ?? null,
        displayName,
        nameNormalized: normalizePersonName(displayName),
        fargoId: hints.fargo_id ?? null,
        fargoReadableId: hints.fargo_readable_id ?? null,
        apaMemberId: hints.apa_member_id ?? null,
        bcaId: hints.bca_id ?? null,
        tapId: hints.tap_id ?? null,
        shadowProvisional: true,
      });
      created = true;
      method = user ? 'created_for_user' : 'created';
      notes.push('New unified_id allocated — no existing identity matched.');
    }

    this.mergeHints(identity, hints);
    if (hints.name && !identity.displayName) {
      identity.displayName = hints.name;
    }
    identity.nameNormalized = normalizePersonName(identity.displayName);

    if (hints.refreshFargo) {
      await this.refreshFargo(identity, notes, { allowNameSearch: true });
    }
    if (hints.lookupApa) {
      await this.lookupApa(identity, notes);
    }

    await this.identities.save(identity);
    return {
      identity,
      method,
      created,
      notes,
      ambiguous: found?.ambiguous,
    };
  }

  async findByUserId(userId: string): Promise<PlayerIdentity | null> {
    return this.identities.findOne({ where: { userId } });
  }

  async findByUnifiedId(id: string): Promise<PlayerIdentity | null> {
    return this.identities.findOne({ where: { id } });
  }

  applyTapStats(identity: PlayerIdentity, tap: TapStats | undefined): void {
    if (!tap) return;
    identity.tapStats = {
      ...(identity.tapStats ?? {}),
      ...tap,
      imported_at: new Date().toISOString(),
    };
  }

  private mergeHints(identity: PlayerIdentity, hints: IdentityResolveHints): void {
    identity.fargoId = firstNonEmpty(hints.fargo_id, identity.fargoId);
    identity.fargoReadableId = firstNonEmpty(
      hints.fargo_readable_id,
      identity.fargoReadableId,
    );
    identity.apaMemberId = firstNonEmpty(hints.apa_member_id, identity.apaMemberId);
    identity.bcaId = firstNonEmpty(hints.bca_id, identity.bcaId);
    identity.tapId = firstNonEmpty(hints.tap_id, identity.tapId);
    if (hints.name && hints.name.trim()) {
      identity.displayName = hints.name.trim();
    }
    if (hints.userId && !identity.userId) {
      identity.userId = hints.userId;
    }
  }

  private async findExisting(
    hints: IdentityResolveHints,
    notes: string[],
  ): Promise<{
    identity: PlayerIdentity;
    method: string;
    ambiguous?: Array<{ unified_id: string; name: string; score: number }>;
  } | null> {
    if (hints.unifiedId) {
      const row = await this.identities.findOne({ where: { id: hints.unifiedId } });
      if (row) return { identity: row, method: 'unified_id' };
      notes.push(`unified_id ${hints.unifiedId} not found`);
    }

    const idLookups: Array<[keyof PlayerIdentity, string | undefined, string]> = [
      ['fargoId', hints.fargo_id, 'fargo_id'],
      ['fargoReadableId', hints.fargo_readable_id, 'fargo_readable_id'],
      ['apaMemberId', hints.apa_member_id, 'apa_member_id'],
      ['bcaId', hints.bca_id, 'bca_id'],
      ['tapId', hints.tap_id, 'tap_id'],
      ['userId', hints.userId, 'user_id'],
    ];
    for (const [col, val, method] of idLookups) {
      if (!val) continue;
      const row = await this.identities.findOne({ where: { [col]: val } as any });
      if (row) return { identity: row, method };
    }

    if (hints.userId) {
      const user = await this.users.findOne({ where: { id: hints.userId } });
      if (user) {
        const byName = await this.fuzzyIdentity(user.displayName);
        if (byName && byName.score >= NAME_MATCH_THRESHOLD && !byName.ambiguous.length) {
          if (!byName.identity.userId) byName.identity.userId = user.id;
          notes.push(`Linked user ${user.id} to existing identity via name`);
          return { identity: byName.identity, method: 'user_name_fuzzy' };
        }
      }
    }

    const name = hints.name?.trim();
    if (name && name.length >= 2) {
      const fuzzy = await this.fuzzyIdentity(name);
      if (fuzzy && fuzzy.score >= NAME_MATCH_THRESHOLD) {
        if (fuzzy.ambiguous.length) {
          notes.push('Ambiguous name match — using top candidate; review before merge.');
        }
        return {
          identity: fuzzy.identity,
          method: 'name_fuzzy',
          ambiguous: fuzzy.ambiguous,
        };
      }
    }

    return null;
  }

  private async fuzzyIdentity(name: string): Promise<{
    identity: PlayerIdentity;
    score: number;
    ambiguous: Array<{ unified_id: string; name: string; score: number }>;
  } | null> {
    const needle = normalizePersonName(name);
    if (!needle) return null;

    const rows = await this.identities
      .createQueryBuilder('p')
      .where('p.nameNormalized LIKE :pre', { pre: `${needle.split(' ')[0]}%` })
      .orWhere('p.displayName ILIKE :q', { q: `%${name.trim().slice(0, 64)}%` })
      .take(40)
      .getMany();

    const users = await this.users
      .createQueryBuilder('u')
      .where('u.displayName ILIKE :q', { q: `%${name.trim().slice(0, 64)}%` })
      .take(20)
      .getMany();

    const scored: Array<{ identity: PlayerIdentity; score: number; ephemeral?: boolean }> = [];

    for (const row of rows) {
      scored.push({ identity: row, score: nameSimilarity(name, row.displayName) });
    }
    for (const u of users) {
      const existing = rows.find((r) => r.userId === u.id);
      if (existing) continue;
      const score = nameSimilarity(name, u.displayName);
      if (score < NAME_MATCH_THRESHOLD) continue;
      let ident = await this.identities.findOne({ where: { userId: u.id } });
      if (!ident) {
        ident = this.identities.create({
          userId: u.id,
          displayName: u.displayName,
          nameNormalized: normalizePersonName(u.displayName),
          shadowProvisional: true,
        });
      }
      scored.push({ identity: ident, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (!top) return null;
    const ambiguous = scored
      .slice(1)
      .filter((s) => top.score - s.score < NAME_MATCH_AMBIGUOUS_GAP)
      .map((s) => ({
        unified_id: s.identity.id,
        name: s.identity.displayName,
        score: Number(s.score.toFixed(3)),
      }));
    return { identity: top.identity, score: top.score, ambiguous };
  }

  async refreshFargo(
    identity: PlayerIdentity,
    notes: string[],
    opts?: { allowNameSearch?: boolean },
  ): Promise<void> {
    try {
      let hit = identity.fargoReadableId
        ? await this.fargo.getPlayer(identity.fargoReadableId)
        : null;
      if (!hit && identity.fargoId) {
        hit = await this.fargo.getPlayer(identity.fargoId);
      }
      if (!hit && opts?.allowNameSearch && identity.displayName) {
        const results = await this.fargo.search(identity.displayName);
        const exact = results.filter(
          (r) => nameSimilarity(r.name, identity.displayName) >= NAME_MATCH_THRESHOLD,
        );
        if (exact.length === 1) {
          hit = exact[0];
          notes.push('Fargo name search unique match');
        } else if (exact.length > 1) {
          notes.push(`Fargo name search ambiguous (${exact.length}) — not attached`);
        } else if (!results.length) {
          notes.push('Fargo search returned no players');
        } else {
          notes.push('Fargo name search below match threshold — not attached');
        }
      }
      if (!hit) return;
      if (hit.rating == null && hit.robustness == null) {
        notes.push('Fargo payload had no published rating — stored ids only');
      }
      identity.fargoId = firstNonEmpty(hit.fargo_id, identity.fargoId);
      identity.fargoReadableId = firstNonEmpty(hit.readable_id, identity.fargoReadableId);
      if (hit.rating != null) identity.fargoRating = hit.rating;
      if (hit.robustness != null) identity.fargoRobustness = hit.robustness;
      if (hit.effective_rating != null) identity.fargoEffectiveRating = hit.effective_rating;
      identity.fargoFetchedAt = new Date();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Fargo refresh skipped: ${msg}`);
      notes.push(`Fargo refresh failed: ${msg}`);
    }
  }

  private async lookupApa(identity: PlayerIdentity, notes: string[]): Promise<void> {
    if (!this.apa.isConfigured()) {
      notes.push('APA skipped — APA_API_TOKEN/APA_API_BASE not set');
      return;
    }
    try {
      if (identity.apaMemberId) {
        const row = await this.apa.lookupByMemberId(identity.apaMemberId);
        if (row?.apa_sl != null) identity.apaSl = row.apa_sl;
        return;
      }
      const hits = await this.apa.searchByName(identity.displayName);
      if (hits.length === 1) {
        identity.apaMemberId = hits[0].apa_member_id;
        if (hits[0].apa_sl != null) identity.apaSl = hits[0].apa_sl;
      } else {
        notes.push(
          hits.length
            ? `APA name search ambiguous (${hits.length})`
            : 'APA name search empty',
        );
      }
    } catch (e) {
      notes.push(`APA lookup failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}
