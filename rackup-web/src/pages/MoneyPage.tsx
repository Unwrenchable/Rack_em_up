import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  completeMoneyMatch,
  confirmMoneyMatch,
  disputeMoneyMatch,
  fetchMoneyMatches,
  formatMoney,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import type { MoneyMatch } from '../lib/types';
import { Modal } from '../components/Modal';

function statusChip(status: MoneyMatch['status']) {
  if (status === 'ACTIVE') return 'chip chip-live';
  if (status === 'DISPUTED') return 'chip chip-busy';
  if (status === 'COMPLETED') return 'chip chip-gold';
  return 'chip chip-moderate';
}

export function MoneyPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [matches, setMatches] = useState<MoneyMatch[] | null>(null);
  const [reportMatch, setReportMatch] = useState<MoneyMatch | null>(null);
  const [aScore, setAScore] = useState(0);
  const [bScore, setBScore] = useState(0);

  useEffect(() => {
    fetchMoneyMatches().then(setMatches);
  }, []);

  const pot = matches?.reduce((n, m) => n + Number(m.amountCents || 0), 0) ?? 0;

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
          <Link to="/play" className="btn btn-primary btn-sm">
            + New set
          </Link>
        </div>
      </div>

      <div className="banner banner-info">
        Both sides confirm before it goes ACTIVE. Report scores when the set is done.
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
              {m.status === 'PENDING' && user && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      const side =
                        m.playerAId === user.id ? 'A' : m.playerBId === user.id ? 'B' : 'A';
                      const updated = await confirmMoneyMatch({
                        matchId: m.id,
                        confirmingPlayerId: user.id,
                        confirmingSide: side,
                      });
                      setMatches((list) =>
                        (list ?? []).map((x) => (x.id === m.id ? { ...x, ...updated } : x)),
                      );
                      push('Confirm recorded', 'ok');
                    } catch (e) {
                      push(e instanceof Error ? e.message.slice(0, 100) : 'Confirm failed', 'err');
                    }
                  }}
                >
                  Confirm
                </button>
              )}
              {m.status === 'ACTIVE' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setReportMatch(m);
                    setAScore(0);
                    setBScore(0);
                  }}
                >
                  Report result
                </button>
              )}
              {(m.status === 'PENDING' || m.status === 'ACTIVE') && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    try {
                      await disputeMoneyMatch({
                        matchId: m.id,
                        reason: 'Disputed from money board',
                      });
                      setMatches((list) =>
                        (list ?? []).map((x) =>
                          x.id === m.id ? { ...x, status: 'DISPUTED' as const } : x,
                        ),
                      );
                      push('Dispute filed', 'err');
                    } catch (e) {
                      push(e instanceof Error ? e.message.slice(0, 100) : 'Dispute failed', 'err');
                    }
                  }}
                >
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

      <Modal open={!!reportMatch} title="Report result" onClose={() => setReportMatch(null)}>
        <div className="stack">
          <div className="grid-2">
            <div className="field">
              <label>A score</label>
              <input
                className="input"
                type="number"
                min={0}
                value={aScore}
                onChange={(e) => setAScore(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>B score</label>
              <input
                className="input"
                type="number"
                min={0}
                value={bScore}
                onChange={(e) => setBScore(Number(e.target.value))}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!user || !reportMatch || aScore === bScore}
            onClick={async () => {
              if (!user || !reportMatch) return;
              try {
                const updated = await completeMoneyMatch({
                  matchId: reportMatch.id,
                  reportingPlayerId: user.id,
                  aScore,
                  bScore,
                });
                setMatches((list) =>
                  (list ?? []).map((x) => (x.id === reportMatch.id ? { ...x, ...updated } : x)),
                );
                setReportMatch(null);
                push('Result recorded', 'ok');
              } catch (e) {
                push(e instanceof Error ? e.message.slice(0, 120) : 'Complete failed', 'err');
              }
            }}
          >
            Submit scores
          </button>
        </div>
      </Modal>
    </div>
  );
}
