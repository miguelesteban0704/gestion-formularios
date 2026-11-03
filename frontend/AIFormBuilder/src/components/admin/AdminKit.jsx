import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils.js";
import { CardSurface } from "../ui/CardSurface.jsx";
import "./admin.css";

/* ═══════════════════════════════════════════════════════════════════════
   Primitivas del panel de gestión.

   Todas delegan en el sistema de tarjetas del sitio (`card-surface`,
   `CardSurface`, tokens `--card-*`), igual que la portada de invitados.
   Ninguna escribe un color por su cuenta: el acento sale de
   `--card-accent`, que por omisión es el de la marca.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Cabecera de página ─────────────────────────────────────────────────
   Mismo lenguaje que el resto del panel: título grande, eyebrow con punto de marca
   y descripción en `text-ink-muted`. El contador se escribe en la
   interfaz además de anunciarse por `aria-live`. */
export function AdminHeader({ eyebrow, title, description, children }) {
  return (
    <header className="adm-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ "--i": 0 }}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            <span className="adm-dot text-brand-500" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/* ── Superficie de tarjeta ──────────────────────────────────────────────
   Misma superficie que NavCard y StatCard: `card-surface` + `CardSurface`
   (mesh, grano, filo). `as` permite usarla como `section`, `div` o
   `article` sin duplicar markup. */
export function AdminPanel({ as: Tag = "div", interactive = false, className, children, style, ...rest }) {
  return (
    <Tag
      className={cn(
        "card-surface",
        interactive && "hover:-translate-y-0.5",
        className
      )}
      style={{ "--card-backdrop": "none", ...style }}
      {...rest}
    >
      <CardSurface />
      <div className="relative z-10">{children}</div>
    </Tag>
  );
}

/* ── Campo de búsqueda ──────────────────────────────────────────────────
   Mismo aspecto que Input de Input.jsx. El icono es `pointer-events-none`
   para no robar el clic al input, y el `type="search"` da la "x" nativa. */
export function SearchField({ value, onChange, placeholder, label, className, onSubmit }) {
  const id = useId();
  return (
    <form
      className={cn("min-w-0", className)}
      role="search"
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
    >
      {label && <label className="adm-label" htmlFor={id}>{label}</label>}
      <div className="group relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors duration-200 group-focus-within:text-brand-400"
          strokeWidth={1.7}
          aria-hidden="true"
        />
        <input
          id={id}
          type="search"
          role="searchbox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="adm-field-premium pl-10 pr-10"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Limpiar búsqueda"
            className="adm-icon-btn adm-icon-btn-hover absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </form>
  );
}

/* ── Select ─────────────────────────────────────────────────────────────
   Lista con teclado completa (↑ ↓ Inicio Fin Esc Enter). El trigger usa
   el mismo aspecto que `adm-field`; el listbox es una tarjeta
   `card-surface` con `CardSurface`, igual que los dropdowns del sitio. */
export function SelectField({
  value,
  onChange,
  options = [],
  label,
  id: idProp,
  placeholder,
  disabled,
  className,
  listboxLabel,
}) {
  const rtId = useId();
  const id = idProp || rtId;
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value)) || null;

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const i = options.findIndex((o) => String(o.value) === String(value));
    setActive(i >= 0 ? i : 0);
  }, [open, options, value]);

  const choose = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && ["ArrowDown", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (options[active]) choose(options[active]); }
  };

  useEffect(() => {
    if (open && options[active]) {
      document.getElementById(`${listboxId}-${active}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active, listboxId, options]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {label && <span className="adm-label" id={`${id}-label`}>{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={label ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="adm-field-premium flex items-center gap-2 text-left"
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>
          {selected?.label ?? placeholder ?? "—"}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={listboxLabel || label}
          className="card-surface absolute z-40 mt-2 max-h-72 w-full overflow-hidden p-1.5 animate-scale-in"
        >
          <CardSurface />
          <div className="relative z-10 max-h-72 overflow-y-auto scrollbar-thin">
            {options.length === 0 && <p className="px-3 py-5 text-center text-sm text-muted">Sin opciones</p>}
            {options.map((opt, i) => {
              const isSel = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  id={`${listboxId}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  tabIndex={-1}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(opt)}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm transition-colors duration-150",
                    i === active && "bg-brand-500/10",
                    isSel && "font-semibold text-fg"
                  )}
                >
                  {opt.icon && <opt.icon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.7} aria-hidden="true" />}
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  {isSel && <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" strokeWidth={2} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tarjeta de métrica ─────────────────────────────────────────────────
   Mismo patrón que StatCard de Card.jsx: `card-surface` + `CardSurface`,
   icono en `card-icon` con borde del acento, valor grande en `text-ink`,
   label en `text-ink-muted`. Los tonos son los mismos semánticos del
   sitio (brand/green/amber/blue). */
export function StatTile({ icon: Icon, label, value, hint, tone = "accent", className }) {
  const tones = {
    accent: "var(--color-brand-600)",
    success: "#059669",
    warning: "#d97706",
    info: "#2563eb",
  };
  const tint = tones[tone] || tones.accent;
  return (
    <div
      className={cn("card-surface group relative overflow-visible p-5", className)}
      style={{ "--card-accent": tint, "--card-backdrop": "none" }}
    >
      <CardSurface />

      {/* Brillo superior: 1px que se apaga hacia los lados. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[var(--card-accent)]/40 to-transparent"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium tracking-wide text-ink-muted">{label}</p>
          <p className="mt-2 text-[30px] font-bold leading-none tracking-tight text-ink tabular-nums">
            {value}
          </p>
          {hint && <p className="mt-1.5 text-xs font-medium text-ink-muted">{hint}</p>}
        </div>
        {Icon && (
          <div
            className="card-icon relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border backdrop-blur-sm transition-transform duration-300 group-hover:scale-105"
            style={{
              borderColor: `color-mix(in srgb, ${tint} 22%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${tint} 10%, transparent)`,
              color: `color-mix(in srgb, ${tint} 78%, var(--fg))`,
            }}
            aria-hidden="true"
          >
            <Icon className="relative h-5 w-5" strokeWidth={1.9} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Botón de icono de fila ───────────────────────────────────────────── */
export function RowAction({ icon: Icon, label, onClick, danger, disabled, tone }) {
  const color = tone
    ? { color: `color-mix(in srgb, ${tone} 76%, var(--fg))` }
    : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={color}
      className={cn(
        "adm-icon-btn adm-icon-btn-hover adm-icon-btn-off",
        danger && "adm-icon-btn-danger"
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.7} />
    </button>
  );
}

/* ── Estado vacío ───────────────────────────────────────────────────────
   Mismo patrón que EmptyState de Feedback.jsx: icono en bg-brand-50,
   título en `text-ink`, descripción en `text-ink-muted`. `aria-live` para
   que un filtro que no devuelve nada lo anuncie. */
export function EmptyState({ icon: Icon = Search, title, hint, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)} role="status" aria-live="polite">
      {Icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/30 dark:text-brand-300">
          <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
        </div>
      )}
      <p className="text-lg font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{hint}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/* El diálogo de confirmación vive en src/feedback (ConfirmProvider.tsx).
   Este módulo lo re-exporta para no romper a los consumidores heredados
   (Users, Entities, AccessUrls y el layout), que siguen importándolo de aquí. */
export { ConfirmProvider, useConfirm } from "../../feedback/ConfirmProvider.tsx";

/* ── Aviso de autenticación ─────────────────────────────────────────────
   El aviso de «sesión iniciada» lleva la insignia del rol y su alcance.
   Nació para el super_admin (el acceso más raro y de más consecuencia) y
   ahora lo comparten los tres roles de gestión. */
const AUTH_ALERT = {
  super_admin: {
    badge: "SUPER ADMIN",
    subject: "Super administrador",
    scope: "Gestión de usuarios, entidades y URLs habilitada.",
  },
  entity_admin: {
    badge: "GESTOR DE ENTIDAD",
    subject: "Gestor de Entidad",
    scope: "Gestión de los formularios y las cuentas de la entidad habilitada.",
  },
  form_creator: {
    badge: "GESTOR DE FORMULARIOS",
    subject: "Gestor de Formularios",
    scope: "Creación y edición de formularios de la entidad habilitada.",
  },
};

export function notifyAuthAlert({ name, role, entityName, method = "local" } = {}) {
  const cfg = AUTH_ALERT[role] || AUTH_ALERT.super_admin;
  const subject = name?.trim() || cfg.subject;
  const how = method === "idp" ? "proveedor de identidad" : "acceso local";
  const scope = entityName ? `Alcance: ${entityName}.` : cfg.scope;
  toast.success(
    { title: `Sesión iniciada · ${subject}`, badge: cfg.badge },
    { description: `Autenticación por ${how}. ${scope}` }
  );
}

/** Compatibilidad: el caso del super_admin conserva su propio nombre. */
export function notifySuperAdminAuth({ name, entityName, method = "local" } = {}) {
  notifyAuthAlert({ name, role: "super_admin", entityName, method });
}

/* ── Aviso de resultado ───────────────────────────────────────────────── */
export function notifySaved(message) {
  toast.success({ title: message, badge: "GUARDADO" });
}

export function notifyDeleted(what) {
  toast.success({ title: `${what} eliminado`, badge: "ELIMINADO" });
}

export function notifyError(error) {
  toast.error({ title: "No se pudo completar", badge: "ERROR", description: error?.message });
}

export { Loader2, Trash2, Check };
