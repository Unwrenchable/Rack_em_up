import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  tournamentV2Create,
  tournamentV2List,
  tournamentV2Register,
  tournamentV2Start,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { Modal } from '../components/Modal';

type Row = {
  id: string;
  name: string;
  game: string;
  mode: string;
  status: string;
};

const MODES = [
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'ROUND_ROBIN',
  'SWISS',
] as const;

export function TournamentsListPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [tournaments, setTournaments] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('Friday Night Open');
  const [game, setGame] = useState('9-ball');
  const [mode, setMode] = useState<(typeof MODES)[number]>('SINGLE_ELIMINATION');
  const [seed, setSeed] = useState<'manual' | 'random' | 'elo'>('elo');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await tournamentV2List();
      setTournaments(list as Row[]);
    } catch (e) {
      console.error(e);
      setError('Failed to load tournaments V2');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    try {
      const t = await tournamentV2Create({
        name,
        game,
        mode,
        seed_strategy: seed,
      });
      push(`Created ${t.name}`, 'ok');
      setCreateOpen(false);
      await load();
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 100) : 'Create failed', 'err');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page">Loading tournaments V2…</div>;
  if (error) return <div className="page">{error}</div>;

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header className="row-between">
        <div>
          <p className="eyebrow">Tournaments V2</p>
          <h1 className="h1" style={{ fontSize: '2.25rem' }}>
            Events
          </h1>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
          + Create
        </button>
      </header>

      <div className="stack">
        {tournaments.map((t) => (
          <article key={t.id} className="card">
            <div className="row-between">
              <div>
                <Link to={`/tournaments/${t.id}`} style={{ fontWeight: 600, color: 'inherit' }}>
                  {t.name}
                </Link>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {t.game} · {t.mode} · {t.status}
                </p>
              </div>
              <span className={`chip ${t.status === 'ACTIVE' ? 'chip-live' : ''}`}>{t.status}</span>
            </div>
            <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              <Link to={`/tournaments/${t.id}`} className="btn btn-secondary btn-sm">
                Open
              </Link>
              <Link to={`/tournaments/${t.id}/tv`} className="btn btn-ghost btn-sm" target="_blank">
                TV mode
              </Link>
              {t.status === 'DRAFT' && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      try {
                        await tournamentV2Register(t.id);
                        push('Registered', 'ok');
                      } catch (e) {
                        push(e instanceof Error ? e.message.slice(0, 80) : 'Register failed', 'err');
                      }
                    }}
                  >
                    Register
                  </button>
                  {user && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        try {
                          await tournamentV2Start({ tournamentId: t.id, seed_strategy: seed });
                          push('Tournament started — bracket generated', 'ok');
                          await load();
                        } catch (e) {
                          push(e instanceof Error ? e.message.slice(0, 100) : 'Start failed', 'err');
                        }
                      }}
                    >
                      Start
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
        ))}

        {tournaments.length === 0 && (
          <div className="empty card">No V2 tournaments yet. Create one to run a bracket.</div>
        )}
      </div>

      <Modal open={createOpen} title="Create tournament V2" onClose={() => setCreateOpen(false)}>
        <div className="stack">
          <div className="field">
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Game</label>
            <select className="input" value={game} onChange={(e) => setGame(e.target.value)}>
              {['8-ball', '9-ball', '10-ball', 'One-pocket'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Format</label>
            <select
              className="input"
              value={mode}
              onChange={(e) => setMode(e.target.value as (typeof MODES)[number])}
            >
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Seed strategy</label>
            <select
              className="input"
              value={seed}
              onChange={(e) => setSeed(e.target.value as 'manual' | 'random' | 'elo')}
            >
              <option value="manual">Manual (register order)</option>
              <option value="random">Random</option>
              <option value="elo">Elo (high first)</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={create}>
            {busy ? 'Creating…' : 'Create draft'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
