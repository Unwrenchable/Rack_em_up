import { useId, useMemo } from 'react';
import type { SotdShotMap } from '../lib/types';
import { CUE_BALL_STYLE, poolBallStyle } from '../lib/pool-ball-colors';
import { deriveShotGeometry, type DrillMarker, type DrillMarkerShape, type TableSize } from '../lib/shot-map-geometry';
import {
  buildTableGeometry,
  nearestPocket,
  type Pt,
  type TableGeometry,
} from '../lib/table-geometry';

type Props = {
  map: SotdShotMap;
  tableSize?: TableSize;
  className?: string;
  /** Show sequence markers only when geometry provides them (multi-step drills). */
  showMarkers?: boolean;
};

/**
 * Instructor-grade SOTD table diagram.
 * Diamonds from pocket-center spans L/S; trapezoid pocket mouths; three paths always.
 */
export function ShotMapDiagram({ map, tableSize = '9ft', className, showMarkers = true }: Props) {
  const uid = useId().replace(/:/g, '');
  const geo = useMemo(() => deriveShotGeometry(map), [map]);
  const table = useMemo(() => buildTableGeometry(tableSize), [tableSize]);

  const RAIL = table.railThickness;
  const { length: CL, width: CW } = table.cloth;
  const VB_W = CL + RAIL * 2;
  const VB_H = CW + RAIL * 2;
  // 9ft fills the card; 7ft is proportionally smaller (still 2:1 viewBox)
  const maxWidth = Math.round(580 * table.displayScale);

  /** Cloth → SVG (y inverted for top-down view with y=0 at near rail). */
  const sx = (x: number) => RAIL + x;
  const sy = (y: number) => RAIL + (CW - y);

  const poly = (pts: Pt[]) => pts.map((p) => `${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(' ');

  const pathD = (pts: Pt[]) => {
    if (!pts.length) return '';
    return pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`)
      .join(' ');
  };

  const ballR = table.ballRadius;
  const obColor = poolBallStyle(geo.primaryObject.ballId).fill;
  const targetPk = nearestPocket(table, map.pocket_target);

  const clothClip = `cloth-${uid}`;
  const feltGrad = `felt-${uid}`;
  const woodGrad = `wood-${uid}`;

  // Diamonds on rail wood at real cushion-nose offset (~3-11/16"), not an arbitrary fraction of rail
  const diamondOnRail = (p: Pt, edge: 'near' | 'far' | 'head' | 'foot') => {
    const inset = table.diamondRailInset;
    if (edge === 'near') return { x: sx(p.x), y: RAIL - inset };
    if (edge === 'far') return { x: sx(p.x), y: RAIL + CW + inset };
    if (edge === 'head') return { x: RAIL - inset, y: sy(p.y) };
    return { x: RAIL + CL + inset, y: sy(p.y) };
  };

  // Diamond mark size ~ physical spacing (readable); scales with table
  const diamondR = Math.max(0.45, (table.physical.diamondSpacingLong / table.physical.length) * CL * 0.09);

  return (
    <div className={className} style={{ width: '100%' }}>
      <div
        style={{
          // Center a smaller 7ft table so the size change is obvious and proportional
          maxWidth: 580,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        role="img"
        aria-label={`${tableSize === '7ft' ? '7-foot' : '9-foot'} pool table diagram for ${map.name}`}
        style={{
          display: 'block',
          maxWidth,
          width: '100%',
          borderRadius: 14,
          background: '#1a1410',
          // Preserve 2:1 aspect from viewBox; browser keeps ratio via width+viewBox
          aspectRatio: `${VB_W} / ${VB_H}`,
          height: 'auto',
          transition: 'max-width 0.25s ease',
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
            <rect x={RAIL} y={RAIL} width={CL} height={CW} rx={0.8} />
          </clipPath>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.55" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer wood */}
        <rect
          x={0.35}
          y={0.35}
          width={VB_W - 0.7}
          height={VB_H - 0.7}
          rx={3}
          fill={`url(#${woodGrad})`}
          stroke="#c9a227"
          strokeWidth={0.4}
        />

        {/* Cushion band */}
        <rect
          x={RAIL - 1.5}
          y={RAIL - 1.5}
          width={CL + 3}
          height={CW + 3}
          rx={1.4}
          fill="#0d3d22"
          stroke="#1a5c34"
          strokeWidth={0.3}
        />

        {/* Cloth */}
        <rect x={RAIL} y={RAIL} width={CL} height={CW} rx={0.8} fill={`url(#${feltGrad})`} />

        {/* Head string + foot spot (quiet) */}
        <g clipPath={`url(#${clothClip})`} opacity={0.18}>
          <line
            x1={sx(table.headStringX)}
            y1={sy(0)}
            x2={sx(table.headStringX)}
            y2={sy(CW)}
            stroke="#9fd4b0"
            strokeWidth={0.22}
            strokeDasharray="1 1.1"
          />
          <circle cx={sx(table.footSpot.x)} cy={sy(table.footSpot.y)} r={0.5} fill="#9fd4b0" />
        </g>

        {/* Rail diamonds — WPA: long = n/8 (skip side pocket), short = n/4 */}
        {table.diamonds.longNear.map((p, i) => {
          const d = diamondOnRail(p, 'near');
          return <DiamondMark key={`ln-${i}`} cx={d.x} cy={d.y} r={diamondR} />;
        })}
        {table.diamonds.longFar.map((p, i) => {
          const d = diamondOnRail(p, 'far');
          return <DiamondMark key={`lf-${i}`} cx={d.x} cy={d.y} r={diamondR} />;
        })}
        {table.diamonds.shortHead.map((p, i) => {
          const d = diamondOnRail(p, 'head');
          return <DiamondMark key={`sh-${i}`} cx={d.x} cy={d.y} r={diamondR} />;
        })}
        {table.diamonds.shortFoot.map((p, i) => {
          const d = diamondOnRail(p, 'foot');
          return <DiamondMark key={`sf-${i}`} cx={d.x} cy={d.y} r={diamondR} />;
        })}

        {/* Pocket mouths — trapezoids with jaws + shelf (drawn over rails / cloth edge) */}
        {table.pockets.map((pk) => (
          <g key={pk.id}>
            <polygon
              points={poly(pk.mouthPolygon)}
              fill="#050505"
              stroke="#1a1008"
              strokeWidth={0.25}
              strokeLinejoin="round"
            />
            {/* Mouth lip highlight on cloth edge */}
            <circle
              cx={sx(pk.center.x)}
              cy={sy(pk.center.y)}
              r={pk.kind === 'corner' ? pk.mouthWidth * 0.22 : pk.mouthWidth * 0.18}
              fill="#0a0a0a"
              opacity={0.85}
            />
          </g>
        ))}

        {/* Target pocket emphasis */}
        <circle
          cx={sx(targetPk.center.x)}
          cy={sy(targetPk.center.y)}
          r={targetPk.mouthWidth * 0.42}
          fill="none"
          stroke="#5ad4a0"
          strokeWidth={0.5}
          opacity={0.9}
          filter={`url(#glow-${uid})`}
        />

        <g clipPath={`url(#${clothClip})`}>
          {/* Ghost ball when cut needs it */}
          {geo.showGhost && geo.ghostBall && (
            <circle
              cx={sx(geo.ghostBall.x)}
              cy={sy(geo.ghostBall.y)}
              r={ballR}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={0.32}
              strokeDasharray="0.75 0.65"
            />
          )}

          {geo.showTangent && geo.tangent && (
            <line
              x1={sx(geo.tangent.from.x)}
              y1={sy(geo.tangent.from.y)}
              x2={sx(geo.tangent.to.x)}
              y2={sy(geo.tangent.to.y)}
              stroke="rgba(255,220,120,0.4)"
              strokeWidth={0.32}
              strokeDasharray="1.1 0.85"
            />
          )}

          {/* 1) OB → pocket (colored, shows cut) */}
          <PathWithArrow
            pts={geo.objectPath}
            d={pathD(geo.objectPath)}
            color={obColor}
            width={0.95}
            sx={sx}
            sy={sy}
            solid
          />

          {/* 2) CB → OB */}
          <PathWithArrow
            pts={geo.cueApproach}
            d={pathD(geo.cueApproach)}
            color="#f5f0e6"
            width={1.05}
            sx={sx}
            sy={sy}
            solid
          />

          {/* 3) CB post-contact — always drawn */}
          <PathWithArrow
            pts={geo.cueAfter}
            d={pathD(geo.cueAfter)}
            color="rgba(245,240,230,0.65)"
            width={0.72}
            sx={sx}
            sy={sy}
            solid={false}
          />
          {geo.cueAfter.length >= 2 && (
            <circle
              cx={sx(geo.cueAfter[geo.cueAfter.length - 1].x)}
              cy={sy(geo.cueAfter[geo.cueAfter.length - 1].y)}
              r={ballR * 0.9}
              fill="none"
              stroke="rgba(245,240,230,0.45)"
              strokeWidth={0.28}
              strokeDasharray="0.55 0.45"
            />
          )}

          {/* Balls */}
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
                r={ballR}
                ballId={b.ballId}
                dim={b.role === 'blocker' || b.role === 'prop'}
              />
            );
          })}
          <Ball
            x={sx(geo.primaryObject.x)}
            y={sy(geo.primaryObject.y)}
            r={ballR}
            ballId={geo.primaryObject.ballId}
          />

          {/* Cue — always white, no letter */}
          <g>
            <circle
              cx={sx(map.cue_ball_start.x)}
              cy={sy(map.cue_ball_start.y)}
              r={ballR}
              fill={CUE_BALL_STYLE.fill}
              stroke={CUE_BALL_STYLE.stroke}
              strokeWidth={0.32}
            />
            <circle
              cx={sx(map.cue_ball_start.x) - ballR * 0.28}
              cy={sy(map.cue_ball_start.y) - ballR * 0.28}
              r={ballR * 0.26}
              fill="rgba(255,255,255,0.55)"
            />
          </g>

          {/* Optional multi-step training markers (not gold card tokens) */}
          {showMarkers &&
            geo.markers.map((mk) => (
              <TrainingMarker key={`m-${mk.n}`} marker={mk} sx={sx} sy={sy} r={ballR * 0.85} />
            ))}
        </g>
      </svg>
      </div>
      <p
        className="muted"
        style={{
          textAlign: 'center',
          fontSize: '0.72rem',
          marginTop: 6,
          opacity: 0.85,
        }}
      >
        {tableSize === '7ft'
          ? `7-ft barbox · cloth ~${table.physical.width}″×${table.physical.length}″ · diamonds ~${table.physical.diamondSpacingLong.toFixed(1)}″`
          : `9-ft tournament · cloth ${table.physical.width}″×${table.physical.length}″ · diamonds ${table.physical.diamondSpacingLong}″`}
      </p>
    </div>
  );
}

