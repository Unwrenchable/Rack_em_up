import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  getSocketUrl,
  getToken,
  tournamentV2AdminReseed,
  tournamentV2AdminSwap,
  tournamentV2AdminUpdateScore,
  tournamentV2AdvanceSwiss,
  tournamentV2Bracket,
  tournamentV2Register,
  tournamentV2ReportMatch,
  tournamentV2Start,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';
import { Bracket } from '../components/Bracket';

type TournamentRow = {
  id: string;
  name: string;
  organizerId: string;
  game?: string;
  status?: string;
  entrants?: string[];
  configJson?: { entrants?: string[] };
};

type TournamentMatchRow = {
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

type BracketPayload = {
  tournament: TournamentRow;
  matches: TournamentMatchRow[];
  rounds?: unknown[];
  resolvedFrom?: string;
};

export function TournamentsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { push } = useToast();
  const [data, setData] = useState<BracketPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveScore, setLiveScore] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await tournamentV2Bracket(id)) as BracketPayload;
      setData(res);
    } catch (err) {
      console.error(err);
      setError('Failed to load tournament V2 bracket. Link id-bridge if this is a V1 id.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live score_update from ScorekeepingServiceV2
  useEffect(() => {
    if (!id) return;
    const token = getToken();
    const socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      auth: token && token !== 'demo' ? { token } : undefined,
    });

    socket.on('score_update', (payload: {
      domain?: string;
      entityId?: string;
      matchId?: string;
      aScore?: number;
      bScore?: number;
    }) => {
      if (payload.entityId === id || payload.domain === 'tournament_v2') {
        setLiveScore(
          `Live: match ${payload.matchId?.slice(0, 8) ?? '?'} ${payload.aScore ?? 0}-${payload.bScore ?? 0}`,
        );
        void load();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id, load]);

  if (loading) return <div className="page">Loading tournament V2…</div>;
  if (error) return <div className="page">{error}</div>;
  if (!data) return <div className="page">No tournament found.</div>;

  const tournament = data.tournament as TournamentRow & {
    mode?: string;
    organizerId?: string;
  };
  const matches = data.matches ?? [];
  const entrants = tournament.entrants ?? tournament.configJson?.entrants ?? [];
  const isOrganizer = !!(user && tournament.organizerId === user.id);
  const isSwiss = tournament.mode === 'SWISS';

  return (
    <div className="page stack" style={{ gap: 16, padding: 20 }}>
      <header>
        <p className="eyebrow">Tournaments V2</p>
        <h1 className="h1" style={{ fontSize: '2rem' }}>
          {tournament.name}
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {tournament.game ?? 'Pool'} · {tournament.mode ?? ''} · {tournament.status ?? '—'}
          {data.resolvedFrom ? ` · bridged from ${data.resolvedFrom.slice(0, 8)}…` : ''}
        </p>
        {liveScore && (
          <p className="chip chip-live" style={{ marginTop: 8, display: 'inline-block' }}>
            {liveScore}
          </p>
        )}
      </header>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => {
            if (!id) return;
            try {
              await tournamentV2Register(id);
              push('Registered!', 'ok');
              void load();
            } catch {
              push('Registration failed', 'err');
            }
          }}
        >
          Register
        </button>
        {isOrganizer && tournament.status === 'DRAFT' && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              if (!id) return;
              try {
                await tournamentV2Start({ tournamentId: id, seed_strategy: 'elo' });
                push('Started with Elo seeding', 'ok');
                void load();
              } catch (e) {
                push(e instanceof Error ? e.message.slice(0, 100) : 'Start failed', 'err');
              }
            }}
          >
            Start (Elo seed)
          </button>
        )}
        <a className="btn btn-ghost btn-sm" href={`/tournaments/${id}/tv`} target="_blank" rel="noreferrer">
          TV mode
        </a>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {isOrganizer && (
        <div className="card">
          <h3 style={{ fontSize: '0.95rem' }}>Admin tools</h3>
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!id) return;
                try {
                  await tournamentV2AdminReseed({
                    tournamentId: id,
                    seedStrategy: 'random',
                    force: tournament.status === 'ACTIVE',
                  });
                  push('Reseeded (random)', 'ok');
                  void load();
                } catch (e) {
                  push(e instanceof Error ? e.message.slice(0, 100) : 'Reseed failed', 'err');
                }
              }}
            >
              Reseed random
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                if (!id) return;
                try {
                  await tournamentV2AdminReseed({
                    tournamentId: id,
                    seedStrategy: 'elo',
                    force: tournament.status === 'ACTIVE',
                  });
                  push('Reseeded (Elo)', 'ok');
                  void load();
                } catch (e) {
                  push(e instanceof Error ? e.message.slice(0, 100) : 'Reseed failed', 'err');
                }
              }}
            >
              Reseed Elo
            </button>
            {isSwiss && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  if (!id) return;
                  try {
                    await tournamentV2AdvanceSwiss(id);
                    push('Swiss next round generated', 'ok');
                    void load();
                  } catch (e) {
                    push(e instanceof Error ? e.message.slice(0, 100) : 'Swiss advance failed', 'err');
                  }
                }}
              >
                Advance Swiss round
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <h2>Entrants ({entrants.length})</h2>
        {entrants.length === 0 && <p className="muted">No entrants yet.</p>}
        {entrants.map((e) => (
          <div key={e} className="muted" style={{ fontSize: '0.85rem' }}>
            {e}
          </div>
        ))}
      </div>

      <Bracket matches={matches} />

      <div style={{ marginTop: 24 }}>
        <h2>Report matches (V2)</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
          Reports go through ScorekeepingServiceV2 (Elo + RealAI + live score_update).
        </p>

        {matches.map((match) => (
          <div key={match.id} className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: '1rem' }}>
              R{match.round} M{match.matchIndex}
              {match.bracket ? ` · ${match.bracket}` : ''} · {match.status}
            </h3>
            <div className="muted" style={{ fontSize: '0.85rem', marginTop: 6 }}>
              <strong>A:</strong> {match.playerAId ?? 'TBD'}
              <br />
              <strong>B:</strong> {match.playerBId ?? 'TBD'}
              {match.status === 'COMPLETED' && (
                <>
                  <br />
                  Score: {match.aScore ?? 0}–{match.bScore ?? 0}
                </>
              )}
            </div>

            {match.status !== 'COMPLETED' && match.playerAId && match.playerBId && id && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const aScore = Number(
                    (form.elements.namedItem('aScore') as HTMLInputElement).value,
                  );
                  const bScore = Number(
                    (form.elements.namedItem('bScore') as HTMLInputElement).value,
                  );
                  try {
                    await tournamentV2ReportMatch({
                      tournamentId: id,
                      matchId: match.id,
                      aScore,
                      bScore,
                    });
                    push('Match reported (V2)', 'ok');
                    void load();
                  } catch {
                    push('Failed to report match', 'err');
                  }
                }}
                className="row"
                style={{ marginTop: 10, flexWrap: 'wrap', gap: 8 }}
              >
                <input
                  name="aScore"
                  type="number"
                  min={0}
                  placeholder="A"
                  className="input"
                  style={{ width: 72 }}
                  required
                />
                <input
                  name="bScore"
                  type="number"
                  min={0}
                  placeholder="B"
                  className="input"
                  style={{ width: 72 }}
                  required
                />
                <button type="submit" className="btn btn-secondary btn-sm">
                  Submit (V2)
                </button>
                {isOrganizer && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        if (!id) return;
                        try {
                          await tournamentV2AdminSwap({ tournamentId: id, matchId: match.id });
                          push('Players swapped', 'ok');
                          void load();
                        } catch {
                          push('Swap failed', 'err');
                        }
                      }}
                    >
                      Swap A/B
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        if (!id) return;
                        const a = window.prompt('Admin A score', '7');
                        const b = window.prompt('Admin B score', '3');
                        if (a == null || b == null) return;
                        try {
                          await tournamentV2AdminUpdateScore({
                            tournamentId: id,
                            matchId: match.id,
                            aScore: Number(a),
                            bScore: Number(b),
                          });
                          push('Admin score set', 'ok');
                          void load();
                        } catch {
                          push('Admin score failed', 'err');
                        }
                      }}
                    >
                      Admin score
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        ))}

        {matches.length === 0 && (
          <p className="muted">No matches yet — start the tournament (V2) to generate a bracket.</p>
        )}
      </div>
    </div>
  );
}
