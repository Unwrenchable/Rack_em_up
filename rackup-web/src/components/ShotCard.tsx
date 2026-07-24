import { useEffect, useMemo, useState } from 'react';
import type { CatalogShot, SotdShotMap } from '../lib/types';
import { fetchSotdMap } from '../lib/api';
import { ShotMapDiagram } from './ShotMapDiagram';
import {
  cueAfterPlain,
  speedPlain,
  tipZonePlain,
  type TableSize,
} from '../lib/shot-map-geometry';

/** Clock-face tip guide — visual only, plain language beside it. */
const TIP_SHORT: Record<string, string> = {
  center: 'Center ball',
  '12-high': 'High (follow)',
  '6-low': 'Low (draw)',
  '3-right': 'Right english',
  '9-left': 'Left english',
  '1:30-high-right': 'High-right',
  '10:30-high-left': 'High-left',
  '4:30-low-right': 'Low-right',
  '7:30-low-left': 'Low-left',
};

export function ShotCard({
  shot,
  meta,
}: {
  shot: CatalogShot;
  meta?: { date?: string; daysUntilRepeat?: number; cycleLength?: number };
}) {
  const [map, setMap] = useState<SotdShotMap | null>(null);
  const [tableSize, setTableSize] = useState<TableSize>(() => {
    try {
      const saved = localStorage.getItem('rackup_sotd_table');
      if (saved === '7ft' || saved === '9ft') return saved;
    } catch {
      /* ignore */
    }
    return '9ft';
  });

  useEffect(() => {
    let cancelled = false;
    fetchSotdMap(shot.id).then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, [shot.id]);

  useEffect(() => {
    try {
      localStorage.setItem('rackup_sotd_table', tableSize);
    } catch {
      /* ignore */
    }
  }, [tableSize]);

  const aimLine = useMemo(() => buildAimLine(shot), [shot]);
  const spinLine = useMemo(() => {
    const tip = tipZonePlain(shot.tipZone);
    const eng = shot.english?.trim();
    if (eng && !/^none\.?$/i.test(eng)) return `${tip}. ${eng}`;
    return `${tip}. ${shot.tipDetail}`;
  }, [shot]);
  const speedLine = useMemo(
    () => speedPlain(shot.speed, shot.speedDetail),
    [shot.speed, shot.speedDetail],
  );
  const afterLine = useMemo(
    () => cueAfterPlain(shot.tipZone, shot.category),
    [shot.tipZone, shot.category],
  );
  const whyLines = shot.tips?.length ? shot.tips : [shot.successLooksLike];

  return (
    <article className="card card-glow stack sotd-card" style={{ gap: 16 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span className="chip chip-live">Shot of the Day</span>
        <span className="chip chip-gold">{shot.difficulty}</span>
        <span className="chip">{humanCategory(shot.category)}</span>
      </div>

      <div>
        <h2 className="h2" style={{ fontSize: '1.45rem' }}>
          {shot.name}
        </h2>
        <p className="muted" style={{ marginTop: 4 }}>
          {shot.tagline}
        </p>
        {meta?.date && (
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: 6 }}>
            {meta.date}
            {meta.daysUntilRepeat != null
              ? ` · fresh for ${meta.daysUntilRepeat} more day${meta.daysUntilRepeat === 1 ? '' : 's'}`
              : ''}
          </p>
        )}
      </div>

      {/* A. Realistic table diagram + table size toggle */}
      <div className="stack" style={{ gap: 10 }}>
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div className="field-label" style={{ margin: 0 }}>
            Table diagram
          </div>
          <div className="table-size-toggle" role="group" aria-label="Table size">
            <button
              type="button"
              className={`btn btn-sm${tableSize === '7ft' ? ' btn-primary' : ' btn-ghost'}`}
              aria-pressed={tableSize === '7ft'}
              onClick={() => setTableSize('7ft')}
            >
              7-ft barbox
            </button>
            <button
              type="button"
              className={`btn btn-sm${tableSize === '9ft' ? ' btn-primary' : ' btn-ghost'}`}
              aria-pressed={tableSize === '9ft'}
              onClick={() => setTableSize('9ft')}
            >
              9-ft tournament
            </button>
          </div>
        </div>

        {map ? (
          <ShotMapDiagram map={map} tableSize={tableSize} />
        ) : (
          <div className="banner banner-info" style={{ margin: 0 }}>
            Loading table diagram…
          </div>
        )}

        <p className="muted" style={{ fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
          Follow the gold tokens in order — that&apos;s the shot pattern.
          {tableSize === '7ft' ? ' Scaled for a 7-foot barbox.' : ' Scaled for a 9-foot tournament table.'}
        </p>
      </div>

      {/* Cue tip visual + spin */}
      <div className="cue-ball-guide">
        <div className="cue-ball-face" aria-hidden>
          <span className="cue-dot n">↑</span>
          <span className="cue-dot e">R</span>
          <span className="cue-dot s">↓</span>
          <span className="cue-dot w">L</span>
          <span className={`cue-hit tip-${shot.tipZone.replace(/[:.]/g, '-')}`} />
        </div>
        <div className="stack" style={{ gap: 8, flex: 1 }}>
          <div>
            <div className="field-label">Where to hit the cue ball</div>
            <div style={{ fontWeight: 600 }}>{TIP_SHORT[shot.tipZone] ?? tipZonePlain(shot.tipZone)}</div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {shot.tipDetail}
            </div>
          </div>
          {shot.elevation && !/^level\.?$/i.test(shot.elevation.trim()) && (
            <div className="muted" style={{ fontSize: '0.82rem' }}>
              Cue angle: {shot.elevation}
            </div>
          )}
        </div>
      </div>

      {/* B. Human-readable shot explanation */}
      <div className="sotd-coach stack" style={{ gap: 12 }}>
        <CoachBlock title="Where to aim" body={aimLine} />
        <CoachBlock title="What spin to use" body={spinLine} />
        <CoachBlock title="What speed to hit" body={speedLine} />
        <CoachBlock title="What the cue ball will do" body={afterLine} />

        <div>
          <div className="field-label">Setup on the table</div>
          <ul className="shot-list">
            {shot.setup.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="field-label">Stroke</div>
          <ol className="shot-list numbered">
            {shot.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="sotd-why">
          <div className="field-label">Why this works</div>
          <ul className="shot-list">
            {whyLines.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <div className="sotd-mistakes">
          <div className="field-label">Common mistakes</div>
          <ul className="shot-list">
            {shot.commonMistakes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="banner banner-info" style={{ margin: 0 }}>
        <strong style={{ color: 'var(--gold)' }}>Success looks like: </strong>
        {shot.successLooksLike}
      </div>

      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        <span className="chip">Pocket: {shot.pocket}</span>
        <span className="chip">Bridge: {shot.bridge}</span>
        <span className="chip">{tableSize === '7ft' ? '7-foot barbox' : '9-foot tournament'}</span>
      </div>
    </article>
  );
}

function CoachBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="sotd-coach-block">
      <div className="field-label">{title}</div>
      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.45 }}>{body}</p>
    </div>
  );
}

function humanCategory(cat: string): string {
  const map: Record<string, string> = {
    bank: 'Bank',
    combo: 'Combo',
    curve: 'Curve',
    jump: 'Jump',
    masse: 'Massé',
    kick: 'Kick',
    carom: 'Carom',
    novelty: 'Showpiece',
    position: 'Position',
  };
  return map[cat.toLowerCase()] ?? cat;
}

function buildAimLine(shot: CatalogShot): string {
  const pocket = shot.pocket?.replace(/\.$/, '') || 'the intended pocket';
  const ob = shot.objectBall?.replace(/\.$/, '') || 'the object ball';
  // Prefer first setup line that mentions aim/pocket if present
  const aimHint = shot.steps.find((s) => /aim|line|center|ghost|diamond|rail/i.test(s));
  if (aimHint) {
    return `${aimHint} Target: ${pocket}. Object: ${ob}.`;
  }
  return `Line up so the white cue ball sends ${ob} toward ${pocket}. Follow the numbered gold tokens on the diagram for the full pattern.`;
}