function DiamondMark({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // Small diamond shape on the rail (aiming diamond, not a drill token)
  const pts = [
    [cx, cy - r],
    [cx + r * 0.7, cy],
    [cx, cy + r],
    [cx - r * 0.7, cy],
  ]
    .map((p) => p.join(','))
    .join(' ');
  return <polygon points={pts} fill="#e8d5a3" opacity={0.95} stroke="#5c3a1e" strokeWidth={0.12} />;
}

function PathWithArrow({
  pts,
  d,
  color,
  width,
  sx,
  sy,
  solid,
}: {
  pts: Pt[];
  d: string;
  color: string;
  width: number;
  sx: (x: number) => number;
  sy: (y: number) => number;
  solid: boolean;
}) {
  if (pts.length < 2 || !d) return null;
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={solid ? undefined : '1.35 0.95'}
        opacity={0.95}
      />
      <ArrowHead from={pts[pts.length - 2]} to={pts[pts.length - 1]} color={color} sx={sx} sy={sy} />
    </>
  );
}

function ArrowHead({
  from,
  to,
  color,
  sx,
  sy,
  size = 2.3,
}: {
  from: Pt;
  to: Pt;
  color: string;
  sx: (x: number) => number;
  sy: (y: number) => number;
  size?: number;
}) {
  const fx = sx(from.x);
  const fy = sy(from.y);
  const tx = sx(to.x);
  const ty = sy(to.y);
  const angle = Math.atan2(ty - fy, tx - fx);
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  return (
    <polygon
      points={`${tx} ${ty} ${tx + Math.cos(a1) * size} ${ty + Math.sin(a1) * size} ${tx + Math.cos(a2) * size} ${ty + Math.sin(a2) * size}`}
      fill={color}
      opacity={0.95}
    />
  );
}

