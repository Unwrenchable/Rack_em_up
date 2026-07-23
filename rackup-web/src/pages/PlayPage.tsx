import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  confirmMoneyMatch,
  createMoneyMatch,
  disputeMoneyMatch,
  fetchLeagues,
  fetchMoneyMatches,
  fetchTournaments,
  formatMoney,
  formatRelative,
  registerForTournament,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import type { League, MoneyMatch, Tournament } from '../lib/types';
import { Modal } from '../components/Modal';

type Tab = 'money' | 'tournaments' | 'leagues';

function statusChip(status: string) {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'chip chip-live';
  if (s === 'DISPUTED') return 'chip chip-busy';
  if (s === 'COMPLETED') return 'chip chip-gold';
  if (s === 'DRAFT') return 'chip chip-quiet';
  return 'chip chip-moderate';
}

export function PlayPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('money');
  const [money, setMoney] = useState<MoneyMatch[] | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [game, setGame] = useState('9-ball');
  const [raceTo, setRaceTo] = useState(7);
  const [dollars, setDollars] = useState(100);
  const [opponentId, setOpponentId] = useState('p1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMoneyMatches().then(setMoney);
    fetchTournaments().then(setTournaments);
    fetchLeagues().then(setLeagues);
  }, []);

  const pot = money?.reduce((n, m) => n + Number(m.amountCents || 0), 0) ?? 0;

  async function submitMoney() {
    if (!user) return;
    setSaving(true);
    try {
      const created = await createMoneyMatch({
        playerAId: user.id,
        playerBId: opponentId,
        hallId: 'h1',
        game,
        raceTo,
        amountCents: dollars * 100,
      });
      setMoney((m) => [created, ...(m ?? [])]);
      setCreateOpen(false);
      push('Money set created — waiting on confirm', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Failed', 'err');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Compete</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Play
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Money, brackets, and leagues — one home for action.
        </p>
      </header>

      <div className="tabs">
        {(
          [
            ['money', 'Money'],
            ['tournaments', 'Tours'],
            ['leagues', 'Leagues'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'money' && (
        <div className="stack">
          <div className="card card-glow">
            <div className="row-between">
              <div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  Open pot
                </div>
                <div className="money">{formatMoney(pot)}</div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
                + New set
              </button>
            </div>
          </div>
          <div className="banner banner-info">
            Dual confirm before ACTIVE. Dispute with proof when needed.
          </div>
          {money === null && [1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}
          {money?.map((m) => (
            <article key={m.id} className="card">
              <div className="row-between">
                <span className={statusChip(m.status)}>{m.status}</span>
                <span className="money" style={{ fontSize: '1.3rem' }}>
                  {formatMoney(m.amountCents)}
                </span>
              </div>
              <h3 style={{ marginTop: 10, fontWeight: 600 }}>
                {m.game} · Race to {m.raceTo}
              </h3>
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                A {m.aConfirmed ? '✓' : '…'} · B {m.bConfirmed ? '✓' : '…'} · {formatRelative(m.createdAt)}
              </p>
              <div className="row" style={{ marginTop: 12 }}>
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
                        setMoney((list) =>
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
                    onClick={() => push('Use POST /money-matches/:id/complete with scores', 'info')}
                  >
                    Report
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
                          reason: 'Disputed from app',
                          details: 'Opened from Play board',
                        });
                        setMoney((list) =>
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
        </div>
      )}

      {tab === 'tournaments' && (
        <div className="stack">
          {tournaments?.map((t) => (
            <article key={t.id} className="card">
              <div className="row-between">
                <span className={statusChip(t.status)}>{t.status}</span>
                <span className="chip">{t.format.replace('_', ' ')}</span>
              </div>
              <h3 style={{ marginTop: 10, fontWeight: 600 }}>{t.name}</h3>
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                {t.game} · {new Date(t.startsAt).toLocaleString()}
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  if (!user) { push('Sign in to register', 'err'); return; }
                  try {
                    await registerForTournament(t.id, user.id);
                    push(`Registered for ${t.name}`, 'ok');
                  } catch (e) {
                    push(e instanceof Error ? e.message.slice(0, 120) : 'Registration failed', 'err');
                  }
                }}
              >
                Register
              </button>
            </article>
          ))}
          {!tournaments?.length && tournaments !== null && (
            <div className="empty card">No tournaments listed yet.</div>
          )}
        </div>
      )}

      {tab === 'leagues' && (
        <div className="stack">
          {leagues?.map((l) => (
            <article key={l.id} className="card">
              <div className="row-between">
                <span className={statusChip(l.status)}>{l.status}</span>
                <span className="chip chip-gold">{l.season}</span>
              </div>
              <h3 style={{ marginTop: 10, fontWeight: 600 }}>{l.name}</h3>
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                {l.game} · weekly matches & standings
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => push('Standings coming soon', 'info')}
              >
                View standings
              </button>
            </article>
          ))}
        </div>
      )}

      <Link to="/memories" className="card row-between" style={{ textDecoration: 'none' }}>
        <div>
          <div style={{ fontWeight: 600 }}>Match memories</div>
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            Wins, losses, highlight clips
          </div>
        </div>
        <span className="chip chip-gold">Clips →</span>
      </Link>

      <Modal open={createOpen} title="New money set" onClose={() => setCreateOpen(false)}>
        <div className="stack">
          <div className="field">
            <label>Game</label>
            <select className="input" value={game} onChange={(e) => setGame(e.target.value)}>
              {['8-ball', '9-ball', '10-ball', 'One-pocket'].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Race to</label>
              <input
                className="input"
                type="number"
                min={1}
                value={raceTo}
                onChange={(e) => setRaceTo(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Stakes ($)</label>
              <input
                className="input"
                type="number"
                min={1}
                value={dollars}
                onChange={(e) => setDollars(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="field">
            <label>Opponent</label>
            <select className="input" value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
              <option value="p1">VegasVee</option>
              <option value="p2">BankShot_B</option>
              <option value="p4">RailRunner</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary btn-block" disabled={saving} onClick={submitMoney}>
            {saving ? 'Creating…' : 'Create set'}
          </button>
        </div>
      </Modal>
    </div>
  );
}