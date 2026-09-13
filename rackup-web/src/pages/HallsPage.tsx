import { useEffect, useState } from 'react';
import {
  checkInHall,
  fetchLiveHalls,
  hallV2CheckIn,
  hallV2CheckOut,
  hallV2Create,
  hallV2Feed,
  verifyHall,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { useHallsLive } from '../lib/use-halls-live';
import { useToast } from '../lib/toast-context';
import type { Hall, LiveHall } from '../lib/types';
import { HallsMap } from '../components/HallsMap';
import { Modal } from '../components/Modal';

export function HallsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const { halls, refresh, setHalls } = useHallsLive();
  const [live, setLive] = useState<LiveHall[]>([]);
  const [checking, setChecking] = useState(false);
  const [feedHallId, setFeedHallId] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<unknown[] | null>(null);
  const [checkedInId, setCheckedInId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLat, setNewLat] = useState('36.1699');
  const [newLon, setNewLon] = useState('-115.1398');
  const [newTables, setNewTables] = useState('8');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchLiveHalls().then(setLive);
  }, []);

  async function checkIn(h: Hall) {
    setChecking(true);
    try {
      // Halls V2 primary
      await hallV2CheckIn({ hallId: h.id });
      // Keep V1 pulse board updated when available
      try {
        await checkInHall({
          hallId: h.id,
          name: h.name,
          lat: h.lat,
          lon: h.lon,
          game: '9-ball',
        });
      } catch {
        /* V1 optional */
      }
      setCheckedInId(h.id);
      push(`Checked in at ${h.name} (Halls V2)`, 'ok');
      const next = await fetchLiveHalls();
      setLive(next);
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Check-in failed', 'err');
    } finally {
      setChecking(false);
    }
  }

  async function checkOut(h: Hall) {
    setChecking(true);
    try {
      await hallV2CheckOut({ hallId: h.id });
      if (checkedInId === h.id) setCheckedInId(null);
      push(`Checked out of ${h.name}`, 'ok');
      fetchLiveHalls().then(setLive);
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Check-out failed', 'err');
    } finally {
      setChecking(false);
    }
  }

  async function loadFeed(h: Hall) {
    try {
      const res = (await hallV2Feed(h.id)) as { items?: unknown[]; feed?: unknown[] } | unknown[];
      const items = Array.isArray(res)
        ? res
        : (res as { items?: unknown[] }).items ??
          (res as { feed?: unknown[] }).feed ??
          [];
      setFeedHallId(h.id);
      setFeedItems(Array.isArray(items) ? items : []);
    } catch (e) {
      push(e instanceof Error ? e.message.slice(0, 120) : 'Feed failed', 'err');
      setFeedHallId(h.id);
      setFeedItems([]);
    }
  }

  function openDirections(h: Hall) {
    const query = h.address ? encodeURIComponent(h.address) : `${h.lat},${h.lon}`;
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
        <p className="eyebrow">Halls V2</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Halls
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Verified rooms, live pulse, V2 check-in/out and feed.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => setCreateOpen(true)}
        >
          + Add hall
        </button>
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

      {halls && halls.length > 0 && <HallsMap halls={halls} />}

      <div className="stack">
        {halls?.map((h) => {
          const pulse = liveMap.get(h.id);
          const feedOpen = feedHallId === h.id;
          return (
            <article key={h.id} className="card">
              <div className="row-between">
                <div>
                  <h3 style={{ fontWeight: 600 }}>
                    {h.name}{' '}
                    {h.isVerified ? (
                      <span className="chip chip-gold" style={{ marginLeft: 6 }}>
                        Verified
                      </span>
                    ) : null}
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

              <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={checking}
                  onClick={() => checkIn(h)}
                >
                  Check in (V2)
                </button>
                {checkedInId === h.id && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={checking}
                    onClick={() => checkOut(h)}
                  >
                    Check out
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadFeed(h)}>
                  {feedOpen ? 'Refresh feed' : 'Hall feed'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openDirections(h)}>
                  Directions
                </button>
                {user &&
                  !h.isVerified &&
                  (user.role === 'ADMIN' ||
                    user.role === 'HALL_OWNER' ||
                    h.ownerUserId === user.id) && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        try {
                          const updated = await verifyHall(h.id, true);
                          setHalls((list) =>
                            (list ?? []).map((x) => (x.id === h.id ? { ...x, ...updated } : x)),
                          );
                          push(`${h.name} is now verified`, 'ok');
                          await refresh();
                        } catch (e) {
                          push(e instanceof Error ? e.message.slice(0, 120) : 'Verify failed', 'err');
                        }
                      }}
                    >
                      Verify on map
                    </button>
                  )}
              </div>

              {feedOpen && (
                <div
                  className="stack"
                  style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border, #333)' }}
                >
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    Halls V2 feed
                  </div>
                  {feedItems === null && <div className="skeleton" style={{ height: 40 }} />}
                  {feedItems?.length === 0 && (
                    <p className="muted" style={{ fontSize: '0.85rem' }}>
                      No feed items yet — events and check-ins will show here.
                    </p>
                  )}
                  {feedItems?.slice(0, 8).map((item, i) => (
                    <pre
                      key={i}
                      className="muted"
                      style={{
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                        opacity: 0.9,
                      }}
                    >
                      {typeof item === 'string' ? item : JSON.stringify(item, null, 0).slice(0, 200)}
                    </pre>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Modal open={createOpen} title="Add a hall" onClose={() => setCreateOpen(false)}>
        <div className="stack">
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Adds a room to Halls V2. Anyone can add; verification stays with owners/admins.
          </p>
          <div className="field">
            <label>Name</label>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Midnight Rack"
            />
          </div>
          <div className="field">
            <label>Address</label>
            <input
              className="input"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Lat</label>
              <input className="input" value={newLat} onChange={(e) => setNewLat(e.target.value)} />
            </div>
            <div className="field">
              <label>Lon</label>
              <input className="input" value={newLon} onChange={(e) => setNewLon(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Tables</label>
            <input
              className="input"
              type="number"
              min={1}
              value={newTables}
              onChange={(e) => setNewTables(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={creating || newName.trim().length < 2}
            onClick={async () => {
              setCreating(true);
              try {
                const res = await hallV2Create({
                  name: newName.trim(),
                  lat: Number(newLat),
                  lon: Number(newLon),
                  address: newAddress.trim() || undefined,
                  tableCount: Number(newTables) || undefined,
                });
                setHalls((list) => {
                  const next = list ?? [];
                  if (next.some((h) => h.id === res.hall.id)) return next;
                  return [...next, res.hall].sort((a, b) => a.name.localeCompare(b.name));
                });
                await refresh();
                setCreateOpen(false);
                setNewName('');
                push(res.alreadyExisted ? `Already on the map: ${res.hall.name}` : `Added ${res.hall.name}`, 'ok');
              } catch (e) {
                push(e instanceof Error ? e.message.slice(0, 120) : 'Add hall failed', 'err');
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? 'Adding…' : 'Add hall'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
