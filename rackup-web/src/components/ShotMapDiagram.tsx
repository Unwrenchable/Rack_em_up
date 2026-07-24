import type { SotdShotMap } from '../lib/types';

type Props = {
  map: SotdShotMap;
  /** Show monospaced ASCII table under the SVG (default true). */
  showAscii?: boolean;
};

const W = 320;
const H = 160;

function sx(x: number) {
  return (x / 100) * (W - 16) + 8;
}
function sy(y: number) {
  // y=0 bottom → SVG y grows down, so invert
  return H - 8 - (y / 50) * (H - 16);
}

/**
 * Visual SOTD map: SVG table layout + optional ASCII diagram.
 * Works fully offline from catalog_fallback maps.
 */
export function ShotMapDiagram({ map, showAscii = true }: Props) {
  let d = '';
  map.intended_path.forEach((seg, i) => {
    if (i === 0) {
      d += `M ${sx(seg.from.x)} ${sy(seg.from.y)} L ${sx(seg.to.x)} ${sy(seg.to.y)} `;
    } else {
      d += `L ${sx(seg.to.x)} ${sy(seg.to.y)} `;
    }
  });

  return (
    <div className="stack" style={{ gap: 10 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{
          maxWidth: 420,
          background: 'var(--surface-2, #1a1a1e)',
          borderRadius: 12,
          border: '1px solid var(--border, #333)',
        }}
        role="img"
        aria-label={`Table diagram for ${map.name}`}
      >
        {/* rails */}
        <rect x={4} y={4} width={W - 8} height={H - 8} rx={6} fill="#0d3b1e" stroke="#c9a227" strokeWidth={3} />
        {/* pockets */}
        {[
          [8, 8],
          [W / 2, 6],
          [W - 8, 8],
          [8, H - 8],
          [W / 2, H - 6],
          [W - 8, H - 8],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={5} fill="#0a0a0a" />
        ))}

        {/* intended path */}
        <path d={d} fill="none" stroke="#f0d78c" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.9} />

        {/* object balls */}
        {map.object_ball_positions.map((b) => (
          <g key={`${b.ballId}-${b.x}-${b.y}`}>
            <circle
              cx={sx(b.x)}
              cy={sy(b.y)}
              r={7}
              fill={b.role === 'blocker' ? '#666' : '#e8e8e8'}
              stroke="#222"
              strokeWidth={1}
            />
            <text
              x={sx(b.x)}
              y={sy(b.y) + 3}
              textAnchor="middle"
              fontSize={8}
              fill="#111"
              fontWeight={700}
            >
              {b.role === 'blocker' ? 'X' : b.ballId}
            </text>
          </g>
        ))}

        {/* cue ball */}
        <circle
          cx={sx(map.cue_ball_start.x)}
          cy={sy(map.cue_ball_start.y)}
          r={7}
          fill="#fff"
          stroke="#c9a227"
          strokeWidth={2}
        />
        <text
          x={sx(map.cue_ball_start.x)}
          y={sy(map.cue_ball_start.y) + 3}
          textAnchor="middle"
          fontSize={7}
          fill="#333"
          fontWeight={700}
        >
          C
        </text>

        {/* pocket target ring */}
        <circle
          cx={sx(map.pocket_target.x)}
          cy={sy(map.pocket_target.y)}
          r={8}
          fill="none"
          stroke="#5ad4a0"
          strokeWidth={1.5}
          opacity={0.8}
        />
      </svg>

      {showAscii && map.ascii_table && (
        <pre
          className="shot-map-ascii"
          style={{
            margin: 0,
            padding: 12,
            fontSize: 10,
            lineHeight: 1.15,
            overflow: 'auto',
            background: 'var(--surface-2, #121214)',
            borderRadius: 8,
            border: '1px solid var(--border, #333)',
            color: 'var(--muted, #bbb)',
          }}
        >
          {map.ascii_table}
        </pre>
      )}
    </div>
  );
}
