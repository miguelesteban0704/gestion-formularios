import { hexToRgba, shade } from "../../lib/utils.js";

/**
 * Premium artisanal gradient tile grid for the public form's right pane.
 * A packed grid of refined geometric tiles — rounded squares, soft circles,
 * half-discs, ring accents and quarter-circle "leaf" shapes — each tinted
 * from a sophisticated tonal ramp of the form's accent color.
 *
 * The variant (from the theme) shifts the layout and shape mix so each
 * theme reads differently while staying premium and cohesive.
 *
 * Extra details that elevate the premium feel:
 *  - Larger tile units + rounded corners for a softer, luxurious look.
 *  - Subtle inner stroke + shadow per shape for depth.
 *  - Gentle gradient overlay on the whole canvas.
 *  - Hover micro-interaction (tilt + scale) on capable surfaces.
 */

const UNIT = 120; // tile unit in viewBox coords

// Deterministic PRNG so the pattern is stable across renders (no flicker).
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(str) {
  let s = 0;
  for (let i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
  return s;
}

// Quarter-circle "leaf" (a 90° sector) for each pivot corner of a cell.
function leafPath(x, y, pivot) {
  switch (pivot) {
    case 0: // top-left
      return `M ${x} ${y} L ${x + UNIT} ${y} A ${UNIT} ${UNIT} 0 0 1 ${x} ${y + UNIT} Z`;
    case 1: // top-right
      return `M ${x + UNIT} ${y} L ${x + UNIT} ${y + UNIT} A ${UNIT} ${UNIT} 0 0 1 ${x} ${y} Z`;
    case 2: // bottom-right
      return `M ${x + UNIT} ${y + UNIT} L ${x} ${y + UNIT} A ${UNIT} ${UNIT} 0 0 1 ${x + UNIT} ${y} Z`;
    default: // bottom-left
      return `M ${x} ${y + UNIT} L ${x} ${y} A ${UNIT} ${UNIT} 0 0 1 ${x + UNIT} ${y + UNIT} Z`;
  }
}

// Half-disc sitting on one edge, bulging into the cell.
function halfPath(x, y, edge) {
  const R = UNIT / 2;
  switch (edge) {
    case 0: // bottom edge, bulge up
      return `M ${x} ${y + UNIT} A ${R} ${R} 0 0 0 ${x + UNIT} ${y + UNIT} Z`;
    case 1: // left edge, bulge right
      return `M ${x} ${y} A ${R} ${R} 0 0 1 ${x} ${y + UNIT} Z`;
    case 2: // top edge, bulge down
      return `M ${x} ${y} A ${R} ${R} 0 0 1 ${x + UNIT} ${y} Z`;
    default: // right edge, bulge left
      return `M ${x + UNIT} ${y} A ${R} ${R} 0 0 0 ${x + UNIT} ${y + UNIT} Z`;
  }
}

// Shape mix per theme variant — weights bias the look. Premium defaults.
const PREMIUM_VARIANTS = {
  arcs:    { seed: 11, weights: { leaf: 3, half: 4, circle: 3, square: 2, ring: 3 } },
  fans:    { seed: 23, weights: { leaf: 6, half: 2, circle: 3, square: 1, ring: 2 } },
  grid:    { seed: 31, weights: { leaf: 2, half: 2, circle: 3, square: 4, ring: 2 } },
  waves:   { seed: 43, weights: { leaf: 4, half: 5, circle: 2, square: 1, ring: 2 } },
  blocks:  { seed: 51, weights: { leaf: 3, half: 2, circle: 4, square: 5, ring: 2 } },
  scatter: { seed: 67, weights: { leaf: 3, half: 3, circle: 5, square: 1, ring: 2 } },
};

// Backwards-compatible alias; callers may pass the old "VARIANTS" name.
const VARIANTS = PREMIUM_VARIANTS;

function buildPool(weights) {
  const pool = [];
  for (const [shape, n] of Object.entries(weights)) for (let i = 0; i < n; i++) pool.push(shape);
  return pool;
}

export function FormArtPanel({ accent = "#0c8b7c", variant = "fans", className, cols = 4, rows = 7 }) {
  const v = VARIANTS[variant] || VARIANTS.fans;
  const rand = rng(seedFrom(accent) ^ (v.seed * 2654435761));
  const pool = buildPool(v.weights);

  // Sophisticated tonal ramp of the single accent hue — cohesive, never garish.
  const base = hexToRgba(accent, 0.85);
  const tint = hexToRgba(shade(accent, 16), 0.45);
  const mid = hexToRgba(accent, 0.32);
  const muted = hexToRgba(shade(accent, -20), 0.22);
  const tones = [base, tint, mid, muted];

  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * UNIT;
      const y = r * UNIT;
      const shape = pool[Math.floor(rand() * pool.length)];
      const color = tones[Math.floor(rand() * tones.length)];
      const rot = Math.floor(rand() * 4);
      const key = `${r}-${c}`;
      const depth = rand(); // for subtle pseudo-3D offset

      if (shape === "square") {
        tiles.push(
          <rect
            key={key}
            x={x + (depth > 0.6 ? 2 : 0)}
            y={y + (depth > 0.6 ? 2 : 0)}
            width={UNIT - 12}
            height={UNIT - 12}
            rx="10"
            fill={color}
            stroke={hexToRgba(accent, 0.18)}
            strokeWidth="1"
            transform={`rotate(${rot * 90} ${x + UNIT / 2} ${y + UNIT / 2})`}
          />
        );
      } else if (shape === "circle") {
        tiles.push(
          <circle
            key={key}
            cx={x + UNIT / 2}
            cy={y + UNIT / 2}
            r={UNIT / 2 - 14}
            fill={color}
            stroke={hexToRgba(accent, 0.22)}
            strokeWidth="2"
          />
        );
      } else if (shape === "ring") {
        tiles.push(
          <circle
            key={key}
            cx={x + UNIT / 2}
            cy={y + UNIT / 2}
            r={UNIT / 2 - 18}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        );
      } else if (shape === "half") {
        tiles.push(
          <path
            key={key}
            d={halfPath(x + 6, y + 6, rot)}
            fill={color}
            stroke={hexToRgba(accent, 0.16)}
            strokeWidth="1"
          />
        );
      } else {
        tiles.push(
          <path
            key={key}
            d={leafPath(x + 6, y + 6, rot)}
            fill={color}
            stroke={hexToRgba(accent, 0.16)}
            strokeWidth="1"
          />
        );
      }
    }
  }

  const gradientId = `art-gradient-${variant}`;

  return (
    <div
      className={className}
      style={{
        backgroundColor: hexToRgba(accent, 0.04),
        borderRadius: "1.5rem",
        overflow: "hidden",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <svg
        className="h-full w-full transition-transform duration-500 hover:scale-[1.02]"
        viewBox={`0 0 ${cols * UNIT} ${rows * UNIT}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor={hexToRgba(accent, 0.08)} />
            <stop offset="100%" stopColor={hexToRgba(accent, 0.02)} />
          </radialGradient>
        </defs>
        {/* Soft radial gradient backdrop */}
        <rect x="0" y="0" width={cols * UNIT} height={rows * UNIT} fill={`url(#${gradientId})`} />
        {/* Subtle texture grid — very light */}
        <g stroke={hexToRgba("#000", 0.015)} strokeWidth="0.5">
          {Array.from({ length: cols + 1 }).map((_, i) => (
            <line key={`v-${i}`} x1={i * UNIT} y1="0" x2={i * UNIT} y2={rows * UNIT} />
          ))}
          {Array.from({ length: rows + 1 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * UNIT} x2={cols * UNIT} y2={i * UNIT} />
          ))}
        </g>
        {tiles}
      </svg>
    </div>
  );
}
