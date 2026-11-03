import { useEffect, useRef, type RefObject } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   Primitivas compartidas de overlays (modal, drawer, splash).
   Centralizadas para que no haya tres implementaciones de focus trap,
   scroll lock o tecla Escape.
   ═══════════════════════════════════════════════════════════════════════ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const visible = (el: HTMLElement) => el.offsetParent !== null || el === document.activeElement;

/**
 * Atrapa el foco dentro del contenedor mientras está activo.
 * Recupera el foco al elemento de origen al cerrar.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  { autoFocus = true }: { autoFocus?: boolean } = {},
) {
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const root = containerRef.current;
    const list = () => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);

    const prev = document.activeElement;
    if (restoreRef.current === null) restoreRef.current = prev;

    // El foco entra al diálogo en el siguiente tick (ya montado y animado).
    const t = window.setTimeout(() => {
      const items = list();
      (items[0] || root).focus?.({ preventScroll: true });
    }, 10);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = list();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      const restore = restoreRef.current;
      restoreRef.current = null;
      if (autoFocus && restore instanceof HTMLElement && document.contains(restore)) {
        restore.focus?.({ preventScroll: true });
      }
    };
  }, [active, containerRef, autoFocus]);
}

/* Contador compartido: varios overlays a la vez (modal sobre drawer) no
   se pisan al bloquear/restablecer el scroll. */
let locks = 0;
let savedOverflow = "";
let savedPadding = "";

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    if (locks === 0) {
      savedOverflow = document.body.style.overflow;
      savedPadding = document.body.style.paddingRight;
      // Compensa el scrollbar: abrir un modal no desplaza el contenido.
      const gap = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    }
    locks += 1;
    return () => {
      locks = Math.max(0, locks - 1);
      if (locks === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPadding;
      }
    };
  }, [active]);
}

/** Alias moderno del scroll lock (spec del sistema de feedback). */
export const useScrollLock = useBodyScrollLock;

/** Escape global por capas: solo responde el overlay SUPERIOR.
 *  (p. ej. con la paleta de comandos abierta sobre un modal, Esc cierra la
 *   paleta y deja el modal intacto). */
const escStack: object[] = [];

export function useEscapeKey(active: boolean, onEscape: (() => void) | undefined, closeOnEsc = true) {
  useEffect(() => {
    if (!active || !closeOnEsc || typeof document === "undefined") return;
    const entry: { marker: never } = {} as { marker: never };
    escStack.push(entry);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (escStack[escStack.length - 1] !== entry) return;
      onEscape?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = escStack.indexOf(entry);
      if (i >= 0) escStack.splice(i, 1);
    };
  }, [active, onEscape, closeOnEsc]);
}