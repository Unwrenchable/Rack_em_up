import { useEffect, useState } from 'react';
import { fetchMoneyMatches, formatMoney } from '../lib/api';
import type { MoneyMatch } from '../lib/types';

function statusChip(status: MoneyMatch['status']) {
  if (status === 'ACTIVE') return 'chip chip-live';
  if (status === 'DISPUTED') return 'chip chip-busy';
  if (status === 'COMPLETED') return 'chip chip-gold';
  return 'chip chip-moderate';
}

export function MoneyPage() {
  const [matches, setMatches] = useState<MoneyMatch[] | null>(null);

  useEffect(() => {
    fetchMoneyMatches().then(setMatches);
  }, []);

  const pot =
    matches?.reduce((n, m) => n + Number(m.amountCents || 0), 0) ?? 0;

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Protected action</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Money board
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Dual confirm. Clear stakes. Dispute when it gets messy.
        </p>
      </header>

      <div className="card card-glow">
        <div className="row-between">
          <div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              Open pot (board)
            </div>
            <div className="money">{formatMoney(pot)}</div>
          </div>
          <button type="button" className="btn btn-primary btn-sm">
            + New set
          </button>
        </div>
      </div>

      <div className="banner banner-info">
        Both sides confirm before it goes ACTIVE. Upload proof if you need a dispute.
      </div>

      <div className="section-title">
        <h2>Your sets</h2>
      </div>

      <div className="stack">
        {matches === null &&
          [1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}

        {matches?.map((m) => (
          <article key={m.id} className="card">
            <div className="row-between">
              <span className={statusChip(m.status)}>{m.status}</span>
              <span className="money" style={{ fontSize: '1.35rem' }}>
                {formatMoney(m.amountCents)}
              </span>
            </div>
            <h3 style={{ marginTop: 12, fontWeight: 600 }}>
              {m.game} · Race to {m.raceTo}
            </h3>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Confirm A {m.aConfirmed ? '✓' : '…'} · B {m.bConfirmed ? '✓' : '…'}
              {m.livestreamUrl ? ' · Stream linked' : ''}
            </p>
            <div className="row" style={{ marginTop: 14 }}>
              {m.status === 'PENDING' && (
                <button type="button" className="btn btn-secondary btn-sm">
                  Confirm
                </button>
              )}
              {m.status === 'ACTIVE' && (
                <button type="button" className="btn btn-primary btn-sm">
                  Report result
                </button>
              )}
              {(m.status === 'PENDING' || m.status === 'ACTIVE') && (
                <button type="button" className="btn btn-danger btn-sm">
                  Dispute
                </button>
              )}
            </div>
          </article>
        ))}

        {matches?.length === 0 && (
          <div className="empty card">No money matches yet. Create one and lock the stakes.</div>
        )}
      </div>
    </div>
  );
}