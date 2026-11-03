import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { PhoneFlag } from "./PhoneFlag.jsx";
import { cn } from "../../lib/utils.js";

/*
 * Selector de país con BANDERAS.
 *
 * Existe porque un `<select>` nativo NO puede dibujar banderas dentro de sus
 * `<option>` (HTML no permite marcado en las opciones), así que el desplegable
 * salía como una lista de texto plano. Aquí el panel es una lista propia
 * (`role="listbox"`), montada en un PORTAL (`document.body`) en
 * `position: fixed`: así ningún contenedor con `overflow` (los `Collapse` y
 * paneles del constructor) la recorta, y se mide contra el disparador, voltea
 * hacia arriba si no hay sitio y se recalcula en scroll/resize.
 *
 * Es un control controlado: recibe `options`, `value`/`onChange` (el `code` del
 * país) y un `renderTrigger` opcional para pintar el botón cerrado. El valor
 * especial `"__any"` puede incluirse como una opción normal (`value: "__any"`),
 * lo que permite una fila «Cualquier país».
 *
 * Accesibilidad: disparador `<button>` con `aria-haspopup="listbox"`/
 * `aria-expanded`/`aria-controls`; navegación con ↑/↓/Home/End/Enter/Escape;
 * `aria-activedescendant` apunta a la opción resaltada; clic fuera y Escape
 * cierran; al cerrar, el foco vuelve al disparador.
 */

export function CountrySelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  ariaLabel,
  className,
  renderTrigger,
  renderOption,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex] || options[0] || null;

  /* Coloca el panel (portal, `fixed`) contra el disparador: bajo él, volteando
     hacia arriba si no hay sitio, y dentro del viewport. Se escribe directo en
     el nodo para no disparar un render extra. */
  const position = () => {
    const triggerEl = triggerRef.current;
    const menuEl = menuRef.current;
    if (!triggerEl || !menuEl) return;
    const t = triggerEl.getBoundingClientRect();
    const m = menuEl.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    const spaceBelow = window.innerHeight - t.bottom;
    const spaceAbove = t.top;
    const flipUp = spaceBelow < m.height + gap && spaceAbove > spaceBelow;
    let top = flipUp ? t.top - gap - m.height : t.bottom + gap;
    let left = t.left;
    top = Math.max(margin, Math.min(top, window.innerHeight - m.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - m.width - margin));
    menuEl.style.top = `${top}px`;
    menuEl.style.left = `${left}px`;
    menuEl.style.setProperty("--country-select-shift", flipUp ? "-4px" : "4px");
    menuEl.style.visibility = "visible";
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    setActive(selectedIndex);
    setOpen((o) => !o);
  };

  const pick = (opt) => {
    setOpen(false);
    onChange?.(opt.value);
  };

  const onTriggerKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
  };

  const onListKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      /* El menú vive en un portal: sin cortar la propagación, el Escape
         seguiría subiendo al `document` y cerraría también el modal que lo
         contiene (el `useEscapeKey` global escucha ahí). */
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[active];
      if (opt) pick(opt);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={openMenu}
        onKeyDown={onTriggerKeyDown}
        className="w-full cursor-pointer appearance-none rounded-xl border border-default bg-surface-2/60 py-2 pl-11 pr-9 text-left text-sm text-fg transition-colors focus:outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/12 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800/60"
      >
        {renderTrigger ? (
          renderTrigger(selected)
        ) : (
          <span className="block truncate">{selected ? selected.label : placeholder}</span>
        )}
      </button>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </span>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            onKeyDown={onListKeyDown}
            className="fixed z-[var(--z-popover)] max-h-72 w-[min(20rem,calc(100vw-1rem))] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)] backdrop-blur-xl animate-menu-in"
            style={{ top: 0, left: 0, visibility: "hidden" }}
          >
            {options.map((opt, i) => {
              const isSel = opt.value === value;
              return (
                <div
                  key={opt.value}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={isSel}
                  tabIndex={-1}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    i === active ? "bg-slate-900/5 dark:bg-white/5" : "",
                    isSel && "font-semibold text-brand-600 dark:text-brand-300",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt);
                  }}
                >
                  {renderOption ? (
                    renderOption(opt, isSel)
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  )}
                  {isSel && <Check className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

/* Opción de país: bandera + nombre + `+código`. La usan los consumidores de
   `CountrySelect` para la fila del panel. */
export function CountryOption({ code, label, dial, any = false }) {
  return (
    <>
      <span className="flex h-4 w-6 shrink-0 items-center justify-center">
        {any ? (
          <span className="text-muted">—</span>
        ) : (
          <PhoneFlag code={code} className="h-3.5 w-5 rounded-[2px]" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!any && <span className="shrink-0 text-xs text-ink-muted">+{dial}</span>}
    </>
  );
}
