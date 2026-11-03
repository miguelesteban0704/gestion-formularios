import { useEffect, useId } from "react";
import {
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  Rows2,
  Rows3,
  Search,
  X,
} from "lucide-react";
import { Card } from "../ui/Card.jsx";
import { CardSurface } from "../ui/CardSurface.jsx";
import { Dropdown, MenuItem } from "../ui/Dropdown.jsx";
import { Tooltip } from "../ui/Tooltip.jsx";
import { Pill } from "./AdminTable.jsx";
import { EmptyState } from "./AdminKit.jsx";
import { cn } from "@/shared/skills";
import { accents } from "@/shared/styles/tokens";
import "./admin.css";

/* ═══════════════════════════════════════════════════════════════════════
   Chrome de la lista de tarjetas del panel de gestión.

   Todas las páginas con listado (Formularios publicados, Usuarios,
   Entidades, URLs de acceso y Auditoría) comparten UNA sola pieza de
   interfaz: cabecera de columnas, toolbar de orden/densidad, chips de
   filtro, disparador del overlay AppleSpotlight y las dos superficies de
   fila (tarjeta suelta o fila conectada). Vive aquí para que el diseño
   no se copie —y no se desincronice— de página en página.
   ═══════════════════════════════════════════════════════════════════════ */

// Plataforma para el badge de atajo del disparador: ⌘ en mac, Ctrl en el resto.
const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");

// Paleta de acentos alternada por posición: la misma del FormCard, para que
// cada fila de la lista gane ritmo visual sin traer su propio color.
// Los colores que coinciden con la paleta de tarjeta del bento vienen de
// `@/shared/styles/tokens` (var(--accent-*)); el resto son tonos propios de
// la lista (no del sitio) y se dejan como están.
const STRIP = [
  { color: "var(--color-brand-600)" },
  { color: "#4f7cc0" },
  { color: accents.purple },
  { color: "#c79235" },
  { color: accents.coral },
  { color: accents.teal },
  { color: "#5e7fb8" },
  { color: "#b06ca0" },
];

/* ── Chip de filtro activo ──────────────────────────────────────────────
   Muestra un filtro concreto con su "x" y lo limpia al pulsarlo. */
export function FilterChip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-500/10 py-1 pl-3 pr-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-500/15 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-300"
    >
      <span className="truncate">{label}</span>
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-700 dark:bg-brand-400/15 dark:text-brand-300">
        <X className="h-3 w-3" aria-hidden="true" />
      </span>
    </button>
  );
}

/**
 * Celda de la cabecera de columnas: icono tenue del color de marca + label
 * en la voz `adm-label` del panel (11px, bold, mayúsculas). `adm-rise` la
 * hace entrar escalonada (respeta `prefers-reduced-motion`).
 */
export function ColumnHead({ icon: Icon, label, index }) {
  return (
    <span
      className="adm-rise flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-ink-muted"
      style={{ "--i": index }}
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0 text-brand-600/75 dark:text-brand-400/75"
        strokeWidth={1.9}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * Control segmentado del panel de filtros (misma voz que el toggle de
 * densidad: grosor de celda, `shadow-soft` en la activa). Cada opción
 * puede traer su icono (para "Todos" no hace falta) y su `hint` como
 * `title`. Va con `flex-wrap` porque aquí conviven hasta seis opciones.
 */
export function Segmented({ options = [], value, onChange, ariaLabel }) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-surface-2/70 p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.id || "all"}
          type="button"
          aria-pressed={value === opt.id}
          title={opt.hint}
          onClick={() => onChange(opt.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            value === opt.id
              ? // Activa en la marca guardada (`accent.js` reescribe
                // `--color-brand-*` en <html>): misma voz que FilterChip.
                "bg-brand-500/10 text-brand-700 shadow-soft dark:bg-brand-400/10 dark:text-brand-300"
              : "text-ink-muted hover:text-ink"
          )}
        >
          {opt.icon ?? null}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Disparador del overlay AppleSpotlight: reutiliza el shell premium
 * (`.premium-search-*`) con icono; el atajo ⌘K / Ctrl K no vive dentro
 * del campo sino en un tooltip de sistema al pasar el ratón. El panel de
 * resultados vive en el overlay, no aquí.
 */
export function SpotlightTrigger({ id, label, placeholder, ariaLabel, onClick }) {
  return (
    <div className="premium-search">
      <p className="adm-label">{label}</p>
      <Tooltip
        content={IS_MAC ? "⌘ K" : "Ctrl K"}
        side="bottom"
        className="flex w-full"
        contentClassName="font-semibold tracking-wide"
      >
        <button
          type="button"
          id={id}
          onClick={onClick}
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          aria-label={ariaLabel || label}
          className="adm-live-search-shell premium-search-shell premium-search-shell--highlight w-full cursor-pointer text-left"
        >
          {/* Fila propia icono + texto: el `items-center` de esta
              envolvente garantiza que la lupa y el placeholder compartan
              la misma línea horizontal. */}
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="adm-live-search-icon-wrap">
              <Search className="adm-live-search-icon" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="premium-search-trigger-text truncate">{placeholder}</span>
          </span>
        </button>
      </Tooltip>
    </div>
  );
}

/**
 * ⌘K / Ctrl K abre (o cierra) el overlay de la página. Va en fase captura
 * para ganarle al listener de la paleta global (bubble, en
 * DashboardLayout); si hay otro diálogo abierto (la paleta u otro modal),
 * no se interpone.
 */
export function useSpotlightHotkey(open, setOpen) {
  useEffect(() => {
    const onGlobalKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    };
    document.addEventListener("keydown", onGlobalKey, true);
    return () => document.removeEventListener("keydown", onGlobalKey, true);
  }, [open, setOpen]);
}

