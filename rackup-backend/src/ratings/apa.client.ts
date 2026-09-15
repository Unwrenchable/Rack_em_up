import { Injectable, Logger } from '@nestjs/common';

/**
 * APA client stub. Read-only lookup when `APA_API_TOKEN` (and `APA_API_BASE`)
 * are set. Otherwise skip — never invent skill levels, never POST matches.
 */
export type ApaMemberRead = {
  apa_member_id: string;
  name: string;
  apa_sl: number | null;
  raw: Record<string, unknown>;
};

@Injectable()
export class ApaClient {
  private readonly logger = new Logger(ApaClient.name);

  isConfigured(): boolean {
    return Boolean((process.env.APA_API_TOKEN ?? '').trim() && (process.env.APA_API_BASE ?? '').trim());
  }

  async lookupByMemberId(memberId: string): Promise<ApaMemberRead | null> {
    return this.get('/members/' + encodeURIComponent(memberId.trim()), memberId);
  }

  async searchByName(name: string): Promise<ApaMemberRead[]> {
    const q = name.trim();
    if (q.length < 2) return [];
    if (!this.isConfigured()) return [];
    const json = await this.getJson(`/members?q=${encodeURIComponent(q)}`);
    const list = Array.isArray(json)
      ? json
      : json && typeof json === 'object' && Array.isArray((json as { results?: unknown }).results)
        ? (json as { results: unknown[] }).results
        : [];
    return list
      .map((row) => this.parseMember(row))
      .filter((x): x is ApaMemberRead => x != null);
  }

  private async get(path: string, fallbackId: string): Promise<ApaMemberRead | null> {
    if (!this.isConfigured()) return null;
    const json = await this.getJson(path);
    return this.parseMember(json) ?? (json
      ? {
          apa_member_id: fallbackId,
          name: '',
          apa_sl: this.parseSl(json),
          raw: json as Record<string, unknown>,
        }
      : null);
  }

  private parseSl(json: unknown): number | null {
    if (json == null || typeof json !== 'object') return null;
    const rec = json as Record<string, unknown>;
    const v = rec.apa_sl ?? rec.skill_level ?? rec.skillLevel ?? rec.sl;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 1 || n > 9) return null;
    return n;
  }

  private parseMember(json: unknown): ApaMemberRead | null {
    if (json == null || typeof json !== 'object') return null;
    const rec = json as Record<string, unknown>;
    const id = rec.apa_member_id ?? rec.memberId ?? rec.member_id ?? rec.id;
    if (id == null || !String(id).trim()) return null;
    const name = rec.name ?? rec.displayName ?? rec.display_name;
    return {
      apa_member_id: String(id).trim(),
      name: name != null ? String(name) : '',
      apa_sl: this.parseSl(json),
      raw: rec,
    };
  }

  private async getJson(path: string): Promise<unknown> {
    const token = (process.env.APA_API_TOKEN ?? '').trim();
    const base = (process.env.APA_API_BASE ?? '').trim().replace(/\/+$/, '');
    if (!token || !base) return null;
    const timeout = Number(process.env.APA_TIMEOUT_MS ?? 8000);
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(Number.isFinite(timeout) ? timeout : 8000),
      });
      if (!res.ok) {
        this.logger.warn(`APA GET ${path} HTTP ${res.status}`);
        return null;
      }
      return res.json();
    } catch (e) {
      this.logger.warn(`APA skip: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }
}
