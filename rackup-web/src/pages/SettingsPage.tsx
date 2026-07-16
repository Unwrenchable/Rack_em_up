import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useToast } from '../lib/toast-context';

export function SettingsPage() {
  const { demo, logout, user } = useAuth();
  const { push } = useToast();
  const [notifs, setNotifs] = useState({
    money: true,
    halls: true,
    social: true,
    drills: false,
  });

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Settings
        </h1>
      </header>

      <div className="card stack" style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
        {[
          { label: 'Email', value: user?.email ?? '—' },
          { label: 'Mode', value: demo ? 'Demo data' : 'Live API' },
          { label: 'API', value: import.meta.env.VITE_API_URL ?? '/api/v1 (proxy)' },
        ].map((row, i) => (
          <div
            key={row.label}
            className="row-between"
            style={{
              padding: '14px 16px',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <span className="muted">{row.label}</span>
            <span style={{ fontWeight: 500, fontSize: '0.9rem', textAlign: 'right', maxWidth: '60%' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="section-title">
        <h2>Notifications</h2>
      </div>
      <div className="card stack" style={{ gap: 12 }}>
        {(
          [
            ['money', 'Money match updates'],
            ['halls', 'Hall Pulse nearby'],
            ['social', 'Friends & action board'],
            ['drills', 'Daily coach reminders'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="row-between" style={{ cursor: 'pointer' }}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={notifs[key]}
              onChange={(e) => {
                setNotifs((n) => ({ ...n, [key]: e.target.checked }));
                push('Preference saved', 'ok');
              }}
            />
          </label>
        ))}
      </div>

      <div className="section-title">
        <h2>Safety</h2>
      </div>
      <div className="card stack">
        <button type="button" className="btn btn-ghost btn-block" onClick={() => push('ID verify flow (later)', 'info')}>
          Identity verification
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => push('Report submitted', 'ok')}>
          Report a player
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => push('Blocked list empty', 'info')}>
          Blocked list
        </button>
      </div>

      <button type="button" className="btn btn-danger btn-block" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}