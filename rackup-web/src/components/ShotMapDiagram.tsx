import { useId, useMemo } from 'react';
import type { SotdShotMap } from '../lib/types';
import { CUE_BALL_STYLE, poolBallStyle } from '../lib/pool-ball-colors';
import {
  deriveShotGeometry,
  type DrillMarker,
  type DrillMarkerShape,
  type TableSize,
} from '../lib/shot-map-geometry';

type Props = {
  map: SotdShotMap;
  /** 9-foot tournament (default) or 7-foot barbox. */
  tableSize?: TableSize;
  className?: string;
};

/** Normalized cloth: x 0–100 (head→foot), y 0–50 (near→far). */
const CLOTH_W = 100;
const CLOTH_H = 50;

function tableMetrics(size: TableSize) {
  // Barbox: thicker rails relative to cloth, larger balls/pockets, diamond positions still 3+2.
  if (size === '7ft') {
    return {
      rail: 6.2,
      ballR: 2.65,
      pocketR: 3.75,
      sidePocketR: 3.35,
      diamondR: 0.62,
      // Slightly tighter diamond spacing reads “shorter” table without breaking 2:1 cloth
      longDiamondXs: [22, 50, 78],
      shortDiamondYs: [50 / 3, (50 * 2) / 3],
      markerR: 2.35,
    };
  }
  return {
    rail: 5.5,
    ballR: 2.15,
    pocketR: 3.15,
    sidePocketR: 2.85,
    diamondR: 0.55,
    longDiamondXs: [25, 50, 75],
    shortDiamondYs: [50 / 3, (50 * 2) / 3],
    markerR: 2.05,
  };
}

/**
 * Instructor / drill-card style table diagram (original markers — not playing cards).
 * Self-explanatory: white cue, real OB colors, CB + OB paths, diamonds, sequence tokens.
 */
