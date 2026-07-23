import { useEffect, useState } from 'react';
import { checkInHall, fetchHalls, fetchLiveHalls } from '../lib/api';
import { useToast } from '../lib/toast-context';
import type { Hall, LiveHall } from '../lib/types';
import { HallsMap } from '../components/HallsMap';

export function HallsPage() {
  const { push } = useToast();
  const [halls, setHalls] = useState<Hall[] | null>(null);
  const [live, setLive] = useState<LiveHall[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchHalls().then(setHalls);
    fetchLiveHalls().then(setLive);
  }, []);

  async function checkIn(h: Hall) {
    setChecking(true);
    try {
      await checkInHall({
        hallId: h.id,
        name: h.name,
        lat: h.lat,
        lon: h.lon,
        game: '9-ball',
      });
      push(`Checked in at ${h.name}`, 'ok');
      const next = await fetchLiveHalls();
      setLive(next);
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Check-in failed', 'err');
    } finally {
      setChecking(false);
    }
  }

  function openDirections(h: Hall) {
    const query = h.address
      ? encodeURIComponent(h.address)
      : `${h.lat},${h.lon}`;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  const liveMap = new Map(live.map((l) => [l.hallId, l]));

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Location</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Halls
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Verified rooms, live counts, and one-tap check-in.
        </p>
      </header>

      <div className="card card-glow">
        <div className="row-between">
          <div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              Near you
            </div>
            <div style={{ fontWeight: 600 }}>
              {live.reduce((n, h) => n + h.activePlayerCount, 0)} players checked in
            </div>
          </div>
          <span className="chip chip-live">
            <span className="dot-live" /> Pulse
          </span>
        </div>
      </div>

      {/* Map view */}
      {halls && halls.length > 0 && <HallsMap halls={halls} />}

      <div className="stack">
        {halls?.map((h) => {
          const pulse = liveMap.get(h.id);
          return (
            <article key={h.id} className="card">
              <div className="row-between">
                <div>
                  <h3 style={{ fontWeight: 600 }}>
                    {h.name}{' '}
                    {h.isVerified && (
                      <span className="chip chip-gold" style={{ marginLeft: 6 }}>
                        Verified
                      </span>
                    )}
                  </h3>
                  <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                    {h.address ?? 'Address TBD'}
                    {h.tableCount ? ` · ${h.tableCount} tables` : ''}
                  </p>
                </div>
              </div>

              {pulse && (
                <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                  <span className="chip chip-live">{pulse.activePlayerCount} in</span>
                  <span className="chip">{pulse.activeMatchCount} matches</span>
                  <span
                    className={`chip chip-${
                      pulse.pulseStatus === 'BUSY'
                        ? 'busy'
                        : pulse.pulseStatus === 'MODERATE'
                          ? 'moderate'
                          : 'quiet'
                    }`}
                  >
                    {pulse.pulseStatus}
                  </span>
                </div>
              )}

              <div className="row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={checking}
                  onClick={() => checkIn(h)}
                >
                  Check in
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => openDirections(h)}
                >
                  Directions
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
