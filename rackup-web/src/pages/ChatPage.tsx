import { useEffect, useRef, useState, type FormEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../lib/auth-context';
import type { ChatMessage } from '../lib/types';

export function ChatPage() {
  const { user, demo } = useAuth();

  const [online, setOnline] = useState(0);
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'system',
      text: 'Welcome to RackUp live chat. Keep it clean — trash talk optional.',
      createdAt: new Date().toISOString(),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (demo) {
      setConnected(true);
      setOnline(12);
      return;
    }

    const WS_URL = "wss://potential-parakeet-4rw9gxrgvxpcq579-3000.app.github.dev/socket.io";

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      withCredentials: false,
    });








    socketRef.current = socket;



    socket.on('connect', () => setConnected(true));

    socket.on('disconnect', () => setConnected(false));
    socket.on('presence', (payload: { onlineCount?: number }) => {
      if (typeof payload?.onlineCount === 'number') setOnline(payload.onlineCount);
    });
    socket.on('message', (payload: { sender?: string; text?: string; createdAt?: string }) => {
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-${Math.random()}`,
          sender: payload.sender ?? 'anon',
          text: payload.text ?? '',
          createdAt: payload.createdAt ?? new Date().toISOString(),
          mine: payload.sender === socket.id,
        },
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, [demo]);

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

    socketRef.current?.emit('message', { text: t, threadId: null });
    setText('');
  }

  return (
    <div className="page chat-page">
      <header className="row-between" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">Live</p>
          <h1 className="h2">Table chat</h1>
        </div>
        <span className={`chip${connected ? ' chip-live' : ' chip-quiet'}`}>
          {connected ? (
            <>
              <span className="dot-live" /> {online || '…'} online
            </>
          ) : (
            'Connecting…'
          )}
        </span>
      </header>

      <div className="chat-log card">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble${m.mine ? ' mine' : ''}${m.sender === 'system' ? ' system' : ''}`}>
            {m.sender !== 'system' && !m.mine && (
              <div className="chat-meta">{m.sender.slice(0, 8)}</div>
            )}
            <div>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
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