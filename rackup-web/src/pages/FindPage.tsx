import { useEffect, useState } from 'react';
import {
  fetchLookingPlayers,
  goLiveLooking,
  initials,
  mmV2Cancel,
  mmV2Confirm,
  mmV2Search,
  mmV2Status,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import type { LookingPlayer } from '../lib/types';
import { Modal } from '../components/Modal';

const GAMES = ['All', '8-ball', '9-ball', '10-ball', 'One-pocket'];
const STAKES = ['Any', 'Casual', '$$', 'Action'];

type MmState = {
  requestId?: string;
  sessionId?: string | null;
  status: string;
  radiusMeters?: number;
  expiresAt?: string;
  matchId?: string | null;
};

export function FindPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [players, setPlayers] = useState<LookingPlayer[] | null>(null);
  const [game, setGame] = useState('All');
  const [stakes, setStakes] = useState('Any');
  const [query, setQuery] = useState('');
  const [liveOpen, setLiveOpen] = useState(false);
  const [liveGame, setLiveGame] = useState('9-ball');
  const [liveStakes, setLiveStakes] = useState('casual');
  const [liveBusy, setLiveBusy] = useState(false);
  const [mm, setMm] = useState<MmState | null>(null);
  const [mmBusy, setMmBusy] = useState(false);

  useEffect(() => {
    fetchLookingPlayers().then(setPlayers);
  }, []);

  // Poll MM V2 session when we have a sessionId pending confirm
  useEffect(() => {
    if (!mm?.sessionId || mm.status === 'CONFIRMED' || mm.status === 'CANCELLED') return;
    const t = setInterval(async () => {
      try {
        const s = (await mmV2Status(mm.sessionId!)) as {
          id?: string;
          status?: string;
          matchId?: string | null;
        };
        setMm((prev) =>
          prev
            ? {
                ...prev,
                status: s.status ?? prev.status,
                matchId: s.matchId ?? prev.matchId,
              }
            : prev,
        );
      } catch {
        /* ignore transient */
      }
    }, 4000);
    return () => clearInterval(t);
  }, [mm?.sessionId, mm?.status]);

  const filtered =
    players?.filter((p) => {
      if (game !== 'All' && p.game !== game) return false;
      if (stakes === 'Casual' && !/casual/i.test(p.stakes)) return false;
      if (stakes === '$$' && !/\$|50|100/i.test(p.stakes)) return false;
      if (stakes === 'Action' && !/\$1|race|200/i.test(p.stakes)) return false;
      if (query && !p.displayName.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }) ?? null;

  async function goLive() {
    if (!user) return;
    setLiveBusy(true);
    try {
      const gameSlug = liveGame === 'One-pocket' ? 'one-pocket' : liveGame;

      // Matchmaking V2 queue (primary)
      const enqueued = (await mmV2Search({
        lat: 36.1699,
        lon: -115.1398,
        radius: 20000,
        game: gameSlug,
        stakes: liveStakes,
        min_rating: Math.max(0, user.rating - 100),
        max_rating: user.rating + 100,
      })) as MmState & { requestId?: string; sessionId?: string | null };

      setMm({
        requestId: enqueued.requestId,
        sessionId: enqueued.sessionId ?? null,
        status: enqueued.status ?? 'ENQUEUED',
        radiusMeters: enqueued.radiusMeters,
        expiresAt: enqueued.expiresAt,
      });

      // Keep V1 looking board populated for discovery list
      try {
        await goLiveLooking({
          user_id: user.id,
          lat: 36.1699,
          lon: -115.1398,
          game: gameSlug,
          stakes: liveStakes,
          min_rating: Math.max(0, user.rating - 100),
          max_rating: user.rating + 100,
        });
      } catch {
        /* V1 optional */
      }

      setLiveOpen(false);
      push("You're in the Matchmaking V2 queue — nearby players can find you", 'ok');
      fetchLookingPlayers().then(setPlayers);
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Failed to go live', 'err');
    } finally {
      setLiveBusy(false);
    }
  }

  async function confirmSession() {
    if (!mm?.sessionId) return;
    setMmBusy(true);
    try {
      const res = (await mmV2Confirm({ sessionId: mm.sessionId })) as {
        status?: string;
        matchId?: string | null;
      };
      setMm((prev) =>
        prev
          ? { ...prev, status: res.status ?? prev.status, matchId: res.matchId ?? prev.matchId }
          : prev,
      );
      push(res.status === 'CONFIRMED' ? 'Match confirmed!' : `Status: ${res.status}`, 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Confirm failed', 'err');
    } finally {
      setMmBusy(false);
    }
  }

  async function cancelSession() {
    if (!mm?.sessionId) {
      setMm(null);
      push('Left queue (no session to cancel)', 'info');
      return;
    }
    setMmBusy(true);
    try {
      await mmV2Cancel({ sessionId: mm.sessionId });
      setMm(null);
      push('Matchmaking cancelled', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Cancel failed', 'err');
    } finally {
      setMmBusy(false);
    }
  }

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Matchmaking V2</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Find a set
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Redis queue + radius pairing. Nearby players looking for action.
        </p>
      </header>

      {mm && (
        <div className="card card-glow">
          <div className="row-between">
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                Queue status
              </div>
              <div style={{ fontWeight: 600 }}>{mm.status}</div>
              <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                {mm.requestId ? `Request ${mm.requestId.slice(0, 8)}…` : ''}
                {mm.sessionId ? ` · Session ${mm.sessionId.slice(0, 8)}…` : ''}
                {mm.radiusMeters ? ` · ${Math.round(mm.radiusMeters / 1000)} km` : ''}
                {mm.matchId ? ` · Match ready` : ''}
              </p>
            </div>
            <span className="chip chip-live">
              <span className="dot-live" /> V2
            </span>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            {mm.sessionId && mm.status === 'PENDING_CONFIRMATION' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={mmBusy}
                onClick={confirmSession}
              >
                Confirm match
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={mmBusy}
              onClick={cancelSession}
            >
              Leave queue
            </button>
          </div>
        </div>
      )}

      <input
        className="input"
        placeholder="Search players…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search players"
      />

      <div style={{ overflowX: 'auto', margin: '0 -4px' }}>
        <div className="row" style={{ padding: '0 4px', minWidth: 'max-content' }}>
          {GAMES.map((g) => (
            <button
              key={g}
              type="button"
              className={`chip${game === g ? ' chip-gold' : ''}`}
              onClick={() => setGame(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        {STAKES.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${stakes === s ? ' chip-live' : ''}`}
            onClick={() => setStakes(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={() => setLiveOpen(true)}>
        Go live · Matchmaking V2
      </button>

      <div className="section-title">
        <h2>Available now</h2>
        <span className="muted">{filtered?.length ?? 0}</span>
      </div>

      <div className="stack">
        {filtered === null &&
          [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 88 }} />)}

        {filtered?.map((p) => (
          <article key={p.id} className="card">
            <div className="row">
              <div className="avatar">{initials(p.displayName)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-between">
                  <h3 style={{ fontWeight: 600 }}>{p.displayName}</h3>
                  <span className="rating-ring">★ {p.rating}</span>
                </div>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>
                  {p.game} · {p.stakes} · {p.distanceKm} km
                </p>
              </div>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <span className="chip">Rep {p.reputation}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => push(`Challenge sent to ${p.displayName}`, 'ok')}
              >
                Challenge
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => push('Chat coming soon', 'info')}
              >
                Message
              </button>
            </div>
          </article>
        ))}

        {filtered?.length === 0 && (
          <div className="empty card">No players match those filters. Widen the search.</div>
        )}
      </div>

      <Modal open={liveOpen} title="Go live (Matchmaking V2)" onClose={() => setLiveOpen(false)}>
        <div className="stack">
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            Enqueues you on Redis Matchmaking V2 with radius pairing. You also appear on the looking
            board.
          </p>
          <div className="field">
            <label>Game</label>
            <select className="input" value={liveGame} onChange={(e) => setLiveGame(e.target.value)}>
              {['8-ball', '9-ball', '10-ball', 'One-pocket'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Stakes</label>
            <select className="input" value={liveStakes} onChange={(e) => setLiveStakes(e.target.value)}>
              <option value="casual">Casual</option>
              <option value="small">Small</option>
              <option value="big_money">Big money</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary btn-block" disabled={liveBusy} onClick={goLive}>
            {liveBusy ? 'Enqueueing…' : 'Start looking (V2)'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
