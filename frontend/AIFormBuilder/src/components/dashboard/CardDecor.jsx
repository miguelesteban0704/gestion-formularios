/**
 * Premium corner motif — layered aurora fan.
 * - Keeps the single coherent quarter-fan (concentric rings) from the corner
 * - Adds a soft radial glow behind + refined opacity ramp for depth
 * - Subtle blur on the glow and a hairline highlight for a crafted feel
 *
 * SVG angle: 0°=right, 90°=down. Quarter fills up-left quadrant 180°→270°.
 */

import { accents } from "@/shared/styles/tokens";

const rad = (deg) => (deg * Math.PI) / 180;
const pt = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];

/** Concentric annular sectors with polished opacity ramp */
function Fan({ cx, cy, max, bands, from = 180, to = 270, color, base = 0.88, min = 0.24 }) {
  const step = max / bands;
  const out = [];
  for (let i = 0; i < bands; i++) {
    const ri = step * i;
    const ro = step * (i + 1);
    const [ax, ay] = pt(cx, cy, ri, from);
    const [bx, by] = pt(cx, cy, ro, from);
    const [ex, ey] = pt(cx, cy, ro, to);
    const [dx, dy] = pt(cx, cy, ri, to);
    const d =
      ri === 0
        ? `M ${cx} ${cy} L ${bx} ${by} A ${ro} ${ro} 0 0 1 ${ex} ${ey} Z`
        : `M ${ax} ${ay} L ${bx} ${by} A ${ro} ${ro} 0 0 1 ${ex} ${ey} L ${dx} ${dy} A ${ri} ${ri} 0 0 0 ${ax} ${ay} Z`;
    const t = bands > 1 ? i / (bands - 1) : 0;
    // ease-out ramp: outer bands fade faster for a feathered edge
    const eased = Math.pow(t, 0.9);
    const opacity = base - eased * (base - min);
    out.push(<path key={i} d={d} fill={color} opacity={opacity} />);
  }
  return <g>{out}</g>;
}

const SHAPES = {
  a: { bands: 5, max: 118 },
  b: { bands: 6, max: 132 },
  c: { bands: 4, max: 106 },
  d: { bands: 5, max: 122 },
  e: { bands: 7, max: 138 },
};

export function CardDecor({ variant = "a", color = accents.gold, className }) {
  // El color entra por `color` en el <svg> y los trazados lo leen con
  // currentColor en vez de recibirlo en atributos de presentación. Motivo: los
  // atributos de presentación (fill, stroke, stopColor) no resuelven var(), así
  // que con esta forma el decorado admite un token —"var(--color-brand-600)"—
  // y así el adorno de la card sigue al acento igual que el resto.
  const svg = { className, viewBox: "0 0 170 170", width: "170", height: "170", style: { color } };
  const C = 170;
  const isHero = variant === "hero";
  const safe = color.replace(/[^a-zA-Z0-9]/g, "");
  const gid = `dec-${variant}-${safe}`;

  if (isHero) {
    return (
      <svg {...svg} aria-hidden="true">
        <defs>
          <radialGradient id={`${gid}-glow`} cx="100%" cy="100%" r="100%" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${gid}-blur`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        {/* ambient orb */}
        <circle cx={C} cy={C} r={126} fill={`url(#${gid}-glow)`} style={{ filter: `url(#${gid}-blur)` }} />
        {/* premium fan in pearlescent white */}
        <Fan cx={C} cy={C} max={126} bands={6} color="#ffffff" base={0.24} min={0.04} />
        {/* inner highlight ring */}
        <path
          d={`M ${C - 42} ${C} A 42 42 0 0 1 ${C} ${C - 42}`}
          fill="none"
          stroke="white"
          strokeWidth="1.25"
          opacity="0.14"
        />
      </svg>
    );
  }

  const { bands, max } = SHAPES[variant] || SHAPES.a;
  return (
    <svg {...svg} aria-hidden="true">
      <defs>
        <radialGradient id={`${gid}-glow`} cx="100%" cy="100%" r="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
          <stop offset="52%" stopColor="currentColor" stopOpacity="0.07" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <filter id={`${gid}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        {/* subtle grain via feTurbulence for tactility (very low) */}
        <filter id={`${gid}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
      </defs>

      {/* soft radial glow behind the fan — gives air */}
      <circle cx={C} cy={C} r={max} fill={`url(#${gid}-glow)`} style={{ filter: `url(#${gid}-blur)` }} />

      {/* layered fan with refined ramp */}
      <Fan cx={C} cy={C} max={max} bands={bands} color="currentColor" />

      {/* delicate inner highlight — sells the premium etched feel */}
      <path
        d={`M ${C - max * 0.36} ${C} A ${max * 0.36} ${max * 0.36} 0 0 1 ${C} ${C - max * 0.36}`}
        fill="none"
        stroke="white"
        strokeWidth="1.1"
        opacity="0.10"
      />
      {/* outer feathered edge */}
      <path
        d={`M ${C} ${C - max} A ${max} ${max} 0 0 1 ${C - 0.2} ${C - max + 0.2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.08"
      />
    </svg>
  );
}
