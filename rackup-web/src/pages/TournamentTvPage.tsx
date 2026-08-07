import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getSocketUrl, tournamentV2Tv } from '../lib/api';

type TvMatch = {
  id: string;
  round: number;
  matchIndex: number;
  playerAId: string | null;
  playerBId: string | null;
  aScore: number | null;
  bScore: number | null;
  status: string;
  bracket?: string;
};

type TvPayload = {
  type: string;
  generatedAt?: string;
  tournament: {
    id: string;
    name: string;
    game: string;
    mode: string;
    status: string;
    entrantCount?: number;
  };
  matches: TvMatch[];
  standings: Array<{ playerId: string; wins: number }>;
  activeMatches: TvMatch[];
  completedCount: number;
};

export function TournamentTvPage() {
  const { id } = useParams();
  const [data, setData] = useState<TvPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const res = (await tournamentV2Tv(id!)) as TvPayload;
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'TV load failed');
      }
    }

    void load();
    const poll = setInterval(() => void load(), 15000);

    // Prefer live /tv namespace
    const socket = io(`${getSocketUrl()}/tv`, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });
    socket.emit('join_tv', { tournamentId: id });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('tournament_tv', (payload: TvPayload) => {
      setData(payload);
      setError(null);
    });

    return () => {
      cancelled = true;
      clearInterval(poll);
      socket.emit('leave_tv', { tournamentId: id });
      socket.disconnect();
    };
  }, [id]);

  if (error && !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f5f5', padding: 40 }}>
        <h1>TV Mode</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#888', padding: 40 }}>
        Loading TV board…
      </div>
    );
  }

  const t = data.tournament;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0a0a0a 0%, #1a1208 50%, #0d0d0d 100%)',
        color: '#f5f5f5',
        padding: '32px 40px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#c9a227', letterSpacing: 3, fontSize: 12, textTransform: 'uppercase' }}>
            RackUp TV · {live ? 'LIVE' : 'POLL'}
          </div>
          <h1 style={{ fontSize: '3rem', margin: '8px 0 0', fontWeight: 700 }}>{t.name}</h1>
          <p style={{ color: '#aaa', marginTop: 8 }}>
            {t.game} · {t.mode} · {t.status}
            {typeof t.entrantCount === 'number' ? ` · ${t.entrantCount} players` : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#c9a227' }}>{data.completedCount}</div>
          <div style={{ color: '#888' }}>matches done</div>
        </div>
      </header>

      <section style={{ marginTop: 36 }}>
        <h2 style={{ color: '#c9a227', fontSize: 14, letterSpacing: 2 }}>ACTIVE TABLES</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
          {(data.activeMatches?.length ? data.activeMatches : data.matches.filter((m) => m.status === 'ACTIVE'))
            .slice(0, 8)
            .map((m) => (
              <div
                key={m.id}
                style={{
                  minWidth: 220,
                  padding: 20,
                  borderRadius: 12,
                  border: '1px solid #333',
                  background: 'rgba(0,0,0,0.45)',
                }}
              >
                <div style={{ color: '#888', fontSize: 12 }}>
                  R{m.round} · M{m.matchIndex} {m.bracket ? `· ${m.bracket}` : ''}
                </div>
                <div style={{ marginTop: 10, fontSize: 18 }}>
                  {(m.playerAId ?? 'TBD').slice(0, 8)}
                  <span style={{ color: '#c9a227', margin: '0 8px' }}>
                    {m.aScore ?? 0}–{m.bScore ?? 0}
                  </span>
                  {(m.playerBId ?? 'TBD').slice(0, 8)}
                </div>
              </div>
            ))}
          {!data.activeMatches?.length && !data.matches.some((m) => m.status === 'ACTIVE') && (
            <p style={{ color: '#666' }}>No active matches</p>
          )}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, marginTop: 40 }}>
        <section>
          <h2 style={{ color: '#c9a227', fontSize: 14, letterSpacing: 2 }}>BRACKET</h2>
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {data.matches.map((m) => (
              <div
                key={m.id}
                style={{
                  width: 160,
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${m.status === 'COMPLETED' ? '#3a3a2a' : '#333'}`,
                  background: m.status === 'COMPLETED' ? 'rgba(201,162,39,0.08)' : 'rgba(0,0,0,0.35)',
                  fontSize: 13,
                }}
              >
                <div style={{ color: '#666' }}>
                  R{m.round}M{m.matchIndex}
                </div>
                <div>{(m.playerAId ?? '—').slice(0, 8)}</div>
                <div>{(m.playerBId ?? '—').slice(0, 8)}</div>
                <div style={{ color: '#c9a227', marginTop: 4 }}>
                  {m.aScore ?? '–'} : {m.bScore ?? '–'}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ color: '#c9a227', fontSize: 14, letterSpacing: 2 }}>STANDINGS</h2>
          <ol style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.9 }}>
            {(data.standings ?? []).slice(0, 12).map((s, i) => (
              <li key={s.playerId}>
                <span style={{ color: i < 3 ? '#c9a227' : '#ccc' }}>
                  {(s.playerId ?? '').slice(0, 8)}
                </span>
                <span style={{ float: 'right', color: '#888' }}>{s.wins}W</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer style={{ marginTop: 48, color: '#444', fontSize: 12 }}>
        Updated {data.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : '—'} ·
        Socket namespace /tv · REST GET /api/v1/tournaments/v2/tv/:id
      </footer>
    </div>
  );
}
