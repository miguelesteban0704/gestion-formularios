/** Premium chart palette — deep teal (brand) + warm gold + muted graphite. Crafted for bento + glow. */
export const CHART = {
  teal: "#0e9384",
  tealLight: "#2ec4b6",
  tealDark: "#0b6b5f",
  tealSoft: "#e6f5f2",
  gold: "#d4a43a",
  goldLight: "#f0c75e",
  goldSoft: "#fdf3d7",
  slate: "#64748b",
  slateLight: "#94a3b8",
  slateSoft: "#f1f5f9",
  ink: "#0f172a",
  violet: "#7c6cc0",
  coral: "#d67a6a",
};

/** Ordered palette for categorical series — cohesive, never garish. */
export const CHART_PALETTE = [
  CHART.teal,
  CHART.gold,
  CHART.violet,
  CHART.coral,
  CHART.slate,
  CHART.tealLight,
  CHART.tealDark,
  CHART.goldLight,
  "#0f766e",
  CHART.slateLight,
];

/**
 * Floating glass tooltip de los gráficos — el mismo cristal del sistema, en
 * versión flotante. Recharts no acepta clases aquí (el contenido va como un
 * `style` en línea), así que la receta se escribe con `color-mix()` sobre
 * `--glass-chroma`, que es `--color-brand-500/400`: la escala que
 * `lib/accent.js` reescribe cuando el usuario cambia el acento. Antes era
 * `rgba(255,255,255,0.94)` con borde `slate-200` fijo — la única caja flotante
 * que se quedaba fuera del color de la cuenta.
 *
 * Las sombras también van teñidas con el acento por el mismo motivo que el
 * resto: una `box-shadow` gris al lado de un cristal de color se nota como
 * una pieza pegada encima en lugar de una pieza del sitio.
 */
export const tooltipStyle = {
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--glass-chroma) 15%, rgba(255,255,255,0.94)), color-mix(in srgb, var(--glass-chroma) 21%, rgba(238,243,251,0.92)))",
  border: "1px solid color-mix(in srgb, var(--glass-chroma) 42%, rgba(203,213,225,0.9))",
  borderRadius: 14,
  fontSize: 12,
  lineHeight: 1.4,
  color: "var(--fg)",
  boxShadow:
    "inset 0 1px 0 color-mix(in srgb, var(--glass-chroma) 42%, #ffffff)," +
    " 0 16px 40px -12px color-mix(in srgb, var(--glass-chroma) 46%, rgba(8,14,26,0.5))," +
    " 0 4px 12px -8px rgba(8,14,26,0.18)",
  backdropFilter: "blur(18px) saturate(1.5)",
  WebkitBackdropFilter: "blur(18px) saturate(1.5)",
  padding: "10px 12px",
};

/**
 * Genera los <defs> SVG de un gradiente de área reutilizable.
 * Úsalo dentro de <defs> en cualquier AreaChart/ComposedChart para evitar
 * repetir el mismo bloque en Analytics.jsx e Insights.jsx.
 *
 * @param {string} id    — id único del gradiente, e.g. "volFill"
 * @param {string} color — color base en hex
 * @param {number} top   — opacidad en el top (0-1), default 0.32
 * @param {number} mid   — opacidad en el medio, default 0.08
 */
export function areaGradientDef(id, color, top = 0.32, mid = 0.08) {
  return { id, color, top, mid };
}

/**
 * Construye el objeto JSX-ready de un gradiente de línea horizontal
 * (útil para stroke en Area/Line).
 *
 * @param {string} id    — id único
 * @param {string} from  — color inicio
 * @param {string} to    — color fin
 */
export function lineGradientDef(id, from, to) {
  return { id, from, to };
}

/**
 * Devuelve el cursor style para tooltips sobre áreas —
 * línea vertical tenue con dash y tint de marca.
 *
 * @param {string} color — color de la línea, default CHART.teal
 */
export function areaCursor(color = "#0e9384") {
  return {
    stroke: color,
    strokeOpacity: 0.18,
    strokeWidth: 1.2,
    strokeDasharray: "4 4",
  };
}

/**
 * Calcula el delta % entre el periodo reciente y el anterior
 * dado un array de { count } ordenado por fecha.
 *
 * @param {Array<{count:number}>} timeline
 * @param {number} window — días a comparar (default 7)
 */
export function timelineDelta(timeline = [], window = 7) {
  const recent = timeline.slice(-window).reduce((s, x) => s + x.count, 0);
  const prev = timeline.slice(-window * 2, -window).reduce((s, x) => s + x.count, 0);
  if (!prev) return recent ? 100 : 0;
  return Math.round(((recent - prev) / prev) * 100);
}

/** Parse a user-agent into a coarse "Browser · OS" label. */
export function deviceFromUA(ua = "") {
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /Chrome/.test(ua)
      ? "Chrome"
      : /Firefox/.test(ua)
        ? "Firefox"
        : /Safari/.test(ua)
          ? "Safari"
          : "Other";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";
  return { browser, os };
}
