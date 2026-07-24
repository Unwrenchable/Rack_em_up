import { useEffect, useMemo, useState } from 'react';
import { fetchShotCatalog, fetchSotdMap } from '../lib/api';
import type { CatalogShot, SotdShotMap } from '../lib/types';
import { ShotCard } from '../components/ShotCard';
import { ShotMapDiagram } from '../components/ShotMapDiagram';
import { Modal } from '../components/Modal';

const DIFFS = ['', 'Easy', 'Medium', 'Hard', 'Insane'];
const CATS = [
  '',
  'bank',
  'combo',
  'curve',
  'jump',
  'masse',
  'kick',
  'carom',
  'novelty',
  'position',
];

export function ShotsCatalogPage() {
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [shots, setShots] = useState<CatalogShot[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<CatalogShot | null>(null);
  const [map, setMap] = useState<SotdShotMap | null>(null);
  const pageSize = 8;

  useEffect(() => {
    fetchShotCatalog({
      difficulty: difficulty || undefined,
      category: category || undefined,
    }).then((r) => {
      setShots(r.shots);
      setTotal(r.total);
      setPage(0);
    });
  }, [difficulty, category]);

  const pageShots = useMemo(() => {
    const start = page * pageSize;
    return shots.slice(start, start + pageSize);
  }, [shots, page]);

  const pages = Math.max(1, Math.ceil(shots.length / pageSize));

  return (
    <div className="page stack" style={{ gap: 16 }}>
      <header>
        <p className="eyebrow">Training · Catalog</p>
        <h1 className="h1" style={{ fontSize: '2.5rem' }}>
          Shot catalog
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {total} shots · filters + maps
        </p>
      </header>

      <div className="card grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label>Difficulty</label>
          <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFS.map((d) => (
              <option key={d || 'all'} value={d}>
                {d || 'All'}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATS.map((c) => (
              <option key={c || 'all'} value={c}>
                {c || 'All'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stack">
        {pageShots.map((s) => (
          <article key={s.id} className="card">
            <div className="row-between">
              <div>
                <h3 style={{ fontWeight: 600 }}>{s.name}</h3>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {s.tagline}
                </p>
              </div>
              <span className="chip chip-gold">{s.difficulty}</span>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span className="chip">{s.category}</span>
              <span className="chip">{s.speed}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  setSelected(s);
                  const m = await fetchSotdMap(s.id);
                  setMap(m);
                }}
              >
                Open
              </button>
            </div>
          </article>
        ))}
        {!pageShots.length && <div className="empty card">No shots match filters.</div>}
      </div>

      <div className="row-between">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Prev
        </button>
        <span className="muted">
          Page {page + 1} / {pages}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={page + 1 >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      <Modal open={!!selected} title={selected?.name ?? 'Shot'} onClose={() => setSelected(null)}>
        <div className="stack" style={{ gap: 12, maxHeight: '70vh', overflow: 'auto' }}>
          {selected && <ShotCard shot={selected} />}
          {map && <ShotMapDiagram map={map} showAscii={false} />}
        </div>
      </Modal>
    </div>
  );
}
