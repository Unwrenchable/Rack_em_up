import { useState } from 'react';
import {
  scorekeepingAppendEvent,
  scorekeepingGetTimeline,
  scorekeepingStartTimeline,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';

type Timeline = {
  matchId: string;
  events: Array<{
    id: string;
    type: string;
    at: string;
    note?: string | null;
    aScore?: number | null;
    bScore?: number | null;
    data?: Record<string, unknown> | null;
  }>;
  sotdCandidates?: string[];
};

export function ScorekeepingPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [matchId, setMatchId] = useState('');
  const [game, setGame] = useState('9-ball');
  const [raceTo, setRaceTo] = useState(5);
  const [aScore, setAScore] = useState(0);
  const [bScore, setBScore] = useState(0);
  const [rack, setRack] = useState(1);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(id: string) {
    try {
      const t = (await scorekeepingGetTimeline(id)) as Timeline;
      setTimeline(t);
    } catch {
      setTimeline(null);
    }
  }

  async function start() {
    if (!matchId.trim()) {
      push('Enter a match UUID', 'err');
      return;
    }
    setBusy(true);
    try {
      await scorekeepingStartTimeline({
        matchId: matchId.trim(),
        domain: 'standard',
        gameType: game,
        playerAId: user?.id,
        playerBId: user?.id,
      });
      push('Timeline started', 'ok');
      await refresh(matchId.trim());
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Start failed', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function append(type: string, extra?: Record<string, unknown>) {
    if (!matchId.trim()) return;
    setBusy(true);
    try {
      await scorekeepingAppendEvent({
        matchId: matchId.trim(),
        type,
        domain: 'standard',
        rack,
        aScore,
        bScore,
        playerId: user?.id,
        data: { raceTo, game, ...extra },
        note: type,
      });
      await refresh(matchId.trim());
      push(`${type} logged`, 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Event failed', 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Scorekeeping V2</p>
        <h1 className="h1" style={{ fontSize: '2.25rem' }}>
          Live scorekeeping
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Shot / rack / foul timeline → processReport + RealAI summary on match complete.
        </p>
      </header>

      <div className="card stack">
        <div className="field">
          <label>Match UUID</label>
          <input
            className="input"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            placeholder="paste standard/money/tournament match id"
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Game</label>
            <select className="input" value={game} onChange={(e) => setGame(e.target.value)}>
              {['8-ball', '9-ball', '10-ball', 'one-pocket'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
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
        </div>
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
        <div className="field">
          <label>Rack #</label>
          <input
            className="input"
            type="number"
            min={1}
            value={rack}
            onChange={(e) => setRack(Number(e.target.value))}
          />
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={start}>
            Start timeline
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => append('break')}
          >
            Break
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => append('rack_won')}
          >
            Rack won
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => append('foul', { code: 'scratch' })}
          >
            Foul (scratch)
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => append('shot', { bank: true, difficulty: 'hard' })}
          >
            Hard bank (SOTD)
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => append('score_tick')}
          >
            Score tick
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => matchId && refresh(matchId.trim())}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Timeline ({timeline?.events?.length ?? 0} events)</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          SOTD candidates: {timeline?.sotdCandidates?.length ?? 0}
        </p>
        <div className="stack" style={{ marginTop: 12, maxHeight: 360, overflow: 'auto' }}>
          {(timeline?.events ?? []).slice().reverse().map((e) => (
            <div
              key={e.id}
              style={{
                padding: 10,
                borderBottom: '1px solid #333',
                fontSize: '0.85rem',
              }}
            >
              <strong>{e.type}</strong>
              {e.aScore != null && (
                <span className="muted">
                  {' '}
                  · {e.aScore}–{e.bScore}
                </span>
              )}
              <div className="muted">{new Date(e.at).toLocaleTimeString()}</div>
              {e.data && (
                <pre style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>
                  {JSON.stringify(e.data)}
                </pre>
              )}
            </div>
          ))}
          {!timeline?.events?.length && (
            <p className="muted">No events yet — start a timeline and log shots.</p>
          )}
        </div>
      </div>
    </div>
  );
}
