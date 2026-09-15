import { useState, type FormEvent } from 'react';
import { PlayerCardChips } from './PlayerCardChips';
import {
  formatFargoPair,
  publishedFargoRating,
  type PlayerCard,
} from '../lib/player-card';
import { isDemoMode, recomputeShadowRating, searchFargoPlayers, type FargoSearchHit } from '../lib/api';
import { useToast } from '../lib/toast-context';

export function PlayerCardPanel({
  rating,
  ratingDisplay,
  band,
  playerCard,
  interactive = false,
  onCard,
}: {
  rating?: number | null;
  ratingDisplay?: string | null;
  band?: string | null;
  playerCard?: PlayerCard | null;
  interactive?: boolean;
  onCard?: (card: PlayerCard, opts?: { refreshFargo?: boolean }) => Promise<void> | void;
}) {
  const { push } = useToast();
  const p = playerCard?.player;
  const stats = p?.rackup_stats;
  const [fargoQ, setFargoQ] = useState(p?.name ?? '');
  const [fargoHits, setFargoHits] = useState<FargoSearchHit[] | null>(null);
  const [busy, setBusy] = useState<'fargo' | 'shadow' | 'search' | null>(null);

  async function onRefreshFargo() {
    if (!onCard) return;
    setBusy('fargo');
    try {
      await onCard(playerCard as PlayerCard, { refreshFargo: true });
      push('Fargo snapshot refreshed (read-only)', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Fargo refresh failed', 'err');
    } finally {
      setBusy(null);
    }
  }

  async function onRecomputeShadow() {
    setBusy('shadow');
    try {
      const res = await recomputeShadowRating();
      await onCard?.(res.card);
      push(res.note || 'RackUpRate shadow recomputed — ROC users.rating was not written', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Shadow recompute failed', 'err');
    } finally {
      setBusy(null);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = fargoQ.trim();
    if (q.length < 2) {
      push('Enter at least 2 characters', 'err');
      return;
    }
    setBusy('search');
    try {
      const res = await searchFargoPlayers(q);
      setFargoHits(res.results);
      if (!res.results.length) push(`No FargoRate players for “${q}”`, 'info');
    } catch (err) {
      push(err instanceof Error ? err.message.slice(0, 120) : 'Fargo search failed', 'err');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="player-card-panel card stack" aria-label="Unified player card">
      <div className="section-title" style={{ margin: 0 }}>
        <h2>Ratings</h2>
        <span className="muted">ROC Glicko-2 · canonical</span>
      </div>
      <PlayerCardChips
        rating={rating}
        ratingDisplay={ratingDisplay}
        band={band}
        playerCard={playerCard}
        compact={false}
        showEmptySlots
      />
      {stats && (
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          RD {Math.round(stats.rd)} · {stats.matches} match
          {stats.matches === 1 ? '' : 'es'} · {stats.ladder}
        </p>
      )}
      <p className="muted" style={{ fontSize: '0.8rem' }}>
        {playerCard?.display.fargo ?? 'FargoRate: — (not invented)'}
        {playerCard?.display.rackup_shadow ? ` · ${playerCard.display.rackup_shadow}` : ''}
      </p>
      {playerCard?.display.disclaimer && (
        <p className="muted" style={{ fontSize: '0.78rem' }}>
          {playerCard.display.disclaimer}
        </p>
      )}
      <div className="player-card-identity">
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          Identity
        </p>
        <ul className="player-card-id-list">
          <li className="row-between">
            <span className="muted">Unified ID</span>
            <span>{p?.unified_id ? `${p.unified_id.slice(0, 8)}…` : '—'}</span>
          </li>
          <li className="row-between">
            <span className="muted">Fargo</span>
            <span>{p?.fargo_readable_id || p?.fargo_id || 'Not linked'}</span>
          </li>
          <li className="row-between">
            <span className="muted">APA</span>
            <span>{p?.apa_member_id || 'Not linked'}</span>
          </li>
        </ul>
      </div>

      {interactive && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy !== null || !onCard}
              onClick={() => void onRefreshFargo()}
            >
              {busy === 'fargo' ? 'Refreshing…' : 'Refresh Fargo'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy !== null}
              onClick={() => void onRecomputeShadow()}
            >
              {busy === 'shadow' ? 'Recomputing…' : 'Recompute RackUpRate'}
            </button>
          </div>
          <form className="stack" style={{ gap: 8 }} onSubmit={onSearch}>
            <label className="muted" style={{ fontSize: '0.8rem' }} htmlFor="fargo-search">
              FargoRate search (read-only)
            </label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                id="fargo-search"
                className="input"
                style={{ flex: 1, minWidth: 160 }}
                value={fargoQ}
                onChange={(e) => setFargoQ(e.target.value)}
                placeholder="Player name"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={busy !== null}>
                {busy === 'search' ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>
          {isDemoMode() && (
            <p className="muted" style={{ fontSize: '0.78rem' }}>
              Demo lookup only — RackUp does not submit Fargo LMS matches.
            </p>
          )}
          {fargoHits && fargoHits.length > 0 && (
            <ul className="player-card-id-list">
              {fargoHits.map((hit, i) => {
                const published = publishedFargoRating(hit);
                return (
                  <li key={`${hit.name}-${i}`} className="row-between">
                    <span>{hit.name}</span>
                    <span className="muted">
                      {formatFargoPair(published, hit.robustness) ?? 'FargoRate: —'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
