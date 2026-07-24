import { useEffect, useState } from 'react';
import { fetchLookingPlayers, goLiveLooking, initials } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import type { LookingPlayer } from '../lib/types';
import { Modal } from '../components/Modal';

const GAMES = ['All', '8-ball', '9-ball', '10-ball', 'One-pocket'];
const STAKES = ['Any', 'Casual', '$$', 'Action'];

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

  useEffect(() => {
    fetchLookingPlayers().then(setPlayers);
  }, []);

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
      await goLiveLooking({
        user_id: user.id,
        lat: 36.1699,
        lon: -115.1398,
        game: liveGame === 'One-pocket' ? 'one-pocket' : liveGame,
        stakes: liveStakes,
        min_rating: Math.max(0, user.rating - 100),
        max_rating: user.rating + 100,
      });
      setLiveOpen(false);
      push("You're live — nearby players can find you", 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Failed to go live', 'err');
    } finally {
      setLiveBusy(false);
    }
  }

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Matchmaking</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Find a set
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Nearby players looking for action — filter by game & stakes.
        </p>
      </header>

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
        Go live · I&apos;m looking
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

      <Modal open={liveOpen} title="Go live" onClose={() => setLiveOpen(false)}>
        <div className="stack">
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            You&apos;ll appear in nearby search for 30 minutes.
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
            {liveBusy ? 'Going live…' : 'Start looking'}
          </button>
        </div>
      </Modal>
    </div>
  );
}