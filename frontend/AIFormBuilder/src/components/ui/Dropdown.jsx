import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils.js";

const DropdownContext = createContext(() => {});

/**
 * Lightweight accessible menu.
 *
 * Accesibilidad:
 *  - El trigger debe ser un <button> nativo: Enter/Space disparan click,
 *    que hace bubbling hasta el wrapper y abre/cierra el menú.
 *  - Cierra con click fuera, Escape (devuelve el foco al trigger), Tab (deja
 *    que el foco siga su curso) o al seleccionar un MenuItem.
 *  - Al abrir, el foco entra en el primer MenuItem; se recorre con ↑/↓ en ciclo
 *    y se salta al primero/último con Home/End. Escribir una letra salta al
 *    primer item cuyo texto empieza por ella (typeahead, buffer de 600 ms).
 *  - Escape usa stopPropagation para no cerrar otros overlays abiertos
 *    (drawer móvil, command palette).
 *  - `ariaLabel` es opcional y va al `role="menu"`. Sin él el menú se anuncia
 *    sin nombre. Opcional a propósito: ponerlo en el disparador en vez de aquí
 *    es un error, porque el `aria-label` del botón pisa el texto que se ve y el
 *    nombre accesible deja de contener la etiqueta visible (WCAG 2.5.3).
 *
 * Posicionamiento:
 *  - El panel se monta en un PORTAL (`document.body`) para que ningún
 *    contenedor con `overflow` o un `z-index` intermedio lo recorte o lo tape.
 *  - Se mide tras montar y se coloca en `position: fixed` bajo el disparador,
 *    volteando hacia arriba si no hay sitio y quedándose dentro del viewport.
 *  - Se recalcula al hacer scroll (captura, incluye contenedores) o resize.
 */
export function Dropdown({ trigger, children, align = "right", className, open: openProp, onOpenChange, ariaLabel }) {
  const [openState, setOpenState] = useState(false);

  // API controlada opcional: si el padre pasa `open`/`onOpenChange`, él decide.
  // Permite al padre reflejar el estado (rotar el chevron, elevar el z-index…).
  const open = openProp !== undefined ? openProp : openState;
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const typeahead = useRef({ query: "", timer: null });

  const setOpen = useCallback(
    (value) => {
      setOpenState(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  // Coloca el panel respecto al disparador (volteo vertical + ajuste horizontal).
  // Se escribe directo en el nodo (fixed) para no disparar un render extra: el
  // menú ya está montado, solo hay que medirlo y ubicarlo antes del primer paint.
  const position = useCallback(() => {
    const triggerEl = triggerRef.current?.querySelector("button") || triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;
    const t = triggerEl.getBoundingClientRect();
    const m = menuEl.getBoundingClientRect();
    const gap = 8;
    const margin = 8;

    const spaceBelow = window.innerHeight - t.bottom;
    const spaceAbove = t.top;
    const flipUp = spaceBelow < m.height + gap && spaceAbove > spaceBelow;

    let top = flipUp ? t.top - gap - m.height : t.bottom + gap;
    let left = align === "right" ? t.right - m.width : t.left;

    top = Math.max(margin, Math.min(top, window.innerHeight - m.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - m.width - margin));

    menuEl.style.top = `${top}px`;
    menuEl.style.left = `${left}px`;
    menuEl.style.transformOrigin = `${flipUp ? "bottom" : "top"} ${align === "right" ? "right" : "left"}`;
    menuEl.style.setProperty("--menu-shift", flipUp ? "-6px" : "6px");
    menuEl.style.visibility = "visible";
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    const onScrollOrResize = () => position();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, position]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        triggerRef.current?.querySelector("button")?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Al abrir, el foco entra en el primer MenuItem disponible.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
  }, [open]);

  const onMenuKeyDown = (e) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || []);
    if (!items.length) return;

    if (e.key === "Tab") {
      // Deja que el foco siga su curso natural y cierra sin robarle el foco.
      close();
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const index = items.indexOf(document.activeElement);
      let next;
      if (e.key === "Home") next = 0;
      else if (e.key === "End") next = items.length - 1;
      else if (e.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
      else next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length;
      items[next]?.focus({ preventScroll: true });
      return;
    }

    // Typeahead: una letra salta al primer item que empieza por el buffer.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.key.startsWith(" ")) {
      typeahead.current.query += e.key.toLowerCase();
      window.clearTimeout(typeahead.current.timer);
      typeahead.current.timer = window.setTimeout(() => {
        typeahead.current.query = "";
      }, 600);
      const query = typeahead.current.query;
      items
        .find((el) => (el.textContent || "").trim().toLowerCase().startsWith(query))
        ?.focus({ preventScroll: true });
    }
  };

  return (
    <DropdownContext.Provider value={close}>
      <div ref={ref} className="relative">
        <div
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          role="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          className="outline-none"
        >
          {trigger}
        </div>
        {open &&
          createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={ariaLabel}
              onKeyDown={onMenuKeyDown}
              className={cn(
                "fixed z-[var(--z-dropdown)] min-w-[12rem] overflow-hidden rounded-xl border border-white/70 bg-white/85 p-1.5 shadow-[var(--shadow-pop)] backdrop-blur-xl animate-menu-in dark:border-white/10 dark:bg-[#141821]/85",
                className
              )}
              style={{ top: 0, left: 0, visibility: "hidden", transformOrigin: "top right" }}
            >
              {children}
            </div>,
            document.body
          )}
      </div>
    </DropdownContext.Provider>
  );
}

export function MenuItem({ icon: Icon, children, description, shortcut, onClick, danger, disabled, className }) {
  const close = useContext(DropdownContext);

  return (
    <button
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        close();
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        danger
          ? "text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15 dark:focus-visible:bg-red-500/15"
          : "text-ink hover:bg-slate-900/5 focus-visible:bg-slate-900/5 dark:hover:bg-white/5 dark:focus-visible:bg-white/5",
        className
      )}
    >
      {Icon && (
        <Icon className={cn("h-4 w-4 shrink-0", !danger && "text-ink-muted")} />
      )}
      {/* Con `description` se compone etiqueta + apoyo; sin ella se respeta el
          contenido original (varios consumidores pasan su propio `flex-1`). */}
      {description ? (
        <span className="min-w-0 flex-1">
          <span className="block truncate">{children}</span>
          <span className="mt-0.5 block truncate text-xs font-normal text-ink-muted">{description}</span>
        </span>
      ) : (
        children
      )}
      {shortcut && <kbd className="kbd ml-2 shrink-0">{shortcut}</kbd>}
    </button>
  );
}

export function MenuDivider() {
  return <div role="separator" className="my-1.5 h-px bg-line" />;
}
