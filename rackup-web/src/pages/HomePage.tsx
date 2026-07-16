import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLiveHalls, fetchNotificationsApi, fetchShotOfTheDay } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import type { LiveHall, ShotOfTheDay } from '../lib/types';
import {
  IconBell,
  IconBolt,
  IconCash,
  IconMap,
  IconTarget,
  IconTrophy,
  IconUsers,
} from '../components/Icons';

function pulseChip(status: LiveHall['pulseStatus']) {
  if (status === 'BUSY') return 'chip chip-busy';
  if (status === 'MODERATE') return 'chip chip-moderate';
  return 'chip chip-quiet';
}

export function HomePage() {
  const { user } = useAuth();
  const [halls, setHalls] = useState<LiveHall[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [sotd, setSotd] = useState<ShotOfTheDay | null>(null);
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : hour < 22 ? 'Tonight' : 'Late night';

  useEffect(() => {
    let alive = true;
    fetchLiveHalls().then((h) => {
      if (alive) setHalls(h);
    });
    fetchNotificationsApi().then((n) => {
      if (alive) setUnread(n.filter((x) => !x.read).length);
    });
    fetchShotOfTheDay().then((s) => {
      if (alive) setSotd(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hot = halls?.filter((h) => h.pulseStatus !== 'QUIET').length ?? 0;

  return (
    <div className="page stack" style={{ gap: 18 }}>
      <header className="row-between">
        <div>
          <p className="eyebrow">
            <span className="dot-live" /> Hall Pulse
          </p>
          <h1 className="h1" style={{ fontSize: '2.4rem', marginTop: 4 }}>
            {greet}, {user?.displayName?.split(' ')[0] ?? 'Player'}
          </h1>
        </div>
        <div className="row">
          <Link to="/notifications" className="icon-btn" aria-label="Notifications">
            <IconBell />
            {unread > 0 && <span className="badge-dot">{unread}</span>}
          </Link>
          <div className="rating-ring" title="Your rating">
            ★ {user?.rating ?? '—'}
          </div>
        </div>
      </header>

      <div className="card card-glow" style={{ padding: 18 }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              Near you right now
            </div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>
              {halls === null ? 'Scanning halls…' : `${hot} hall${hot === 1 ? '' : 's'} popping`}
            </div>
          </div>
          <span className="chip chip-live">
            <span className="dot-live" /> Live
          </span>
        </div>
        <div className="grid-2">
          <div className="stat-tile">
            <div className="value">
              {halls?.reduce((n, h) => n + h.activePlayerCount, 0) ?? '—'}
            </div>
            <div className="label">Players in</div>
          </div>
          <div className="stat-tile">
            <div className="value">
              {halls?.reduce((n, h) => n + h.activeMatchCount, 0) ?? '—'}
            </div>
            <div className="label">Active sets</div>
          </div>
        </div>
      </div>

      <div className="quick-actions" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Link to="/find" className="quick-action">
          <span className="qa-icon">
            <IconBolt />
          </span>
          Instant
        </Link>
        <Link to="/play" className="quick-action">
          <span className="qa-icon">
            <IconCash />
          </span>
          Money
        </Link>
        <Link to="/halls" className="quick-action">
          <span className="qa-icon">
            <IconMap />
          </span>
          Halls
        </Link>
        <Link to="/coach" className="quick-action">
          <span className="qa-icon">
            <IconTarget />
          </span>
          Coach
        </Link>
      </div>

      <div className="grid-2">
        <Link to="/social" className="card row" style={{ gap: 10, textDecoration: 'none' }}>
          <IconUsers />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Social</div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>Friends · board</div>
          </div>
        </Link>
        <Link to="/play" className="card row" style={{ gap: 10, textDecoration: 'none' }}>
          <IconTrophy />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tours</div>
            <div className="muted" style={{ fontSize: '0.75rem' }}>Brackets · leagues</div>
          </div>
        </Link>
      </div>

      {sotd && (
        <Link to="/coach" className="card card-glow" style={{ textDecoration: 'none' }}>
          <div className="row-between">
            <span className="chip chip-live">Shot of the Day</span>
            <span className="chip chip-gold">{sotd.shot.difficulty}</span>
          </div>
          <h3 style={{ fontWeight: 700, marginTop: 10, fontSize: '1.15rem' }}>{sotd.shot.name}</h3>
          <p className="muted" style={{ fontSize: '0.88rem', marginTop: 4 }}>
            {sotd.shot.tagline}
          </p>
          <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <span className="chip">Tip: {sotd.shot.tipZone}</span>
            <span className="chip">Speed: {sotd.shot.speed}</span>
            <span className="chip chip-gold" style={{ marginLeft: 'auto' }}>
              Full breakdown →
            </span>
          </div>
        </Link>
      )}

      <div className="section-title">
        <h2>Live halls</h2>
        <Link to="/halls">See all</Link>
      </div>

      <div className="stack">
        {halls === null &&
          [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}

        {halls?.slice(0, 3).map((h) => (
          <article key={h.hallId} className={`card hall-card pulse-${h.pulseStatus}`}>
            <div className="row-between">
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '1.05rem' }}>{h.name}</h3>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>
                  {h.gameTypes.length ? h.gameTypes.join(' · ') : 'Open play'}
                  {h.averageRating != null ? ` · avg ★${h.averageRating}` : ''}
                </p>
              </div>
              <span className={pulseChip(h.pulseStatus)}>{h.pulseStatus}</span>
            </div>
            <div className="row" style={{ marginTop: 14, flexWrap: 'wrap' }}>
              <span className="chip chip-live">{h.activePlayerCount} in</span>
              <span className="chip">{h.activeMatchCount} matches</span>
              <Link to="/halls" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
                Jump in
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}