/* ── Toolbar del listado: contador + orden + densidad ─────────────────── */
export function ListToolbar({
  countText,
  sorts = [],
  sortBy,
  onSort,
  density,
  onDensity,
  sortAriaLabel = "Ordenar resultados",
  densityAriaLabel = "Densidad de la lista",
  densityATitle = "Vista espaciada",
  densityBTitle = "Vista densa",
}) {
  const currentSort = sorts.find((s) => s.id === sortBy) || sorts[0];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span key={`count-${countText}`} className="adm-live-tick">
        <Pill tone="gold" dot>{countText}</Pill>
      </span>

      <Dropdown
        ariaLabel={sortAriaLabel}
        trigger={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-surface-2/70 px-3 text-xs font-semibold text-ink transition hover:border-brand-500/40"
          >
            <ArrowDownWideNarrow className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            {currentSort?.label}
            <ChevronDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
          </button>
        }
      >
        {sorts.map((s) => (
          <MenuItem key={s.id} onClick={() => onSort(s.id)}>
            <span className="flex flex-1 items-center justify-between gap-2">
              {s.label}
              {sortBy === s.id && (
                <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
              )}
            </span>
          </MenuItem>
        ))}
      </Dropdown>

      <div
        className="flex items-center gap-0.5 rounded-xl border border-[var(--border)] bg-surface-2/70 p-0.5"
        role="group"
        aria-label={densityAriaLabel}
      >
        <button
          type="button"
          aria-pressed={density === "a"}
          title={densityATitle}
          onClick={() => onDensity("a")}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg transition-colors",
            density === "a" ? "bg-surface text-ink shadow-soft" : "text-ink-muted hover:text-ink"
          )}
        >
          <Rows3 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-pressed={density === "b"}
          title={densityBTitle}
          onClick={() => onDensity("b")}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg transition-colors",
            density === "b" ? "bg-surface text-ink shadow-soft" : "text-ink-muted hover:text-ink"
          )}
        >
          <Rows2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Filtra las filas de la tabla con la misma regla del overlay (label +
 * descripción + keywords, case-insensitive): lo que se ve en el
 * AppleSpotlight y lo que queda en la tabla es siempre el mismo
 * conjunto. `anchorOf` debe devolver el mismo `#ancla` que el `link`
 * de cada resultado. Sin consulta devuelve las filas tal cual.
 */
export function applySpotlightQuery(rows, results, query, anchorOf) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return rows;
  const hits = new Set();
  for (const r of results || []) {
    const hay = `${r.label || ""} ${r.description || ""} ${(r.keywords ?? []).join(" ")}`.toLowerCase();
    if (hay.includes(q)) hits.add(r.link);
  }
  return rows.filter((row) => hits.has(anchorOf(row)));
}

/**
 * Sección completa del listado: título + toolbar, chips de filtros
 * activos, cabecera de columnas (solo desktop y solo con filas) y las
 * filas en la densidad pedida —o el estado vacío.
 *
 * Sin roles ARIA de tabla (no hay `role="table"` padre): cada fila se
 * etiqueta a sí misma y los labels viven en la cabecera como texto
 * visible. Las filas se piden con `renderRow(row, i, density)`, que debe
 * devolver el `li` (densidad "b") o la `Card` (densidad "a") ya montado.
 */