function TrainingMarker({
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
  // Cool slate/mint — not gold “card” chips
  const fill = '#c5d4e0';
  const stroke = '#1a2430';
  return (
    <g opacity={0.9}>
      <MarkerShape shape={marker.shape} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} />
      <text
        x={cx}
        y={cy + r * 0.32}
        textAnchor="middle"
        fontSize={r * 0.9}
        fontWeight={800}
        fill={stroke}
        fontFamily="system-ui, sans-serif"
      >
        {marker.n}
      </text>
    </g>
  );
}

function MarkerShape({
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
  const sw = 0.28;
  if (shape === 'triangle') {
    const pts = [
      [cx, cy - r],
      [cx + r * 0.9, cy + r * 0.75],
      [cx - r * 0.9, cy + r * 0.75],
    ]
      .map((p) => p.join(','))
      .join(' ');
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
  if (shape === 'star') {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = (Math.PI * i) / 5 - Math.PI / 2;
      pts.push(`${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`);
    }
    return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
  if (shape === 'diamond') {
    const pts = [
      [cx, cy - r],
      [cx + r * 0.8, cy],
      [cx, cy + r],
      [cx - r * 0.8, cy],
    ]
      .map((p) => p.join(','))
      .join(' ');
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />;
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
  const num = ballId >= 1 && ballId <= 15 ? String(ballId) : '';
  return (
    <g opacity={dim ? 0.55 : 1}>
      <circle cx={x} cy={y} r={r} fill={style.fill} stroke={style.stroke} strokeWidth={0.26} />
      {style.stripe && <ellipse cx={x} cy={y} rx={r * 0.95} ry={r * 0.38} fill="#f4f4f4" />}
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
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.2} fill="rgba(255,255,255,0.35)" />
    </g>
  );
}

// Re-export geometry builder for tests / other renderers
export type { TableGeometry };
