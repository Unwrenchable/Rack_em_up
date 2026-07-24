import { useEffect, useState } from 'react';
import type { CatalogShot, SotdShotMap } from '../lib/types';
import { fetchSotdMap } from '../lib/api';
import { ShotMapDiagram } from './ShotMapDiagram';
import { ShotMapTable } from './ShotMapTable';

const TIP_LABEL: Record<string, string> = {
  center: '● Center',
  '12-high': '↑ 12 high (follow)',
  '6-low': '↓ 6 low (draw)',
  '3-right': '→ 3 right',
  '9-left': '← 9 left',
  '1:30-high-right': '↗ High-right',
  '10:30-high-left': '↖ High-left',
  '4:30-low-right': '↘ Low-right',
  '7:30-low-left': '↙ Low-left',
};

export function ShotCard({
  shot,
  meta,
}: {
  shot: CatalogShot;
  meta?: { date?: string; daysUntilRepeat?: number; cycleLength?: number };
}) {
  const [map, setMap] = useState<SotdShotMap | null>(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSotdMap(shot.id).then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, [shot.id]);

  return (
    <article className="card card-glow stack" style={{ gap: 14 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span className="chip chip-live">Shot of the Day</span>
        <span className={`chip chip-gold`}>{shot.difficulty}</span>
        <span className="chip">{shot.category}</span>
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
            {meta.cycleLength != null && meta.daysUntilRepeat != null
              ? ` · no repeat for ${meta.daysUntilRepeat}d (cycle ${meta.cycleLength})`
              : ''}
          </p>
        )}
      </div>

      <div className="cue-ball-guide">
        <div className="cue-ball-face" aria-hidden>
          <span className="cue-dot n">12</span>
          <span className="cue-dot e">3</span>
          <span className="cue-dot s">6</span>
          <span className="cue-dot w">9</span>
          <span className={`cue-hit tip-${shot.tipZone.replace(/[:.]/g, '-')}`} />
        </div>
        <div className="stack" style={{ gap: 6, flex: 1 }}>
          <div>
            <div className="field-label">Cue ball contact</div>
            <div style={{ fontWeight: 600 }}>{TIP_LABEL[shot.tipZone] ?? shot.tipZone}</div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {shot.tipDetail}
            </div>
          </div>
          <div className="grid-2" style={{ gap: 8 }}>
            <div className="stat-tile" style={{ padding: 10 }}>
              <div className="label">Speed</div>
              <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{shot.speed}</div>
              <div className="muted" style={{ fontSize: '0.75rem' }}>
                {shot.speedDetail}
              </div>
            </div>
            <div className="stat-tile" style={{ padding: 10 }}>
              <div className="label">English</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{shot.english}</div>
              <div className="muted" style={{ fontSize: '0.75rem' }}>
                {shot.elevation}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="field-label">Setup</div>
        <ul className="shot-list">
          {shot.setup.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <span className="chip">OB: {shot.objectBall}</span>
        <span className="chip">Pocket: {shot.pocket}</span>
        <span className="chip">Bridge: {shot.bridge}</span>
      </div>

      <div>
        <div className="field-label">Stroke steps</div>
        <ol className="shot-list numbered">
          {shot.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="grid-2">
        <div>
          <div className="field-label">Tips</div>
          <ul className="shot-list">
            {shot.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="field-label">Common mistakes</div>
          <ul className="shot-list">
            {shot.commonMistakes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="banner banner-info">{shot.successLooksLike}</div>

      {map && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row-between">
            <div className="field-label" style={{ margin: 0 }}>
              Table map & path
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowMap((v) => !v)}
            >
              {showMap ? 'Hide map' : 'Show map'}
            </button>
          </div>
          {showMap && (
            <>
              <ShotMapDiagram map={map} />
              <ShotMapTable map={map} />
            </>
          )}
        </div>
      )}
    </article>
  );
}