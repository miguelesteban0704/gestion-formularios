/**
 * Tema — capa compartida `src/shared/styles`.
 *
 * El sitio resuelve claro/oscuro por CSS (`@custom-variant dark` en index.css):
 * las variables cambian de valor bajo `.dark`, así que el JS no necesita dos
 * paletas. Aquí se exponen los ROLES semánticos (superficie, texto, borde,
 * acento) y utilidades para pintar sin conocimiento del tema activo.
 */
import { colors } from "./tokens";

/** Nombres de tema soportados por el sistema. */
export type ThemeName = "light" | "dark";

/** Referencia a una variable CSS: `cssVar("color-brand-500")` → `var(--color-brand-500)`. */
export function cssVar(name: string): string {
  return `var(--${name})`;
}

/**
 * Roles semánticos del sitio. Todos apuntan a variables CSS neutras respecto
 * al tema: cambiar claro↔oscuro repinta sin tocar el JS.
 */
export const semantic = {
  background: cssVar("color-app"),
  surface: cssVar("color-surface"),
  surfaceRaised: cssVar("color-surface-2"),
  border: cssVar("color-line"),
  text: cssVar("color-ink"),
  textMuted: cssVar("color-ink-muted"),
  accent: cssVar("color-brand-500"),
  accentSoft: cssVar("color-brand-100"),
  accentStrong: cssVar("color-brand-600"),
  success: cssVar("color-success"),
  warning: cssVar("color-warning"),
  danger: cssVar("color-danger"),
  info: cssVar("color-info"),
  glassBg: cssVar("glass-bg"),
  glassBgHover: cssVar("glass-bg-hover"),
  glassBorder: cssVar("glass-border"),
  glassChroma: cssVar("glass-chroma"),
} as const;

export type SemanticRole = keyof typeof semantic;

/** Mapa de temas: la clase que se aplica en `<html>` vía ThemeProvider. */
export const themes: Record<ThemeName, { className: string; scheme: ThemeName }> = {
  light: { className: "light", scheme: "light" },
  dark: { className: "dark", scheme: "dark" },
};

/** Clase de tema a aplicar en la raíz según el estado oscuro. */
export function themeClass(isDark: boolean): string {
  return isDark ? themes.dark.className : themes.light.className;
}

/** Devuelve el valor de un rol semántico (útil en estilos inline/objetos). */
export function role(name: SemanticRole): string {
  return semantic[name];
}

/**
 * Mezcla un color con transparencia usando `color-mix`, sin escribir rgba a
 * mano y sin depender de la paleta. `alpha` va de 0 a 1.
 */
export function withAlpha(color: string, alpha: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, alpha)) * 100);
  return `color-mix(in oklab, ${color} ${pct}%, transparent)`;
}

/** Atajo del acento de marca en un nivel concreto de la escala. */
export function accent(step: keyof typeof colors.brand = 500): string {
  return colors.brand[step];
}

export default semantic;
