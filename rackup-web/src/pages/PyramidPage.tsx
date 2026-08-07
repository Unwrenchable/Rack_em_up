import { useEffect, useState } from 'react';
import {
  createPyramidMatch,
  fetchMatchScoreboard,
  fetchPyramidPresets,
  pyramidPocketBalls,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';

type Preset = {
  tableSizeFt: number;
  skillLevel: string;
  rackBalls: number;
  pointsToWin: number;
  callShot: string;
  ratingWeight: number;
  label: string;
};

type Scoreboard = {
  matchId?: string;
  status?: string;
  aPoints?: number;
  bPoints?: number;
  pointsToWin?: number;
  ballsRemaining?: number[];
  ballsRemainingCount?: number;
  remainingPointsOnTable?: number;
  tableSizeFt?: number;
  skillLevel?: string;
  rackBalls?: number;
  callShot?: string;
  ratingWeight?: number;
  isComplete?: boolean;
  winnerSide?: string | null;
  aProgress?: number;
  bProgress?: number;
};

export function PyramidPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [tableSizeFt, setTableSizeFt] = useState<7 | 9>(7);
  const [skillLevel, setSkillLevel] = useState('INTERMEDIATE');
  const [opponentId, setOpponentId] = useState('');
  const [matchId, setMatchId] = useState('');
  const [board, setBoard] = useState<Scoreboard | null>(null);
  const [selectedBall, setSelectedBall] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchPyramidPresets()
      .then((r) => setPresets(r.presets ?? []))
      .catch(() => setPresets([]));
  }, []);

  const preset =
    presets.find((p) => p.tableSizeFt === tableSizeFt && p.skillLevel === skillLevel) ??
    null;

  async function refreshBoard(id: string) {
    try {
      const b = (await fetchMatchScoreboard(id)) as Scoreboard;
      setBoard(b);
    } catch {
      /* ignore */
    }
  }

  async function create() {
    if (!user) return;
    if (!opponentId.trim()) {
      push('Enter opponent user UUID', 'err');
      return;
    }
    setBusy(true);
    try {
      const m = (await createPyramidMatch({
        playerAId: user.id,
        playerBId: opponentId.trim(),
        tableSizeFt,
        skillLevel,
      })) as { id: string };
      setMatchId(m.id);
      push('Pyramid match created', 'ok');
      await refreshBoard(m.id);
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Create failed', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function pocket(ball: number) {
    if (!user || !matchId) return;
    setBusy(true);
    try {
      await pyramidPocketBalls({
        matchId,
        playerId: user.id,
        balls: [ball],
      });
      setSelectedBall(null);
      await refreshBoard(matchId);
      push(`Pocketed ${ball === 1 ? '1 (11 pts)' : ball}`, 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Pocket failed', 'err');
    } finally {
      setBusy(false);
    }
  }

  const remaining = board?.ballsRemaining ?? [];

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Game style</p>
        <h1 className="h1" style={{ fontSize: '2.25rem' }}>
          RackUp Pyramid
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Classical numbered scoring · 1-ball = 11 · table size sets rack · skill sets points
        </p>
      </header>

      <div className="card stack">
        <div className="grid-2">
          <div className="field">
            <label>Table size</label>
            <select
              className="input"
              value={tableSizeFt}
              onChange={(e) => setTableSizeFt(Number(e.target.value) as 7 | 9)}
            >
              <option value={7}>7 ft → 10-ball rack</option>
              <option value={9}>9 ft → 15-ball rack</option>
            </select>
          </div>
          <div className="field">
            <label>Skill level</label>
            <select
              className="input"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
            >
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        {preset && (
          <div className="banner banner-info">
            <strong>{preset.pointsToWin} pts to win</strong> · {preset.rackBalls}-ball · call shot:{' '}
            {preset.callShot} · rating weight {preset.ratingWeight}×
          </div>
        )}
        <div className="field">
          <label>Opponent user ID</label>
          <input
            className="input"
            value={opponentId}
            onChange={(e) => setOpponentId(e.target.value)}
            placeholder="uuid"
          />
        </div>
        <button type="button" className="btn btn-primary" disabled={busy || !user} onClick={create}>
          Create Pyramid match
        </button>
        {matchId && (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Match: <code>{matchId}</code>
          </p>
        )}
      </div>

      {board && (
        <div className="card card-glow stack">
          <div className="row-between">
            <h2>Live scoreboard</h2>
            <span className={`chip ${board.isComplete ? 'chip-gold' : 'chip-live'}`}>
              {board.isComplete ? 'COMPLETE' : board.status ?? 'LIVE'}
            </span>
          </div>
          <div className="grid-2" style={{ gap: 16 }}>
            <div>
              <div className="muted">Player A</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#c9a227' }}>
                {board.aPoints ?? 0}
              </div>
              <div
                style={{
                  height: 8,
                  background: '#333',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.round((board.aProgress ?? 0) * 100)}%`,
                    height: '100%',
                    background: '#c9a227',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="muted">Player B</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{board.bPoints ?? 0}</div>
              <div
                style={{
                  height: 8,
                  background: '#333',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.round((board.bProgress ?? 0) * 100)}%`,
                    height: '100%',
                    background: '#6af',
                  }}
                />
              </div>
            </div>
          </div>
          <p className="muted">
            Race to <strong>{board.pointsToWin}</strong> · Balls remaining:{' '}
            <strong>{board.ballsRemainingCount ?? remaining.length}</strong> (
            {board.remainingPointsOnTable ?? '—'} pts left on table)
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {remaining.map((b) => (
              <button
                key={b}
                type="button"
                className={`chip ${selectedBall === b ? 'chip-gold' : ''}`}
                disabled={busy || board.isComplete}
                onClick={() => pocket(b)}
                title={b === 1 ? '1-ball = 11 points' : `${b} points`}
              >
                {b === 1 ? '1★11' : b}
              </button>
            ))}
            {!remaining.length && !board.isComplete && (
              <span className="muted">No balls left</span>
            )}
          </div>
          {board.winnerSide && (
            <div className="banner banner-info">Winner: Player {board.winnerSide}</div>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => matchId && refreshBoard(matchId)}
          >
            Refresh scoreboard
          </button>
        </div>
      )}
    </div>
  );
}