export function ShotMapDiagram({ map, tableSize = '9ft', className }: Props) {
  const uid = useId().replace(/:/g, '');
  const geo = useMemo(() => deriveShotGeometry(map), [map]);
  const m = tableMetrics(tableSize);

  const RAIL = m.rail;
  const VB_W = CLOTH_W + RAIL * 2;
  const VB_H = CLOTH_H + RAIL * 2;

  const sx = (x: number) => RAIL + x;
  const sy = (y: number) => RAIL + (CLOTH_H - y);

  const pointsToPath = (pts: { x: number; y: number }[]) => {
    if (!pts.length) return '';
    return pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`)
      .join(' ');
  };

  const obColor = poolBallStyle(geo.primaryObject.ballId).fill;
  const cuePathColor = '#f5f0e6';
  const cueAfterColor = 'rgba(245, 240, 230, 0.55)';

  const cueApproachPath = pointsToPath(geo.cueApproach);
  const objectPath = pointsToPath(geo.objectPath);
  const cueAfterPath = pointsToPath(geo.cueAfter);

  const clothClip = `cloth-${uid}`;
  const feltGrad = `felt-${uid}`;
  const woodGrad = `wood-${uid}`;

  return (
    <div className={className} style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        role="img"
        aria-label={`Pool table drill diagram for ${map.name}`}
        style={{
          display: 'block',
          maxWidth: 560,
          margin: '0 auto',
          borderRadius: 14,
          background: '#1a1410',
        }}
      >
        <defs>
          <linearGradient id={woodGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5c3a1e" />
            <stop offset="45%" stopColor="#3e2512" />
            <stop offset="100%" stopColor="#2a180c" />
          </linearGradient>
          <radialGradient id={feltGrad} cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#1a6b3c" />
            <stop offset="55%" stopColor="#0f4a28" />
            <stop offset="100%" stopColor="#0a3320" />
          </radialGradient>
          <clipPath id={clothClip}>
            <rect x={RAIL} y={RAIL} width={CLOTH_W} height={CLOTH_H} rx={1.2} />
          </clipPath>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer wood frame */}
        <rect
          x={0.4}
          y={0.4}
          width={VB_W - 0.8}
          height={VB_H - 0.8}
          rx={3.2}
          fill={`url(#${woodGrad})`}
          stroke="#c9a227"
          strokeWidth={0.45}
        />

        {/* Cushion band */}
        <rect
          x={RAIL - 1.6}
          y={RAIL - 1.6}
          width={CLOTH_W + 3.2}
          height={CLOTH_H + 3.2}
          rx={1.6}
          fill="#0d3d22"
          stroke="#1a5c34"
          strokeWidth={0.35}
        />

        {/* Cloth */}
        <rect
          x={RAIL}
          y={RAIL}
          width={CLOTH_W}
          height={CLOTH_H}
          rx={1.2}
          fill={`url(#${feltGrad})`}
        />

        {/* Quiet head-string + foot spot (no text) */}
        <g clipPath={`url(#${clothClip})`} opacity={0.2}>
          <line
            x1={sx(25)}
            y1={sy(0)}
            x2={sx(25)}
            y2={sy(50)}
            stroke="#9fd4b0"
            strokeWidth={0.2}
            strokeDasharray="1 1.2"
          />
          <circle cx={sx(75)} cy={sy(25)} r={0.55} fill="#9fd4b0" />
        </g>

        {/* Rail diamonds — 3 long, 2 short */}
        {m.longDiamondXs.map((x) => (
          <g key={`ld-${x}`}>
            <circle cx={sx(x)} cy={RAIL * 0.42} r={m.diamondR} fill="#e8d5a3" opacity={0.92} />
            <circle cx={sx(x)} cy={VB_H - RAIL * 0.42} r={m.diamondR} fill="#e8d5a3" opacity={0.92} />
          </g>
        ))}
        {m.shortDiamondYs.map((y) => (
          <g key={`sd-${y}`}>
            <circle cx={RAIL * 0.42} cy={sy(y)} r={m.diamondR} fill="#e8d5a3" opacity={0.92} />
            <circle cx={VB_W - RAIL * 0.42} cy={sy(y)} r={m.diamondR} fill="#e8d5a3" opacity={0.92} />
          </g>
        ))}

        {/* Pocket mouths */}
        {(
          [
            { cx: sx(0), cy: sy(0), r: m.pocketR },
            { cx: sx(0), cy: sy(50), r: m.pocketR },
            { cx: sx(100), cy: sy(0), r: m.pocketR },
            { cx: sx(100), cy: sy(50), r: m.pocketR },
            { cx: sx(50), cy: sy(0), r: m.sidePocketR },
            { cx: sx(50), cy: sy(50), r: m.sidePocketR },
          ] as const
        ).map((p, i) => (
          <g key={`pk-${i}`}>
            <circle cx={p.cx} cy={p.cy} r={p.r + 0.35} fill="#1a1008" />
            <circle cx={p.cx} cy={p.cy} r={p.r} fill="#050505" />
          </g>
        ))}

        {/* Target pocket glow */}
        <circle
          cx={sx(map.pocket_target.x)}
          cy={sy(map.pocket_target.y)}
          r={m.pocketR + 0.95}
          fill="none"
          stroke="#5ad4a0"
          strokeWidth={0.55}
          opacity={0.88}
          filter={`url(#glow-${uid})`}
        />

        <g clipPath={`url(#${clothClip})`}>
          {/* Ghost-ball aim ring (only when the cut needs it) */}
          {geo.showGhost && geo.ghostBall && (
            <circle
              cx={sx(geo.ghostBall.x)}
              cy={sy(geo.ghostBall.y)}
              r={m.ballR}
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={0.35}
              strokeDasharray="0.8 0.7"
            />
          )}

          {/* Tangent tick (stun cuts) */}
          {geo.showTangent && geo.tangent && (
            <line
              x1={sx(geo.tangent.from.x)}
              y1={sy(geo.tangent.from.y)}
              x2={sx(geo.tangent.to.x)}
              y2={sy(geo.tangent.to.y)}
              stroke="rgba(255,220,120,0.45)"
              strokeWidth={0.35}
              strokeDasharray="1.2 0.9"
            />
          )}

          {/* Object-ball path — color of the object ball */}
          {objectPath && (
            <>
              <path
                d={objectPath}
                fill="none"
                stroke={obColor}
                strokeWidth={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
              {geo.objectPath.length >= 2 && (
                <ArrowHead
                  sx={sx}
                  sy={sy}
                  from={geo.objectPath[geo.objectPath.length - 2]}
                  to={geo.objectPath[geo.objectPath.length - 1]}
                  color={obColor}
                  size={2.4}
                />
              )}
            </>
          )}

          {/* Cue approach — cream */}
          {cueApproachPath && (
            <>
              <path
                d={cueApproachPath}
                fill="none"
                stroke={cuePathColor}
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.96}
              />
              {geo.cueApproach.length >= 2 && (
                <ArrowHead
                  sx={sx}
                  sy={sy}
                  from={geo.cueApproach[geo.cueApproach.length - 2]}
                  to={geo.cueApproach[geo.cueApproach.length - 1]}
                  color={cuePathColor}
                  size={2.2}
                />
              )}
            </>
          )}

          {/* Cue after contact — soft dashed */}
          {cueAfterPath &&
            geo.cueAfter.length >= 2 &&
            distPts(geo.cueAfter[0], geo.cueAfter[geo.cueAfter.length - 1]) > 2 && (
              <>
                <path
                  d={cueAfterPath}
                  fill="none"
                  stroke={cueAfterColor}
                  strokeWidth={0.7}
                  strokeLinecap="round"
                  strokeDasharray="1.4 1"
                  opacity={0.9}
                />
                <ArrowHead
                  sx={sx}
                  sy={sy}
                  from={geo.cueAfter[geo.cueAfter.length - 2]}
                  to={geo.cueAfter[geo.cueAfter.length - 1]}
                  color="rgba(245, 240, 230, 0.7)"
                  size={1.8}
                />
                <circle
                  cx={sx(geo.cueAfter[geo.cueAfter.length - 1].x)}
                  cy={sy(geo.cueAfter[geo.cueAfter.length - 1].y)}
                  r={m.ballR * 0.85}
                  fill="none"
                  stroke="rgba(245,240,230,0.4)"
                  strokeWidth={0.3}
                  strokeDasharray="0.6 0.5"
                />
              </>
            )}

          {/* Secondary balls */}
          {map.object_ball_positions.map((b) => {
            const isPrimary =
              b.x === geo.primaryObject.x &&
              b.y === geo.primaryObject.y &&
              b.ballId === geo.primaryObject.ballId;
            if (isPrimary) return null;
            return (
              <Ball
                key={`b-${b.ballId}-${b.x}-${b.y}`}
                x={sx(b.x)}
                y={sy(b.y)}
                r={m.ballR}
                ballId={b.ballId}
                dim={b.role === 'blocker' || b.role === 'prop'}
              />
            );
          })}

          <Ball
            x={sx(geo.primaryObject.x)}
            y={sy(geo.primaryObject.y)}
            r={m.ballR}
            ballId={geo.primaryObject.ballId}
          />

          {/* Cue ball — always white, no letter labels */}
          <g>
            <circle
              cx={sx(map.cue_ball_start.x)}
              cy={sy(map.cue_ball_start.y)}
              r={m.ballR}
              fill={CUE_BALL_STYLE.fill}
              stroke={CUE_BALL_STYLE.stroke}
              strokeWidth={0.35}
            />
            <circle
              cx={sx(map.cue_ball_start.x) - m.ballR * 0.28}
              cy={sy(map.cue_ball_start.y) - m.ballR * 0.28}
              r={m.ballR * 0.28}
              fill="rgba(255,255,255,0.55)"
            />
          </g>

          {/* Original drill tokens — sequence pattern (not cards) */}
          {geo.markers.map((mk) => (
            <DrillToken key={`mk-${mk.n}`} marker={mk} sx={sx} sy={sy} r={m.markerR} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function ArrowHead({
  from,
  to,
  color,
  size = 2.2,
  sx,
  sy,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  size?: number;
  sx: (x: number) => number;
  sy: (y: number) => number;
}) {
  const fx = sx(from.x);
  const fy = sy(from.y);
  const tx = sx(to.x);
  const ty = sy(to.y);
  const angle = Math.atan2(ty - fy, tx - fx);
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  const p1 = `${tx + Math.cos(a1) * size} ${ty + Math.sin(a1) * size}`;
  const p2 = `${tx + Math.cos(a2) * size} ${ty + Math.sin(a2) * size}`;
  return <polygon points={`${tx} ${ty} ${p1} ${p2}`} fill={color} opacity={0.95} />;
}

function distPts(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Original RackUp drill token — numbered shape.
 * Inspired by “markers on a table” practice games; not a playing card.
 */
function DrillToken({
  marker,
  sx,
  sy,
  r,
}: {
  marker: DrillMarker;
  sx: (x: number) => number;
  sy: (y: number) => number;
  r: number;
}) {
  const cx = sx(marker.x);
  const cy = sy(marker.y);
  const fill = tokenFill(marker.n);
  const stroke = '#1a1408';

  return (
    <g>
      {/* Soft shadow */}
      <circle cx={cx + 0.25} cy={cy + 0.35} r={r * 1.05} fill="rgba(0,0,0,0.35)" />
      <TokenShape shape={marker.shape} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} />
      <text
        x={cx}
        y={cy + r * 0.32}
        textAnchor="middle"
        fontSize={r * 0.95}
        fontWeight={800}
        fill="#1a1408"
        fontFamily="system-ui, sans-serif"
      >
        {marker.n}
      </text>
    </g>
  );
}

function tokenFill(n: number): string {
  // Warm gold → amber progression (original palette, no suit colors as “cards”)
  const palette = ['#f0d78c', '#e8c46a', '#d4a84b', '#c9a227', '#b8922a', '#a67c1a'];
  return palette[(n - 1) % palette.length];
}

function TokenShape({
  shape,
  cx,
  cy,
  r,
  fill,
  stroke,
}: {
  shape: DrillMarkerShape;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
}) {
  const sw = 0.35;
  switch (shape) {
    case 'triangle': {
      const pts = [
        [cx, cy - r],
        [cx + r * 0.92, cy + r * 0.78],
        [cx - r * 0.92, cy + r * 0.78],
      ]
        .map((p) => p.join(','))
        .join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    case 'diamond': {
      const pts = [
        [cx, cy - r],
        [cx + r * 0.85, cy],
        [cx, cy + r],
        [cx - r * 0.85, cy],
      ]
        .map((p) => p.join(','))
        .join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    case 'hex': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
      }).join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    case 'chevron': {
      // Rounded square “tile” — original token, not a card
      return (
        <rect
          x={cx - r * 0.9}
          y={cy - r * 0.9}
          width={r * 1.8}
          height={r * 1.8}
          rx={r * 0.35}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
    }
    case 'star': {
      const pts = starPoints(cx, cy, r, r * 0.45, 5);
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    case 'disc':
    default:
      return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number, spikes: number) {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push(`${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`);
  }
  return pts.join(' ');
}

function Ball({
  x,
  y,
  r,
  ballId,
  dim = false,
}: {
  x: number;
  y: number;
  r: number;
  ballId: number;
  dim?: boolean;
}) {
  const style = poolBallStyle(ballId);
  const opacity = dim ? 0.55 : 1;
  const num = ballId >= 1 && ballId <= 15 ? String(ballId) : '';

  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r} fill={style.fill} stroke={style.stroke} strokeWidth={0.28} />
      {style.stripe && (
        <ellipse cx={x} cy={y} rx={r * 0.95} ry={r * 0.38} fill="#f4f4f4" opacity={0.95} />
      )}
      {num && (
        <>
          <circle cx={x} cy={y} r={r * 0.42} fill="#f7f7f7" />
          <text
            x={x}
            y={y + r * 0.18}
            textAnchor="middle"
            fontSize={r * 0.72}
            fontWeight={700}
            fill="#1a1a1a"
            fontFamily="system-ui, sans-serif"
          >
            {num}
          </text>
        </>
      )}
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.22} fill="rgba(255,255,255,0.35)" />
    </g>
  );
}
