import type { SotdShotMap } from '../lib/types';

type Props = {
  map: SotdShotMap;
};

/** Tabular breakdown of SOTD structured map fields (coords, english, path). */
export function ShotMapTable({ map }: Props) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <span className="chip chip-gold">Shot map</span>
        <span className="chip">{map.source === 'realai' ? 'RealAI' : 'Catalog fallback'}</span>
        {map.realaiReachable != null && (
          <span className={`chip${map.realaiReachable ? ' chip-live' : ' chip-quiet'}`}>
            RealAI {map.realaiReachable ? 'up' : 'offline'}
          </span>
        )}
      </div>

      <table className="shot-map-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <tbody>
          <Row label="Shot" value={`${map.id} · ${map.name}`} />
          <Row label="Difficulty" value={`${map.difficulty} (${map.difficulty_rating}/4)`} />
          <Row label="Category" value={map.category} />
          <Row label="Speed" value={map.speed_category} />
          <Row
            label="Cue ball start"
            value={`(${map.cue_ball_start.x}, ${map.cue_ball_start.y})`}
          />
          <Row
            label="Object balls"
            value={map.object_ball_positions
              .map(
                (b) =>
                  `#${b.ballId} (${b.x},${b.y})${b.role && b.role !== 'object' ? ` [${b.role}]` : ''}`,
              )
              .join(' · ')}
          />
          <Row
            label="English / spin"
            value={`${map.english.label} · tip ${map.english.tip_zone} · S ${map.english.sidespin} · B ${map.english.backspin} · F ${map.english.follow}`}
          />
          <Row
            label="Intended path"
            value={map.intended_path
              .map(
                (seg, i) =>
                  `${i + 1}: (${seg.from.x},${seg.from.y})→(${seg.to.x},${seg.to.y})`,
              )
              .join(' · ')}
          />
          <Row
            label="Landing zones"
            value={map.landing_zones
              .map((z) => `${z.label} (${z.x},${z.y})`)
              .join(' · ')}
          />
          <Row
            label="Pocket target"
            value={`(${map.pocket_target.x}, ${map.pocket_target.y})`}
          />
          <Row
            label="Coords"
            value={`${map.coordinate_system.units}`}
          />
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderTop: '1px solid var(--border, #333)' }}>
      <td
        style={{
          padding: '6px 8px',
          fontWeight: 600,
          color: 'var(--muted, #999)',
          width: '34%',
          verticalAlign: 'top',
        }}
      >
        {label}
      </td>
      <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>{value}</td>
    </tr>
  );
}
