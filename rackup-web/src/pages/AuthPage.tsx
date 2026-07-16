import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function AuthPage() {
  const { user, login, signup, startDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, password, displayName || 'Player');
    } catch (err) {
      setError(err instanceof Error ? err.message.slice(0, 160) : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-hero">
      <div className="auth-felt" aria-hidden />
      <div className="auth-ball" aria-hidden />

      <div className="auth-content stack" style={{ gap: 20 }}>
        <div>
          <p className="eyebrow">
            <span className="dot-live" /> Pool players network
          </p>
          <h1 className="logo-mark">RACKUP</h1>
          <p className="muted" style={{ marginTop: 8, maxWidth: 320 }}>
            Find action. Check halls. Protect the money. Look good doing it.
          </p>
        </div>

        <div className="card card-glow stack">
          <div className="tabs">
            <button
              type="button"
              className={`tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => setMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className={`tab${mode === 'signup' ? ' active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Join
            </button>
          </div>

          <form className="stack" onSubmit={onSubmit}>
            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="name">Display name</label>
                <input
                  id="name"
                  className="input"
                  placeholder="Ace Delgado"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="nickname"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                required
                placeholder="you@pool.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && <div className="banner banner-error">{error}</div>}

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Working…' : mode === 'login' ? 'Enter the room' : 'Create account'}
            </button>
          </form>

          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Just browsing?
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={startDemo}>
              Open demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}