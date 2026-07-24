import { useEffect, useMemo, useState } from 'react';
import { fetchShotCatalog } from '../lib/api';
import type { CatalogShot } from '../lib/types';
import { ShotCard } from '../components/ShotCard';
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
        <p className="eyebrow">Training catalog</p>
        <h1 className="h1" style={{ fontSize: '2.2rem' }}>
          Shots
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {total} drills · filter by feel and style
        </p>
      </header>

      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <select
          className="input"
          style={{ maxWidth: 160 }}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          aria-label="Difficulty"
        >
          <option value="">All difficulties</option>
          {DIFFS.filter(Boolean).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className="input"
          style={{ maxWidth: 160 }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {CATS.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {pageShots.map((s) => (
          <article key={s.id} className="card row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <span className="chip chip-gold">{s.difficulty}</span>
                <span className="chip">{s.category}</span>
              </div>
              <h3 style={{ fontWeight: 700, marginTop: 8 }}>{s.name}</h3>
              <p className="muted" style={{ fontSize: '0.88rem', marginTop: 4 }}>
                {s.tagline}
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(s)}>
              Open
            </button>
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
        </div>
      </Modal>
    </div>
  );
}