export function ListSection({
  title,
  titleId: titleIdProp,
  countText,
  sorts = [],
  sortBy,
  onSort,
  density,
  onDensity,
  sortAriaLabel,
  densityAriaLabel,
  densityATitle,
  densityBTitle,
  chips = [],
  clearAllLabel = "Limpiar todo",
  columns = null,
  colsClass = "",
  rows = [],
  renderRow,
  empty = {},
  className = "mt-10",
}) {
  const autoId = useId();
  const titleId = titleIdProp || autoId;
  const hasRows = rows.length > 0;

  return (
    <section className={className} aria-labelledby={titleId}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-xl font-bold text-fg">
          {title}
        </h2>
        <ListToolbar
          countText={countText}
          sorts={sorts}
          sortBy={sortBy}
          onSort={onSort}
          density={density}
          onDensity={onDensity}
          sortAriaLabel={sortAriaLabel}
          densityAriaLabel={densityAriaLabel}
          densityATitle={densityATitle}
          densityBTitle={densityBTitle}
        />
      </div>

      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} onClear={chip.onClear} />
          ))}
          <button
            type="button"
            onClick={() => chips.forEach((chip) => chip.onClear())}
            className="text-xs font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {clearAllLabel}
          </button>
        </div>
      )}

      {/* Cabecera de columnas: solo con filas y solo en desktop (en móvil
          cada tarjeta se apila y se entiende sola). Usa la misma rejilla
          que las filas, así las columnas caen exactamente alineadas:
          filete de marca en degradado que cierra la barra. */}
      {columns && hasRows && (
        <div
          className={cn(
            "relative mb-2.5 hidden items-center gap-x-5 gap-y-1 rounded-xl border border-[var(--border)] bg-surface-2/70 px-4 py-2.5 shadow-soft backdrop-blur-sm after:pointer-events-none after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-brand-500/70 after:via-brand-400/30 after:to-transparent after:content-[''] sm:px-5",
            colsClass,
          )}
        >
          {columns.map((c, i) => (
            <ColumnHead key={c.label} icon={c.icon} label={c.label} index={i} />
          ))}
        </div>
      )}

      {!hasRows ? (
        <div className="card-surface overflow-hidden" style={{ "--card-backdrop": "none" }}>
          <CardSurface />
          <EmptyState
            icon={empty.icon}
            title={empty.title || "Sin resultados"}
            hint={empty.hint}
            className="relative z-10"
          />
        </div>
      ) : density === "b" ? (
        <div className="card-surface overflow-visible" style={{ "--card-backdrop": "none" }}>
          <CardSurface />
          <ul className="relative z-10 divide-y divide-[var(--border)]">
            {rows.map((row, i) => renderRow(row, i, "b"))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => renderRow(row, i, "a"))}
        </div>
      )}
    </section>
  );
}

/**
 * Superficie de una fila, en las dos densidades del design sheet:
 *  - "a" (Espaciado): `Card` independiente con su acento de la paleta.
 *  - "b" (Denso): `li` sin marco, pensada para montarse dentro de un
 *    único panel conectado con `divide-y` (lo pone `ListSection`).
 */
export function RowShell({ id, index = 0, density = "a", className, children }) {
  if (density === "b") {
    return (
      <li
        id={id}
        className={cn(
          "group/card relative scroll-mt-24 px-4 py-3.5 transition-colors duration-200 hover:bg-surface-2 sm:px-5 first:rounded-t-[var(--card-radius)] last:rounded-b-[var(--card-radius)]",
          className,
        )}
      >
        {children}
      </li>
    );
  }

  return (
    <Card
      hover
      id={id}
      className={cn("group/card relative scroll-mt-24 overflow-visible", className)}
      style={{ "--card-accent": STRIP[index % STRIP.length].color }}
    >
      <div className="p-4 sm:p-5">{children}</div>
    </Card>
  );
}

/**
 * Barra de resumen (aria-live) entre el panel de filtros y la lista:
 * cuenta lo que hay a la vista y el filtro que lo reduce, con el mismo
 * "tick" de entrada que el contador del toolbar.
 */
export function SummaryBar({ icon: Icon, tickKey, children }) {
  return (
    <div
      className="mt-4 flex items-center gap-3 rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-3.5 text-sm text-fg dark:border-brand-400/20 dark:bg-brand-400/10"
      role="status"
      aria-live="polite"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-500/20 bg-surface-2 text-brand-600 dark:border-brand-400/20 dark:text-brand-300">
        <Icon className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span key={tickKey} className="adm-live-tick min-w-0">
        {children}
      </span>
    </div>
  );
}

/* ── Átomos de contenido de fila ────────────────────────────────────────
   Mismas piezas que usa PublicFormCard, para que una fila de usuarios o
   de auditoría hable con la misma voz tipográfica que una de
   formularios. */

export function RowHeading({ children }) {
  return (
    <h3 className="truncate text-[16px] font-semibold tracking-[-0.012em] text-ink">
      {children}
    </h3>
  );
}

export function MetaLine({ children }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-ink-muted">
      {children}
    </div>
  );
}

export const MetaDot = () => (
  <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-[var(--border)]" />
);

export function IconPill({ icon: Icon, title, children }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] bg-surface-2 px-2 py-[3px] text-xs font-semibold text-ink-muted"
      title={title}
    >
      <Icon
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-300"
      />
      <span className="truncate">{children}</span>
    </span>
  );
}
