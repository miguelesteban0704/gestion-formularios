/**
 * Decisión compartida: qué tono se transforma y cuál cambia de icono.
 *
 * El toast y el orbe de `StatusModal` tienen el mismo problema — un par
 * cargando→éxito que se cuenta mejor transforming un icono que
 * sustituyendo dos — y la respuesta tiene que ser la misma en los dos
 * sitios. Con una decisión por componente, uno acaba usando el icono
 * animado y el otro no, y el sistema se ve inconsistente sin que nadie
 * sepa por qué.
 *
 * Vive aparte de los iconos a propósito: un fichero que exporta
 * componentes y además funciones rompe el fast refresh de Vite.
 */

/** Tonos que comparten superficie visual: toast y modal de estado. */
export type Tone = "loading" | "success" | "error" | "warning" | "info";

/**
 * ¿Este caso debe morphar en lugar de cambiar de icono?
 *
 * `hasCustomIcon` es lo que respeta el toast cuando quien lo lanza pasa
 * su propio icono: ahí manda ese icono y no hay nada que transformar.
 */
export function shouldMorph(type: Tone, hasCustomIcon = false): boolean {
  if (hasCustomIcon) return false;
  return type === "loading" || type === "success";
}
