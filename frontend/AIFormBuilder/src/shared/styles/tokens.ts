/**
 * Tokens de diseño — capa compartida `src/shared/styles`.
 *
 * Fuente única de verdad del SITIO: `src/index.css` (@theme). Este archivo NO
 * reimplementa colores: expone referencias `var(--token)` para que el código JS
 * no escriba hex a fuego. Esa es la condición para que la auditoría de marca
 * (`qa/brand-audit.js`) siga en verde y para que cambiar el acento desde
 * Ajustes repinte toda la interfaz.
 *
 * Regla de oro: aquí NUNCA hay un hex de la familia de marca (teal o el
 * semántico #10B981). Solo `var(--...)` y valores neutros de medida/ritmo.
 */

/* ── Color ────────────────────────────────────────────────────────────────
   La escala de marca vive en `--color-brand-*`; los semánticos en
   `--color-success|warning|danger|info`. Las superficies del sitio usan los
   tokens de rol (`--color-app/surface/line/ink`), que ya resuelven claro/oscuro
   por CSS. */
export const colors = {
  brand: {
    50: "var(--color-brand-50)",
    100: "var(--color-brand-100)",
    200: "var(--color-brand-200)",
    300: "var(--color-brand-300)",
    400: "var(--color-brand-400)",
    500: "var(--color-brand-500)",
    600: "var(--color-brand-600)",
    700: "var(--color-brand-700)",
    800: "var(--color-brand-800)",
    900: "var(--color-brand-900)",
    950: "var(--color-brand-950)",
  },
  app: "var(--color-app)",
  surface: {
    DEFAULT: "var(--color-surface)",
    raised: "var(--color-surface-2)",
  },
  line: "var(--color-line)",
  ink: {
    DEFAULT: "var(--color-ink)",
    muted: "var(--color-ink-muted)",
  },
  success: {
    DEFAULT: "var(--color-success)",
    soft: "var(--color-success-soft)",
    ring: "var(--color-success-ring)",
    ink: "var(--color-success-ink)",
  },
  warning: {
    DEFAULT: "var(--color-warning)",
    soft: "var(--color-warning-soft)",
    ink: "var(--color-warning-ink)",
  },
  danger: {
    DEFAULT: "var(--color-danger)",
    soft: "var(--color-danger-soft)",
    ink: "var(--color-danger-ink)",
  },
  info: {
    DEFAULT: "var(--color-info)",
    soft: "var(--color-info-soft)",
    ink: "var(--color-info-ink)",
  },
  glass: {
    bg: "var(--glass-bg)",
    bgHover: "var(--glass-bg-hover)",
    border: "var(--glass-border)",
    chroma: "var(--glass-chroma)",
  },
} as const;

/* ── Espaciado (escala de 4px, equivalente a Tailwind) ──────────────────── */
export const spacing = {
  "0": "0px",
  "0.5": "0.125rem",
  "1": "0.25rem",
  "1.5": "0.375rem",
  "2": "0.5rem",
  "2.5": "0.625rem",
  "3": "0.75rem",
  "3.5": "0.875rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "7": "1.75rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
} as const;

/* ── Tipografía ───────────────────────────────────────────────────────────
   `sans` = cuerpo (Manrope), `display` = títulos (Fraunces), `mono` = datos/slug
   (JetBrains Mono). Todas autoalojadas vía @fontsource. */
export const typography = {
  fontFamily: {
    sans: '"Manrope Variable", ui-sans-serif, system-ui, sans-serif',
    display: '"Fraunces Variable", "Manrope Variable", serif',
    mono: '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.8125rem",
    base: "0.875rem",
    lg: "1rem",
    xl: "1.125rem",
    "2xl": "1.375rem",
    "3xl": "1.75rem",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 800,
  },
  lineHeight: {
    tight: "1.2",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.65",
  },
  letterSpacing: {
    tight: "-0.01em",
    normal: "0em",
    wide: "0.02em",
    wider: "0.06em",
  },
} as const;

/* ── Puntos de ruptura (px) — alineados con Tailwind ───────────────────── */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/* ── Radios — jerarquía intencional, no 8px en todo ───────────────────── */
export const radii = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  "2xl": "var(--radius-2xl)",
  btn: "var(--radius-btn)",
  modal: "var(--radius-modal)",
  modalLg: "var(--radius-modal-lg)",
  toast: "var(--radius-toast)",
  tooltip: "var(--radius-tooltip)",
  pill: "var(--radius-pill)",
} as const;

/* ── Sombras de marca — leen las variables del @theme ─────────────────── */
export const shadows = {
  brandGlow: "var(--shadow-brand-glow)",
  brandRing: "var(--shadow-brand-ring)",
  brandRingWide: "var(--shadow-brand-ring-wide)",
  brandRail: "var(--shadow-brand-rail)",
  brandDrag: "var(--shadow-brand-drag)",
  brandSelect: "var(--shadow-brand-select)",
} as const;

/* ── Acentos decorativos (no de marca) ──────────────────────────────────
   Colores de tarjeta que NO siguen al acento del sitio: son la paleta de
   la insignia del bento. Se exponen como tokens para que no se escriban
   hex a fuego en los componentes. */
export const accents = {
  gold: "var(--accent-gold)",
  coral: "var(--accent-coral)",
  purple: "var(--accent-purple)",
  blue: "var(--accent-blue)",
  teal: "var(--accent-teal)",
} as const;

/* ── Elevación (z-index) — capas nombradas, no números sueltos ─────────── */
export const zIndex = {
  app: "var(--z-app)",
  sticky: "var(--z-sticky)",
  dropdown: "var(--z-dropdown)",
  tooltip: "var(--z-tooltip)",
  modalBackdrop: "var(--z-modal-backdrop)",
  modal: "var(--z-modal)",
  toast: "var(--z-toast)",
  critical: "var(--z-critical)",
  splash: "var(--z-splash)",
} as const;

/* ── Movimiento — duración y curva con propósito ──────────────────────── */
export const motion = {
  duration: {
    instant: "var(--transition-instant)",
    fast: "var(--transition-fast)",
    normal: "var(--transition-normal)",
    slow: "var(--transition-slow)",
  },
  ease: {
    premium: "var(--ease-premium)",
    spring: "var(--ease-spring)",
    ui: "var(--ease-ui)",
  },
} as const;

/* Tipos derivados para consumidores tipados. */
export type ColorScale = typeof colors;
export type Spacing = keyof typeof spacing;
export type Breakpoint = keyof typeof breakpoints;
export type Radius = keyof typeof radii;

/** Paquete completo de tokens para consumo masivo (`tokens.colors.brand[500]`). */
export const tokens = {
  colors,
  spacing,
  breakpoints,
  radii,
  shadows,
  zIndex,
  motion,
  typography,
} as const;

export default tokens;
