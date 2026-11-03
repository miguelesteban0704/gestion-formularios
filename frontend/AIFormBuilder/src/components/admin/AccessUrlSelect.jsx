import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link2, Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { CardSurface } from "../ui/CardSurface.jsx";
import "./admin.css";

/* ═══════════════════════════════════════════════════════════════════════
   Select premium de URL de acceso (mismo lenguaje visual que EntitySelect).

   - Disparador `adm-field-premium` con chip de icono, slug en mono y estado.
   - Desplegable `card-surface` + `CardSurface` con filas ricas (slug, entidad
     y pastilla Activa/Inactiva) y navegación por teclado completa.
   - Controlado: `value` es el `_id` de la URL (o ""), `onChange(_id)`.

   Caben pocas URLs por entidad+rol, así que no lleva buscador (a diferencia
   de EntitySelect, que agrupa 80+ entidades).
   ═══════════════════════════════════════════════════════════════════════ */

export function AccessUrlSelect({
  id: idProp,
  value = "",
  onChange,
  onBlur,
  options = [],
  disabled,
  placeholder,
  invalid,
  ariaLabel,
}) {
  const rt = useRoleT();
  const rtId = useId();
  const baseId = idProp || `access-url-${rtId}`;
  const listboxId = `${baseId}-listbox`;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const triggerRef = useRef(null);

  const selected = useMemo(() => options.find((o) => o._id === value) || null, [options, value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const i = options.findIndex((o) => o._id === value);
    setActive(i >= 0 ? i : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (open && options[active]) {
      document.getElementById(`${listboxId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active, listboxId, options]);

  const closeMenu = (restoreFocus) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const choose = (opt) => {
    onChange?.(opt._id);
    closeMenu(true);
  };

  const onKeyDown = (event) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options[active]) choose(options[active]);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={baseId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu(false) : setOpen(true))}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={cn(
          "adm-field-premium group/access-url flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-fg",
          disabled && "cursor-not-allowed opacity-60",
          invalid && "border-danger/40"
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-500/15 bg-brand-500/10 text-brand-600 transition-colors group-hover/access-url:bg-brand-500/15 dark:text-brand-300">
          <Link2 className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="adm-mono block truncate font-semibold">{`/a/${selected.slug}`}</span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                {selected.entityName || ariaLabel || rt("entity")}
              </span>
            </>
          ) : (
            <span className="font-medium text-muted">{placeholder}</span>
          )}
        </span>
        {selected && selected.isActive === false && <StateBadge inactive label={rt("inactive")} />}
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="card-surface absolute z-40 mt-2 max-h-[min(24rem,calc(100dvh-8rem))] w-full overflow-hidden animate-scale-in"
          style={{ "--card-backdrop": "none" }}
        >
          <CardSurface />
          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="relative z-10 max-h-[min(22rem,calc(100dvh-11rem))] overflow-y-auto scrollbar-thin p-1.5"
          >
            {options.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted" role="status">
                {placeholder}
              </p>
            )}
            {options.map((opt, i) => {
              const isSel = opt._id === value;
              return (
                <button
                  key={opt._id}
                  id={`${listboxId}-option-${i}`}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  tabIndex={-1}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(opt)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-fg transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/60",
                    i === active && "bg-surface-2",
                    isSel && "font-semibold"
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand-500/15 bg-brand-500/10 text-brand-600 dark:text-brand-300" aria-hidden="true">
                    <Link2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="adm-mono block truncate font-semibold">{`/a/${opt.slug}`}</span>
                    {opt.entityName && <span className="mt-0.5 block truncate text-xs text-muted">{opt.entityName}</span>}
                  </span>
                  {opt.isActive === false && <StateBadge inactive label={rt("inactive")} />}
                  {isSel && <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" strokeWidth={1.8} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Pastilla de estado compacta (solo semántica: nunca mezcla con marca). */
function StateBadge({ inactive, label }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        inactive ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
      )}
    >
      {label}
    </span>
  );
}
