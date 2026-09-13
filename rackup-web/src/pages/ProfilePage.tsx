import { Link } from 'react-router-dom';
import { fetchBadges, fetchMemories, uploadAvatar } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useEffect, useRef, useState } from 'react';
import type { MatchMemory } from '../lib/types';
import { UserAvatar } from '../components/UserAvatar';
import { useToast } from '../lib/toast-context';

export function ProfilePage() {
  const { user, demo, logout, updateUser } = useAuth();
  const { push } = useToast();
  const badges = fetchBadges();
  const [memories, setMemories] = useState<MatchMemory[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMemories().then(setMemories);
  }, []);

  if (!user) return null;

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      push('Choose an image file', 'err');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      push('Photo must be 2 MB or smaller', 'err');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const res = await uploadAvatar(dataUrl);
      updateUser({ avatarUrl: res.avatarUrl });
      push('Profile picture updated', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Upload failed', 'err');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const wins = memories.filter((m) => m.isWinner).length;
  const winRate = memories.length ? Math.round((wins / memories.length) * 100) : 0;

  return (
    <div className="page stack" style={{ gap: 18 }}>
      <header style={{ textAlign: 'center', paddingTop: 12 }}>
        <button
          type="button"
          className="avatar-upload"
          style={{ margin: '0 auto' }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Upload profile picture"
        >
          <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="lg" />
          <span className="avatar-upload-hint">{uploading ? 'Uploading…' : 'Change pic'}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => onPickPhoto(e.target.files?.[0])}
        />
        <h1 className="h2" style={{ marginTop: 14, fontSize: '1.35rem' }}>
          {user.displayName}
        </h1>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          {user.email}
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <span className="rating-ring">★ {user.rating}</span>
          <span className="chip chip-gold">Rep {user.reputation}</span>
          <span className="chip">Streak 14</span>
        </div>
      </header>

      <div className="grid-2">
        <div className="stat-tile">
          <div className="value">{memories.length || 12}</div>
          <div className="label">Sets logged</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ color: 'var(--live)' }}>
            {memories.length ? `${winRate}%` : '67%'}
          </div>
          <div className="label">Win rate</div>
        </div>
      </div>

      <div className="section-title">
        <h2>Badges</h2>
      </div>
      <div className="badge-grid">
        {badges.map((b) => (
          <div key={b.id} className={`badge-card${b.earned ? ' earned' : ''}`}>
            <div className="badge-title">{b.label}</div>
            <div className="badge-desc">{b.desc}</div>
          </div>
        ))}
      </div>

      <div className="card stack" style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
        {[
          { label: 'Reliability', value: '14 shows · 0 no-shows' },
          { label: 'Favorite game', value: '9-ball' },
          { label: 'Home hall', value: 'Midnight Rack' },
          { label: 'Mode', value: demo ? 'Demo' : 'Live API' },
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
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="stack">
        <Link to="/memories" className="btn btn-secondary btn-block">
          Match memories
        </Link>
        <Link to="/coach" className="btn btn-ghost btn-block">
          Training coach
        </Link>
        <Link to="/settings" className="btn btn-ghost btn-block">
          Settings
        </Link>
        <button type="button" className="btn btn-ghost btn-block" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}