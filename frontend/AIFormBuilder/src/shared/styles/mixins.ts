/**
 * Mixins y utilidades de layout — capa compartida `src/shared/styles`.
 *
 * Funciones puras que devuelven fragmentos de CSS (media queries) u objetos de
 * estilo (flex/grid/centrado/oculto). Al ser objetos, sirven igual en estilos
 * inline de React que en generadores; no dependen de Tailwind ni introducen
 * clases dinámicas (que el purge de Tailwind no puede ver).
 */
import { breakpoints } from "./tokens";

/* `Breakpoint` NO se exporta aquí: `tokens.ts` ya lo exporta y el barrel
   (`./index.ts`) hace `export *` de ambos; dos declaraciones con el mismo
   nombre romperían la reexportación. Se usa como tipo local. */
type Breakpoint = keyof typeof breakpoints;
export type Length = number | string;

const toPx = (value: Length): string => (typeof value === "number" ? `${value}px` : value);

/* ── Media queries (para CSS-in-JS o `dangerouslySetInnerHTML`) ────────── */

/** `@media (min-width: …)`. */
export function minWidth(breakpoint: Breakpoint): string {
  return `@media (min-width: ${breakpoints[breakpoint]}px)`;
}

/** `@media (max-width: …)` con el solape clásico de 0.02px evitado. */
export function maxWidth(breakpoint: Breakpoint): string {
  const value = breakpoints[breakpoint];
  return `@media (max-width: ${value > 0 ? value - 0.02 : value}px)`;
}

export const media = { minWidth, maxWidth } as const;

/* ── Cajas de layout ───────────────────────────────────────────────────── */

export interface FlexOptions {
  direction?: "row" | "column";
  align?: string;
  justify?: string;
  gap?: Length;
  wrap?: boolean;
}

/** Objeto de estilo para un contenedor flex. */
export function flex(options: FlexOptions = {}): Record<string, string> {
  const { direction = "row", align, justify, gap, wrap } = options;
  const style: Record<string, string> = { display: "flex", flexDirection: direction };
  if (align) style.alignItems = align;
  if (justify) style.justifyContent = justify;
  if (gap !== undefined) style.gap = toPx(gap);
  if (wrap) style.flexWrap = "wrap";
  return style;
}

export interface GridOptions {
  columns?: number | string;
  rows?: number | string;
  gap?: Length;
  align?: string;
  justify?: string;
}

/** Objeto de estilo para un contenedor grid. */
export function grid(options: GridOptions = {}): Record<string, string> {
  const { columns, rows, gap, align, justify } = options;
  const style: Record<string, string> = { display: "grid" };
  if (columns !== undefined) {
    style.gridTemplateColumns = typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns;
  }
  if (rows !== undefined) {
    style.gridTemplateRows = typeof rows === "number" ? `repeat(${rows}, minmax(0, 1fr))` : rows;
  }
  if (gap !== undefined) style.gap = toPx(gap);
  if (align) style.alignItems = align;
  if (justify) style.justifyContent = justify;
  return style;
}

/** Centrado absoluto por flex en ambos ejes. */
export const center: Record<string, string> = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** Oculta visualmente pero mantiene el elemento accesible a lectores de pantalla. */
export const visuallyHidden: Record<string, string> = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
};

/** Recorta texto en una línea con elipsis. */
export const truncate: Record<string, string> = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/** Recorta texto a un número de líneas dado. */
export function lineClamp(lines: number): Record<string, string> {
  return {
    display: "-webkit-box",
    WebkitLineClamp: String(lines),
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}
