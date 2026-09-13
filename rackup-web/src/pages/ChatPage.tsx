import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  fetchChatThreads,
  fetchThreadMessages,
  getSocketUrl,
  getToken,
  sendThreadMessage,
  TOKEN_REFRESHED_EVENT,
} from '../lib/api';
import { chatThreadPath, conversationLabel } from '../lib/chat-labels';
import { useAuth } from '../lib/auth-context';
import type { ChatMessage } from '../lib/types';

const LOBBY_WELCOME: ChatMessage = {
  id: 'welcome',
  sender: 'system',
  text: 'Welcome to RackUp live chat. Keep it clean — trash talk optional.',
  createdAt: new Date().toISOString(),
};

export function ChatPage() {
  const { user, demo } = useAuth();
  const [params] = useSearchParams();
  const threadId = params.get('thread');
  const nameParam = params.get('name');

  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([LOBBY_WELCOME]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const myNameRef = useRef(user?.displayName ?? '');
  const threadIdRef = useRef(threadId);
  const [threads, setThreads] = useState<
    Array<{ id: string; title: string | null; kind: string; lastMessagePreview: string | null }>
  >([]);
  const activeThread = threads.find((t) => t.id === threadId);
  const heading = threadId
    ? conversationLabel({
        title: nameParam || activeThread?.title,
        kind: activeThread?.kind ?? 'DM',
        lastMessagePreview: activeThread?.lastMessagePreview,
      })
    : 'Table chat';

  useEffect(() => {
    myNameRef.current = user?.displayName ?? '';
  }, [user?.displayName]);

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  useEffect(() => {
    fetchChatThreads().then((rows) =>
      setThreads(
        rows.map((t) => ({
          id: t.id,
          title: t.title,
          kind: t.kind,
          lastMessagePreview: t.lastMessagePreview,
        })),
      ),
    );
  }, []);

  useEffect(() => {
    if (!threadId) {
      setMessages([LOBBY_WELCOME]);
      return;
    }
    const peerLabel = conversationLabel({
      title: nameParam || activeThread?.title,
      kind: activeThread?.kind ?? 'DM',
      lastMessagePreview: activeThread?.lastMessagePreview,
    });
    if (demo) {
      setMessages([
        {
          id: 'welcome-dm',
          sender: 'system',
          text: `Chat with ${peerLabel}.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }
    fetchThreadMessages(threadId)
      .then((rows) => {
        const chronological = [...rows].reverse();
        setMessages(
          chronological.map((m) => ({
            id: m.id,
            sender: m.senderId === user?.id ? (user.displayName ?? 'You') : peerLabel,
            text: m.body || (m.type === 'MATCH_INVITE' ? 'Match invite' : ''),
            createdAt: m.createdAt,
            mine: m.senderId === user?.id,
          })),
        );
      })
      .catch(() => {
        setMessages([
          {
            id: 'welcome-dm',
            sender: 'system',
            text: `Chat with ${peerLabel}.`,
            createdAt: new Date().toISOString(),
          },
        ]);
      });
  }, [threadId, demo, user?.id, user?.displayName, nameParam, activeThread?.title]);

  useEffect(() => {
    if (demo) {
      setConnected(true);
      setOnline(12);
      return;
    }

    const token = getToken();
    if (!token || token === 'demo') {
      setAuthError('Sign in required for live chat');
      setConnected(false);
      return;
    }

    const SOCKET_URL = getSocketUrl();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      withCredentials: false,
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setAuthError(null);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('authenticated', () => setAuthError(null));
    socket.on('error', (payload: { message?: string }) => {
      setAuthError(payload?.message ?? 'Chat error');
    });
    socket.on('connect_error', () => {
      setAuthError('Could not connect — check JWT / API');
    });

    socket.on('presence', (payload: { onlineCount?: number }) => {
      if (typeof payload?.onlineCount === 'number') {
        setOnline(payload.onlineCount);
      }
    });

    socket.on(
      'message',
      (payload: { sender?: string; senderId?: string; text?: string; createdAt?: string }) => {
        if (threadIdRef.current) return;
        setMessages((m) => [
          ...m,
          {
            id: `${Date.now()}-${Math.random()}`,
            sender: payload.sender ?? 'anon',
            text: payload.text ?? '',
            createdAt: payload.createdAt ?? new Date().toISOString(),
            mine:
              payload.sender === myNameRef.current ||
              payload.senderId === user?.id,
          },
        ]);
      },
    );

    const onTokenRefresh = () => {
      const next = getToken();
      if (!next || next === 'demo') return;
      socket.auth = { token: next };
      if (socket.connected) socket.disconnect();
      socket.connect();
    };
    window.addEventListener(TOKEN_REFRESHED_EVENT, onTokenRefresh);

    return () => {
      window.removeEventListener(TOKEN_REFRESHED_EVENT, onTokenRefresh);
      socket.disconnect();
    };
  }, [demo, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;

    if (demo) {
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}`,
          sender: user?.displayName ?? 'You',
          text: t,
          createdAt: new Date().toISOString(),
          mine: true,
        },
      ]);
      setText('');
      return;
    }

    if (threadId) {
      void sendThreadMessage(threadId, t)
        .then((saved) => {
          const row = saved as { id?: string; body?: string; createdAt?: string };
          setMessages((m) => [
            ...m,
            {
              id: row.id ?? `${Date.now()}`,
              sender: user?.displayName ?? 'You',
              text: row.body ?? t,
              createdAt: row.createdAt ?? new Date().toISOString(),
              mine: true,
            },
          ]);
        })
        .catch(() => {
          setMessages((m) => [
            ...m,
            {
              id: `${Date.now()}`,
              sender: 'system',
              text: 'Could not send DM — try again.',
              createdAt: new Date().toISOString(),
            },
          ]);
        });
      setText('');
      return;
    }

    socketRef.current?.emit('message', { text: t, threadId: null });
    setText('');
  }

  return (
    <div className="page chat-page">
      <header className="row-between" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">{threadId ? 'Chat' : 'Live'}</p>
          <h1 className="h2">{heading}</h1>
        </div>
        {!threadId && (
          <span className={`chip${connected ? ' chip-live' : ' chip-quiet'}`}>
            {connected ? (
              <>
                <span className="dot-live" /> {online || '…'} online
              </>
            ) : (
              'Connecting…'
            )}
          </span>
        )}
      </header>

      {authError && !threadId && (
        <div className="banner banner-info" style={{ marginBottom: 12 }}>
          {authError}
        </div>
      )}

      {threads.length > 0 && (
        <div className="chat-convos" aria-label="Conversations">
          <Link to="/chat" className={`chip${!threadId ? ' chip-gold' : ''}`}>
            Lobby
          </Link>
          {threads.map((t) => (
            <Link
              key={t.id}
              to={chatThreadPath(t.id, t.title)}
              className={`chip${threadId === t.id ? ' chip-gold' : ''}`}
            >
              {conversationLabel(t)}
            </Link>
          ))}
        </div>
      )}

      <div className="chat-log card">
        <div className="chat-log-inner">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`chat-bubble${m.mine ? ' mine' : ''}${
                m.sender === 'system' ? ' system' : ''
              }`}
            >
              {m.sender !== 'system' && !m.mine && (
                <div className="chat-meta">{m.sender}</div>
              )}
              <div>{m.text}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form className="chat-compose" onSubmit={send}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something…"
          maxLength={1000}
        />
        <button type="submit" className="btn btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
