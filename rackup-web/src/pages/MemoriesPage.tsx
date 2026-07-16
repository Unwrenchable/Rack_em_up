import { useEffect, useState } from 'react';
import { fetchMemories, formatRelative } from '../lib/api';
import type { MatchMemory } from '../lib/types';

function typeLabel(t: MatchMemory['matchType']) {
  if (t === 'MONEY') return 'Money';
  if (t === 'TOURNAMENT') return 'Tournament';
  return 'Match';
}

function scoreText(m: MatchMemory): string {
  const s = m.scoreline;
  if (!s) return m.raceTo ? `Race to ${m.raceTo}` : '—';
  if ('score' in s && 'opponentScore' in s) {
    return `${s.score}–${s.opponentScore}`;
  }
  if ('a' in s && 'b' in s) return `${s.a}–${s.b}`;
  return '—';
}

export function MemoriesPage() {
  const [items, setItems] = useState<MatchMemory[] | null>(null);
  const wins = items?.filter((m) => m.isWinner).length ?? 0;

  useEffect(() => {
    fetchMemories().then(setItems);
  }, []);

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Match memories</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Your reel
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Wins, heartbreaks, and highlight clips — one card per set.
        </p>
      </header>

      <div className="grid-2">
        <div className="stat-tile">
          <div className="value">{items?.length ?? '—'}</div>
          <div className="label">Memories</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--live)' }}>
            {items ? wins : '—'}
          </div>
          <div className="label">Wins</div>
        </div>
      </div>

      <div className="stack">
        {items === null &&
          [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 140 }} />)}

        {items?.map((m) => (
          <article key={m.id} className={`card memory-card${m.isWinner ? ' win' : ''}`}>
            <span className={`chip tag-win${m.isWinner ? ' chip-live' : ' chip-quiet'}`}>
              {m.isWinner ? 'WIN' : 'LOSS'}
            </span>
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <span className="chip chip-gold">{typeLabel(m.matchType)}</span>
              <span className="chip">{m.game ?? 'Pool'}</span>
            </div>
            <div className="row-between">
              <div>
                <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: '0.04em' }}>
                  {scoreText(m)}
                </div>
                <div className="muted" style={{ fontSize: '0.82rem' }}>
                  {formatRelative(m.createdAt)}
                  {m.stakes ? ` · $${(Number(m.stakes) / 100).toFixed(0)}` : ''}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm">
                + Highlight
              </button>
            </div>
          </article>
        ))}

        {items?.length === 0 && (
          <div className="empty card">Play a match and finish it — memories show up here.</div>
        )}
      </div>
    </div>
  );
}