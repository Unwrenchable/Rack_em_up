import { useEffect, useState } from 'react';
import { fetchNotificationsApi } from '../lib/api';
import type { AppNotification } from '../lib/types';

export function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    fetchNotificationsApi().then(setItems);
  }, []);

  function markAll() {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header className="row-between">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="h1" style={{ fontSize: '2.4rem' }}>
            Alerts
          </h1>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={markAll}>
          Mark read
        </button>
      </header>

      <div className="stack">
        {items.map((n) => (
          <article
            key={n.id}
            className="card"
            style={{ opacity: n.read ? 0.65 : 1, borderColor: n.read ? undefined : 'var(--border-strong)' }}
            onClick={() =>
              setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
            }
          >
            <div className="row-between">
              <span
                className={`chip${
                  n.kind === 'money'
                    ? ' chip-gold'
                    : n.kind === 'social'
                      ? ' chip-live'
                      : n.kind === 'match'
                        ? ' chip-moderate'
                        : ''
                }`}
              >
                {n.kind}
              </span>
              <span className="muted" style={{ fontSize: '0.78rem' }}>
                {n.time}
              </span>
            </div>
            <h3 style={{ marginTop: 10, fontWeight: 600 }}>{n.title}</h3>
            <p className="muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>
              {n.body}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}