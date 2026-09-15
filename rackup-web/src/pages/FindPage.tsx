import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_FIND_ORIGIN,
  FIND_DISCOVERY_RADIUS_M,
  challengePlayer,
  fetchFriends,
  fetchLookingPlayers,
  goLiveLooking,
  leaveLookingQueue,
  mmV2Cancel,
  mmV2Confirm,
  mmV2Search,
  mmV2Status,
  openDmThread,
  requestFriend,
  unfriend,
} from '../lib/api';
import { chatThreadPath } from '../lib/chat-labels';
import { confirmUnfriend } from '../lib/friends';
import { useAuth } from '../lib/auth-context';
import { useHallsLive } from '../lib/use-halls-live';
import { useToast } from '../lib/toast-context';
import type { FriendCard, LookingPlayer } from '../lib/types';
import { HallsMap } from '../components/HallsMap';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';
import { PlayerCardChips } from '../components/PlayerCardChips';

const GAMES = ['All', '8-ball', '9-ball', '10-ball', 'One-pocket'];
const STAKES = ['Any', 'Casual', '$$', 'Action'];
const MM_V2_PAIR_RADIUS_M = 20_000;

type MmState = {
  requestId?: string;
  sessionId?: string | null;
  status: string;
  radiusMeters?: number;
  expiresAt?: string;
  matchId?: string | null;
};

function gameSlug(label: string): string {
  return label === 'One-pocket' ? 'one-pocket' : label;
}

