import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  acceptFriend,
  challengePlayer,
  createActionPost,
  declineFriend,
  fetchActionBoard,
  fetchChatThreads,
  fetchFriends,
  fetchPendingFriendsIncoming,
  fetchPendingFriendsOutgoing,
  formatRelative,
  openDmThread,
  requestFriend,
  searchUsers,
  unfriend,
  type PublicUserProfile,
} from '../lib/api';
import { chatThreadPath, conversationLabel } from '../lib/chat-labels';
import { confirmUnfriend } from '../lib/friends';
import { useToast } from '../lib/toast-context';
import type { ActionPost, FriendCard } from '../lib/types';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';
import { PlayerCardChips } from '../components/PlayerCardChips';

type Tab = 'friends' | 'board' | 'chat';

type PendingFriend = {
  friendshipId: string;
  userId: string;
  displayName: string;
  rating: number;
  ratingDisplay?: string;
  band?: string;
  playerCard?: import('../lib/types').UnifiedPlayerCard;
  online: boolean;
  avatarUrl?: string | null;
};

export function SocialPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendCard[] | null>(null);
  const [pending, setPending] = useState<PendingFriend[]>([]);
  const [outgoing, setOutgoing] = useState<PendingFriend[]>([]);
  const [posts, setPosts] = useState<ActionPost[] | null>(null);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [game, setGame] = useState('9-ball');
  const [stakes, setStakes] = useState('casual');
  const [findQuery, setFindQuery] = useState('');
  const [findResults, setFindResults] = useState<PublicUserProfile[] | null>(null);
  const [findBusy, setFindBusy] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Record<string, boolean>>({});
  const [challengedIds, setChallengedIds] = useState<Record<string, boolean>>({});
  const [threads, setThreads] = useState<
    Array<{ id: string; kind: string; title: string | null; lastMessagePreview: string | null }>
  >([]);

  useEffect(() => {
    fetchFriends()
      .then(setFriends)
      .catch((err) => {
        setFriends([]);
        push(err instanceof Error ? err.message.slice(0, 120) : 'Could not load friends', 'err');
      });
    fetchPendingFriendsIncoming().then(setPending);
    fetchPendingFriendsOutgoing().then(setOutgoing);
    fetchActionBoard().then(setPosts);
    fetchChatThreads().then(setThreads);
  }, [push]);

  async function onFindPlayer(e?: FormEvent) {
    e?.preventDefault();
    const q = findQuery.trim();
    if (q.length < 2) {
      push('Type at least 2 characters', 'err');
      return;
    }
    setFindBusy(true);
    try {
      setFindResults(await searchUsers(q));
    } catch {
      push('Search failed', 'err');
    } finally {
      setFindBusy(false);
    }
  }

  async function onSendRequest(p: PublicUserProfile) {
    try {
      await requestFriend(p.id);
      setRequestedIds((m) => ({ ...m, [p.id]: true }));
      setOutgoing(await fetchPendingFriendsOutgoing());
      push(`Request sent to ${p.displayName}`, 'ok');
    } catch (err) {
      push(err instanceof Error ? err.message.slice(0, 120) : 'Could not send request', 'err');
    }
  }

  async function onAccept(p: PendingFriend) {
    try {
      await acceptFriend(p.friendshipId);
      setPending((list) => list.filter((x) => x.friendshipId !== p.friendshipId));
      setFriends(await fetchFriends());
      push(`You are now friends with ${p.displayName}`, 'ok');
    } catch {
      push('Could not accept request', 'err');
    }
  }

  async function onDecline(p: PendingFriend) {
    try {
      await declineFriend(p.friendshipId);
      setPending((list) => list.filter((x) => x.friendshipId !== p.friendshipId));
      push('Request declined', 'ok');
    } catch {
      push('Could not decline', 'err');
    }
  }

  async function messageFriend(f: FriendCard) {
    try {
      const thread = await openDmThread(f.id);
      navigate(chatThreadPath(thread.id, f.displayName));
    } catch {
      navigate('/chat');
      push('Open chat to message', 'ok');
    }
  }

  async function onUnfriend(f: FriendCard) {
    if (!confirmUnfriend(f.displayName)) return;
    try {
      await unfriend({ friendshipId: f.friendshipId, userId: f.id });
      setFriends((list) => (list ?? []).filter((x) => x.id !== f.id));
      push(`Removed ${f.displayName}`, 'ok');
    } catch (err) {
      push(err instanceof Error ? err.message.slice(0, 120) : 'Could not unfriend', 'err');
    }
  }

  async function challengeFriend(f: FriendCard) {
    try {
      const res = await challengePlayer({ opponentId: f.id });
      setChallengedIds((m) => ({ ...m, [f.id]: true }));
      push(`Challenge sent to ${f.displayName}`, 'ok');
      if (res.threadId) navigate(chatThreadPath(res.threadId, f.displayName));
    } catch (err) {
      push(err instanceof Error ? err.message.slice(0, 120) : 'Challenge failed', 'err');
    }
  }

  async function postAction() {
    if (body.trim().length < 3) {
      push('Write a bit more', 'err');
      return;
    }
    const post = await createActionPost({ body, game, stakes });
    setPosts((p) => [post, ...(p ?? [])]);
    setOpen(false);
    setBody('');
    push('Posted to the action board', 'ok');
  }

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Community</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Social
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Friends, looking-for-action posts, and table chat.
        </p>
      </header>

      <div className="tabs">
        {(
          [
            ['friends', 'Friends'],
            ['board', 'Action'],
            ['chat', 'Chat'],
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

      {tab === 'friends' && (
        <div className="stack">
          <form className="card stack" onSubmit={onFindPlayer} style={{ gap: 10 }}>
            <p className="eyebrow">Find a player</p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 180 }}
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Display name or email"
                aria-label="Search players by name or email"
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={findBusy}>
                {findBusy ? 'Searching…' : 'Search'}
              </button>
            </div>
            {findResults && findResults.length === 0 && (
              <p className="muted" style={{ fontSize: '0.88rem' }}>
                No players match “{findQuery.trim()}”.
              </p>
            )}
            {findResults?.map((p) => {
              const alreadyFriend = friends?.find((f) => f.id === p.id);
              const sent = requestedIds[p.id];
              return (
                <div key={p.id} className="row-between" style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <UserAvatar name={p.displayName} avatarUrl={p.avatarUrl} />
                    <div>
                    <div style={{ fontWeight: 600 }}>{p.displayName}</div>
                    <PlayerCardChips
                      rating={p.rating}
                      ratingDisplay={p.ratingDisplay}
                      band={p.band}
                      playerCard={p.playerCard}
                      compact
                    />
                    </div>
                  </div>
                  {alreadyFriend ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onUnfriend(alreadyFriend)}
                    >
                      Unfriend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={sent}
                      onClick={() => onSendRequest(p)}
                    >
                      {sent ? 'Requested' : 'Request'}
                    </button>
                  )}
                </div>
              );
            })}
          </form>
          {outgoing.length > 0 && (
            <section className="stack" style={{ gap: 8 }}>
              <p className="eyebrow">Outgoing requests</p>
              {outgoing.map((p) => (
                <article key={p.friendshipId} className="card">
                  <div className="row-between">
                    <div className="row" style={{ gap: 10 }}>
                      <UserAvatar name={p.displayName} avatarUrl={p.avatarUrl} />
                      <div>
                        <h3 style={{ fontWeight: 600 }}>{p.displayName}</h3>
                        <p className="muted" style={{ fontSize: '0.85rem' }}>
                          Waiting for them to accept
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
          {pending.length > 0 && (
            <section className="stack" style={{ gap: 8 }}>
              <p className="eyebrow">Incoming requests</p>
              {pending.map((p) => (
                <article key={p.friendshipId} className="card">
                  <div className="row-between">
                    <div className="row" style={{ gap: 10 }}>
                      <UserAvatar name={p.displayName} avatarUrl={p.avatarUrl} />
                      <div>
                      <h3 style={{ fontWeight: 600 }}>{p.displayName}</h3>
                      <p className="muted" style={{ fontSize: '0.85rem' }}>
                        {p.online ? 'Online' : 'Offline'}
                      </p>
                      <PlayerCardChips
                        rating={p.rating}
                        ratingDisplay={p.ratingDisplay}
                        band={p.band}
                        playerCard={p.playerCard}
                        compact
                      />
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onAccept(p)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onDecline(p)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
          {friends?.length === 0 && pending.length === 0 && outgoing.length === 0 && (
            <p className="muted">No friends yet — search above by name or email and send a request.</p>
          )}
          {friends?.map((f) => (
            <article key={f.id} className="card">
              <div className="row">
                <UserAvatar name={f.displayName} avatarUrl={f.avatarUrl} />
                <div style={{ flex: 1 }}>
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
                    {f.status === 'at_hall' && (
                      <>
                        <span className="dot-live" style={{ display: 'inline-block', marginRight: 6 }} />
                        At{' '}
                        {f.hallName && !/^[0-9a-f-]{36}$/i.test(f.hallName) ? f.hallName : 'a hall'}
                      </>
                    )}
                    {f.status === 'online' && 'Online now'}
                    {f.status === 'offline' && 'Offline'}
                    {typeof f.mutualCount === 'number' && f.mutualCount > 0
                      ? ` · ${f.mutualCount} mutual`
                      : null}
                  </p>
                </div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => messageFriend(f)}
                >
                  Message
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={!!challengedIds[f.id]}
                  onClick={() => challengeFriend(f)}
                >
                  {challengedIds[f.id] ? 'Challenged' : 'Challenge'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onUnfriend(f)}
                >
                  Unfriend
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'board' && (
        <div className="stack">
          <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(true)}>
            + Looking for action
          </button>
          {posts?.map((p) => (
            <article key={p.id} className="card">
              <div className="row-between">
                <span className="chip chip-live">{p.game}</span>
                <span className="muted" style={{ fontSize: '0.78rem' }}>
                  {formatRelative(p.createdAt)}
                </span>
              </div>
              <p style={{ marginTop: 10, fontWeight: 500, lineHeight: 1.4 }}>{p.body}</p>
              <div className="row" style={{ marginTop: 12 }}>
                <span className="chip">{p.stakes}</span>
                <span className="chip chip-gold">{p.authorName ?? 'Player'}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => push('Reply sent', 'ok')}
                  >
                    Reply
                  </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'chat' && (
        <div className="stack">
          <div className="card stack">
            <p className="muted">DMs from Find / Friends open here. Lobby table chat is still live.</p>
            <Link to="/chat" className="btn btn-primary btn-block">
              Open table chat
            </Link>
          </div>
          {threads.length === 0 && (
            <p className="muted">No conversations yet — add a friend from Find or search above.</p>
          )}
          {threads.map((t) => (
            <article key={t.id} className="card">
              <div className="row-between">
                <div>
                  <div style={{ fontWeight: 600 }}>{conversationLabel(t)}</div>
                  {t.lastMessagePreview && (
                    <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      {t.lastMessagePreview}
                    </p>
                  )}
                </div>
                <Link to={chatThreadPath(t.id, t.title)} className="btn btn-secondary btn-sm">
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title="Looking for action" onClose={() => setOpen(false)}>
        <div className="stack">
          <div className="field">
            <label>What are you looking for?</label>
            <textarea
              className="input"
              style={{ minHeight: 100, paddingTop: 12, resize: 'vertical' }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Race to 5 · 9-ball · $50 · Midnight Rack…"
              maxLength={280}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Game</label>
              <select className="input" value={game} onChange={(e) => setGame(e.target.value)}>
                {['8-ball', '9-ball', '10-ball', 'One-pocket'].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Stakes</label>
              <select className="input" value={stakes} onChange={(e) => setStakes(e.target.value)}>
                <option value="casual">Casual</option>
                <option value="small">Small</option>
                <option value="big_money">Big money</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={postAction}>
            Post
          </button>
        </div>
      </Modal>
    </div>
  );
}