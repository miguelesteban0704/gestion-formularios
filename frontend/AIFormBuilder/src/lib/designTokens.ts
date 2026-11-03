/**
 * Design Tokens — estudio: identidad propia, no kit genérico
 * Fuente única de verdad está en src/index.css @theme; este archivo expone para JS.
 * Los colores SIEMPRE referencian CSS vars (--color-*): nunca hex sueltos, para
 * que la auditoría de marca (qa/brand-audit.js) siga en verde.
 */

// Paleta semántica unificada — #10B981 / #EF4444 / #F59E0B / #3B82F6,
// cada tono con su capa `-ink` (texto legible AA)
export const palette = {
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
    controlled: "var(--color-danger-ink)", // rojo contenido, no neón
  },
  info: {
    DEFAULT: "var(--color-info)",
    soft: "var(--color-info-soft)",
    ink: "var(--color-info-ink)",
  },
  ink: {
    DEFAULT: "#0f172a",
    muted: "#64748b",
    dark: "#e9edf4",
  },
  surface: {
    DEFAULT: "#ffffff",
    soft: "#f8fafc",
    dark: "#12151d",
  },
};

// Tipografía — tres familias con roles claros (autoalojadas vía @fontsource)
export const typography = {
  sans: '"Manrope Variable", ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
  display: '"Fraunces Variable", "Manrope Variable", ui-serif, Georgia, serif', // display para títulos, no body
  mono: '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  scale: {
    xs: "0.75rem",   // 12px — tooltips, badges
    sm: "0.8125rem", // 13px — descripciones toast/modal
    base: "0.875rem",// 14px — body
    lg: "1rem",
    xl: "1.125rem",  // 18px — títulos modal
    "2xl": "1.375rem",
  },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700, black: 800 },
};

// Radios — jerarquía intencional, no 8px en todo. Los del modal remiten a los
// tokens de index.css (--radius-modal / --radius-modal-lg).
export const radii = {
  toast: "0.875rem",   // 14px — compacto flotante
  tooltip: "0.625rem", // 10px — ligero
  modal: "var(--radius-modal)",    // 18px — contenedor protagonista
  modalLg: "var(--radius-modal-lg)",
  pill: "9999px",
};

// Sombras — cada componente su sombra, no una sola gris
export const shadows = {
  toast: "0 12px 32px -8px rgba(16,24,40,0.14), 0 4px 16px -6px rgba(16,24,40,0.08)",
  modal: "0 24px 64px -16px rgba(16,24,40,0.22), 0 8px 24px -8px rgba(16,24,40,0.10)",
  tooltip: "0 10px 24px -6px rgba(16,24,40,0.18)",
};

// Easing — premium, con propósito
export const easing = {
  premium: "cubic-bezier(0.16, 1, 0.3, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  swift: "cubic-bezier(0.4, 0, 1, 1)",
};

// Tokens para dark mode — nunca blancos/negros puros, siempre tintados
export const dark = {
  surface: "#12151d", // slate 900 tinted, no #000
  surfaceSoft: "#171b25",
  border: "#232936",
  overlay: "rgba(2,6,16,0.46)",
};

// Ritmo del sistema de feedback (spec): diálogos y toasts
export const durations = {
  dialog: 320,
  dialogExit: 160,
  toast: 240,
};

// Elevación — leen las mismas variables que el CSS
export const z = {
  backdrop: "var(--z-modal-backdrop)",
  modal: "var(--z-modal)",
  toast: "var(--z-toast)",
};