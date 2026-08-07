import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  acceptFriend,
  createActionPost,
  declineFriend,
  fetchActionBoard,
  fetchFriends,
  fetchPendingFriendsIncoming,
  formatRelative,
  initials,
  openDmThread,
} from '../lib/api';
import { useToast } from '../lib/toast-context';
import type { ActionPost, FriendCard } from '../lib/types';
import { Modal } from '../components/Modal';

type Tab = 'friends' | 'board' | 'chat';

type PendingFriend = {
  friendshipId: string;
  userId: string;
  displayName: string;
  rating: number;
  online: boolean;
};

export function SocialPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendCard[] | null>(null);
  const [pending, setPending] = useState<PendingFriend[]>([]);
  const [posts, setPosts] = useState<ActionPost[] | null>(null);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [game, setGame] = useState('9-ball');
  const [stakes, setStakes] = useState('casual');

  useEffect(() => {
    fetchFriends().then(setFriends);
    fetchPendingFriendsIncoming().then(setPending);
    fetchActionBoard().then(setPosts);
  }, []);

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
      navigate(`/chat?thread=${thread.id}`);
    } catch {
      navigate('/chat');
      push('Open chat to message', 'ok');
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
          {pending.length > 0 && (
            <section className="stack" style={{ gap: 8 }}>
              <p className="eyebrow">Incoming requests</p>
              {pending.map((p) => (
                <article key={p.friendshipId} className="card">
                  <div className="row-between">
                    <div>
                      <h3 style={{ fontWeight: 600 }}>{p.displayName}</h3>
                      <p className="muted" style={{ fontSize: '0.85rem' }}>
                        ★ {p.rating}
                        {p.online ? ' · Online' : ''}
                      </p>
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
          {friends?.length === 0 && pending.length === 0 && (
            <p className="muted">No friends yet — send a request from Find or a profile.</p>
          )}
          {friends?.map((f) => (
            <article key={f.id} className="card">
              <div className="row">
                <div className="avatar">{initials(f.displayName)}</div>
                <div style={{ flex: 1 }}>
                  <div className="row-between">
                    <h3 style={{ fontWeight: 600 }}>{f.displayName}</h3>
                    <span className="rating-ring">★ {f.rating}</span>
                  </div>
                  <p className="muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>
                    {f.status === 'at_hall' && (
                      <>
                        <span className="dot-live" style={{ display: 'inline-block', marginRight: 6 }} />
                        At {f.hallName}
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
                  onClick={() => push(`Challenge sent to ${f.displayName}`, 'ok')}
                >
                  Challenge
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
        <div className="card stack">
          <p className="muted">Global table chat + DMs. Presence powered by Socket.IO.</p>
          <Link to="/chat" className="btn btn-primary btn-block">
            Open live chat
          </Link>
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