export function FindPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [requestedIds, setRequestedIds] = useState<Record<string, boolean>>({});
  const [challengedIds, setChallengedIds] = useState<Record<string, boolean>>({});
  const [players, setPlayers] = useState<LookingPlayer[] | null>(null);
  const [friends, setFriends] = useState<FriendCard[]>([]);
  const { halls: verifiedHalls } = useHallsLive({ verifiedOnly: true });
  const [game, setGame] = useState('All');
  const [stakes, setStakes] = useState('Any');
  const [query, setQuery] = useState('');
  const [liveOpen, setLiveOpen] = useState(false);
  const [liveGame, setLiveGame] = useState('9-ball');
  const [liveStakes, setLiveStakes] = useState('casual');
  const [liveBusy, setLiveBusy] = useState(false);
  const [mm, setMm] = useState<MmState | null>(null);
  const [mmBusy, setMmBusy] = useState(false);
  const [origin, setOrigin] = useState(DEFAULT_FIND_ORIGIN);

  const refreshBoard = useCallback(async () => {
    const [looking, friends] = await Promise.all([
      fetchLookingPlayers({
        lat: origin.lat,
        lon: origin.lon,
        radius: FIND_DISCOVERY_RADIUS_M,
      }),
      fetchFriends().catch(() => [] as FriendCard[]),
    ]);
    setPlayers(looking.filter((p) => p.userId && p.userId !== user?.id));
    setFriends(friends.filter((f) => f.id && f.id !== user?.id));
  }, [origin.lat, origin.lon, user?.id]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        /* keep Vegas default so smoke / desktop still share an origin */
      },
      { maximumAge: 300_000, timeout: 4000 },
    );
  }, []);

  useEffect(() => {
    void refreshBoard();
    const t = setInterval(() => {
      void refreshBoard();
    }, 8000);
    return () => clearInterval(t);
  }, [refreshBoard]);

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
      if (game !== 'All' && p.game !== game && p.game !== gameSlug(game)) return false;
      if (stakes === 'Casual' && !/casual/i.test(p.stakes)) return false;
      if (stakes === '$$' && !/\$|50|100|small/i.test(p.stakes)) return false;
      if (stakes === 'Action' && !/\$1|race|200|big_money/i.test(p.stakes)) return false;
      if (query && !p.displayName.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }) ?? null;

  async function goLive() {
    if (!user) return;
    setLiveBusy(true);
    try {
      const slug = gameSlug(liveGame);

      // Matchmaking V2 queue (primary) — pairing radius stays local
      const enqueued = (await mmV2Search({
        lat: origin.lat,
        lon: origin.lon,
        radius: MM_V2_PAIR_RADIUS_M,
        game: slug,
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
          lat: origin.lat,
          lon: origin.lon,
          game: slug,
          stakes: liveStakes,
          min_rating: Math.max(0, user.rating - 100),
          max_rating: user.rating + 100,
        });
      } catch {
        /* V1 optional — V2 pending rows still appear on the board */
      }

      setLiveOpen(false);
      push("You're in the Matchmaking V2 queue — nearby players can find you", 'ok');
      await refreshBoard();
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
    setMmBusy(true);
    try {
      await leaveLookingQueue({ requestId: mm?.requestId });
      if (mm?.sessionId) {
        try {
          await mmV2Cancel({ sessionId: mm.sessionId });
        } catch {
          /* request-level leave already cancelled PENDING V2 */
        }
      }
      setMm(null);
      push('Left the looking board', 'ok');
      await refreshBoard();
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Cancel failed', 'err');
    } finally {
      setMmBusy(false);
    }
  }

  async function onUnfriend(f: FriendCard) {
    if (!confirmUnfriend(f.displayName)) return;
    try {
      await unfriend({ friendshipId: f.friendshipId, userId: f.id });
      setFriends((list) => list.filter((x) => x.id !== f.id));
      push(`Removed ${f.displayName}`, 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Could not unfriend', 'err');
    }
  }

  async function onAddFriend(playerUserId: string, name: string) {
    try {
      await requestFriend(playerUserId);
      setRequestedIds((m) => ({ ...m, [playerUserId]: true }));
      push(`Friend request sent to ${name}`, 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Request failed', 'err');
    }
  }

  async function onMessage(playerUserId: string, name?: string) {
    try {
      const thread = await openDmThread(playerUserId);
      navigate(chatThreadPath(thread.id, name));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (/friend/i.test(msg)) {
        push('Add them as a friend first, then message', 'info');
      } else {
        push(msg.slice(0, 120) || 'Could not open chat', 'err');
      }
    }
  }

  async function onChallenge(playerUserId: string, name: string, playerGame?: string) {
    try {
      const res = await challengePlayer({
        opponentId: playerUserId,
        game: playerGame && playerGame !== 'All' ? gameSlug(playerGame) : gameSlug(liveGame),
        stakes: liveStakes,
      });
      setChallengedIds((m) => ({ ...m, [playerUserId]: true }));
      push(`Challenge sent to ${name}`, 'ok');
      if (res.threadId) {
        navigate(chatThreadPath(res.threadId, name));
      }
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Challenge failed', 'err');
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
          Live looking players, friends, and verified halls. Challenge opens a match invite; Message
          opens a DM.
        </p>
      </header>

      {verifiedHalls && verifiedHalls.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="section-title">
            <h2>Verified halls</h2>
            <span className="muted">{verifiedHalls.length}</span>
          </div>
          <HallsMap halls={verifiedHalls} />
        </div>
      )}

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
              {user && (
                <div style={{ marginTop: 8 }}>
                  <PlayerCardChips
                    rating={user.rating}
                    ratingDisplay={user.ratingDisplay}
                    band={user.band}
                    playerCard={user.playerCard}
                    compact
                  />
                  <p className="muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
                    Pairing uses ROC Glicko-2 only — Fargo and RackUpRate stay parallel.
                  </p>
                </div>
              )}
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

      {friends.length > 0 && (
        <>
          <div className="section-title">
            <h2>Friends</h2>
            <span className="muted">{friends.length}</span>
          </div>
          <div className="stack">
            {friends.map((f) => (
              <article key={f.id} className="card">
                <div className="row">
                  <UserAvatar name={f.displayName} avatarUrl={f.avatarUrl} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row-between" style={{ gap: 8, alignItems: 'flex-start' }}>
                      <h3 style={{ fontWeight: 600 }}>{f.displayName}</h3>
                      <PlayerCardChips
                        rating={f.rating}
                        ratingDisplay={f.ratingDisplay}
                        playerCard={f.playerCard}
                        compact
                      />
                    </div>
                    <p className="muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>
                      {f.status === 'at_hall'
                        ? `At ${f.hallName && !/^[0-9a-f-]{36}$/i.test(f.hallName) ? f.hallName : 'a hall'}`
                        : f.status === 'online'
                          ? 'Online now'
                          : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    disabled={!!challengedIds[f.id]}
                    onClick={() => onChallenge(f.id, f.displayName)}
                  >
                    {challengedIds[f.id] ? 'Challenged' : 'Challenge'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMessage(f.id, f.displayName)}>
                    Message
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onUnfriend(f)}>
                    Unfriend
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

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
              <UserAvatar name={p.displayName} avatarUrl={p.avatarUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-between" style={{ gap: 8, alignItems: 'flex-start' }}>
                  <h3 style={{ fontWeight: 600 }}>{p.displayName}</h3>
                  <PlayerCardChips
                    rating={p.rating}
                    ratingDisplay={p.ratingDisplay}
                    band={p.band}
                    playerCard={p.playerCard}
                    compact
                  />
                </div>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>
                  {p.game} · {p.stakes} · {p.distanceKm} km
                  {p.source === 'v2' ? ' · live queue' : ''}
                </p>
              </div>
            </div>
            <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
              <span className="chip">Rep {p.reputation}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 'auto' }}
                disabled={!!requestedIds[p.userId] || p.userId === user?.id}
                onClick={() => onAddFriend(p.userId, p.displayName)}
              >
                {requestedIds[p.userId] ? 'Requested' : 'Add friend'}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!!challengedIds[p.userId] || p.userId === user?.id}
                onClick={() => onChallenge(p.userId, p.displayName, p.game)}
              >
                {challengedIds[p.userId] ? 'Challenged' : 'Challenge'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onMessage(p.userId, p.displayName)}
              >
                Message
              </button>
            </div>
          </article>
        ))}

        {filtered?.length === 0 && (
          <div className="empty card">No players match those filters. Go live or widen the search.</div>
        )}
      </div>

      <Modal open={liveOpen} title="Go live (Matchmaking V2)" onClose={() => setLiveOpen(false)}>
        <div className="stack">
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            Enqueues you on Redis Matchmaking V2 with radius pairing on ROC Glicko-2 (
            {user?.ratingDisplay ?? user?.rating ?? '—'} ±100). FargoRate and RackUpRate shadow are
            display-only and never overwrite the ROC ladder. You also appear on the looking board.
          </p>
          {user && (
            <PlayerCardChips
              rating={user.rating}
              ratingDisplay={user.ratingDisplay}
              band={user.band}
              playerCard={user.playerCard}
              compact
              showEmptySlots
            />
          )}
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
