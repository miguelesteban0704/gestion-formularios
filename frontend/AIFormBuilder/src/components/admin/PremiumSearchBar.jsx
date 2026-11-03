import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronRight, FileText, Search, X } from "lucide-react";
import { cn } from "../../lib/utils.js";

// Plataforma para el badge de atajo: ⌘ en mac, Ctrl en el resto.
const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");

/**
 * Barra de búsqueda PREMIUM estilo SaaS B2B con panel de resultados en vivo.
 *
 * Estética ejecutiva (tokens `--search-*` en `admin.css`): superficie gris
 * fría con trazo fino, sombra suave en reposo; ring de luz + elevación al
 * enfocar; icono minimalista (stroke 1.5) gris apagado que se tiñe con el
 * acento; badge de atajo ⌘K/Ctrl K; × de limpiar con ripple; spinner que
 * sustituye al icono durante el fetch.
 *
 * Atajo: ⌘K/Ctrl K enfoca este campo (en fase captura, y solo si no hay un
 * diálogo abierto — si la paleta global está visible, ella manda).
 *
 * La página dueña de Entidad/Visibilidad (SIN filtros internos) y del
 * debounce al servidor; el filtrado del panel es local e instantáneo sobre
 * `results` y `onSelect` recibe el item elegido.
 */
export function PremiumSearchBar({
  value,
  onChange,
  results = [],
  onSelect,
  placeholder = "Buscar formularios…",
  label,
  id: idProp,
  maxResults = 7,
  ariaLabel,
  pending = false,
  panelTitle = "Resultados en vivo",
  resultsNoun = "formularios",
  emptyTitle = "Sin coincidencias",
  emptySub = "Prueba con otro término",
  className,
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const listId = `${id}-premium-list`;
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [ripple, setRipple] = useState(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return results
      .filter((item) => {
        const hay = `${item.title || ""} ${item.entityName || ""} ${item.ownerName || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, maxResults);
  }, [results, value, maxResults]);

  const showPanel = open && focused && value.trim().length > 0;

  useEffect(() => {
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // ⌘K / Ctrl K enfoca este campo. Va en fase captura para ganarle al
  // listener de la paleta global (bubble, en DashboardLayout); si hay un
  // diálogo abierto (la paleta misma u otro modal), no se interpone.
  useEffect(() => {
    const onGlobalKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    document.addEventListener("keydown", onGlobalKey, true);
    return () => document.removeEventListener("keydown", onGlobalKey, true);
  }, []);

  useEffect(() => {
    if (!showPanel) return;
    const el = document.getElementById(`${listId}-item-${active}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [showPanel, active, listId]);

  const clear = (e) => {
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setRipple({ x: rect.width / 2, y: rect.height / 2 });
      setTimeout(() => setRipple(null), 420);
    }
    onChange("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const choose = (item) => {
    onSelect?.(item);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (showPanel) setOpen(false);
      else if (value) clear();
      return;
    }
    if (!showPanel) {
      if (e.key === "ArrowDown" && value.trim()) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    }
  };

  return (
    <div ref={wrapRef} className={cn("premium-search", className)} role="search">
      {label && (
        <label className="adm-label" htmlFor={id}>
          {label}
        </label>
      )}

      <div
        className="adm-live-search-shell premium-search-shell"
        data-filled={value ? "true" : "false"}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!wrapRef.current?.contains(e.relatedTarget)) setFocused(false);
        }}
      >
        <span className="adm-live-search-aura" aria-hidden="true" />
        <span className="adm-live-search-ring" aria-hidden="true" />

        {/* Icono minimalista (stroke 1.5); el spinner lo sustituye
            mientras hay fetch en curso. */}
        <span className="adm-live-search-icon-wrap">
          {pending && value.trim() ? (
            <span className="adm-live-search-pending" role="status" aria-label="Buscando" />
          ) : (
            <Search className="adm-live-search-icon" strokeWidth={1.5} aria-hidden="true" />
          )}
        </span>

        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel || label || placeholder}
          aria-keyshortcuts="Meta+K Control+K"
          value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className="adm-live-search-input"
          onChange={(e) => {
            onChange(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            if (value.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />

        {/* Badge de atajo: se atenúa al enfocar o con texto (entra el ×). */}
        <kbd className="premium-search-kbd" data-hidden={value ? "true" : "false"} aria-hidden="true">
          {IS_MAC ? "⌘ K" : "Ctrl K"}
        </kbd>

        <button
          type="button"
          className="adm-live-search-clear"
          data-visible={value ? "true" : "false"}
          aria-label="Limpiar búsqueda"
          tabIndex={value ? 0 : -1}
          onClick={clear}
        >
          {ripple && (
            <span className="adm-live-search-ripple" style={{ left: ripple.x, top: ripple.y }} />
          )}
          <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </button>

        <span className="adm-live-search-line" aria-hidden="true" />
      </div>

      {/* El panel va FUERA del shell: este recorta con `overflow: hidden`
          (aura, filete y ripple) y se lo comería entero. */}
      {showPanel && (
        <div
          className="premium-search-panel"
          role="listbox"
          id={listId}
          aria-label={ariaLabel || label || panelTitle}
        >
            <div className="premium-search-hero" aria-hidden="true">
              <span className="premium-search-hero-icon">
                <FileText className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <span className="premium-search-hero-meta">
                <span className="premium-search-hero-title">{panelTitle}</span>
                <span className="premium-search-hero-count">
                  {filtered.length} {filtered.length === 1 ? resultsNoun.replace(/s$/, "") : resultsNoun}
                </span>
              </span>
            </div>

            {filtered.length > 0 ? (
              <div className="premium-search-list">
                {filtered.map((item, i) => (
                  <button
                    key={item._id || item.title || i}
                    type="button"
                    id={`${listId}-item-${i}`}
                    role="option"
                    aria-selected={i === active}
                    data-active={i === active ? "true" : "false"}
                    className="premium-search-item"
                    style={{ "--i": i }}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(item)}
                  >
                    <span className="premium-search-item-avatar" aria-hidden="true">
                      {item.entityName ? item.entityName.charAt(0) : "?"}
                    </span>
                    <span className="premium-search-item-body">
                      <span className="premium-search-item-title">{item.title}</span>
                      <span className="premium-search-item-sub">
                        {[item.entityName, item.ownerName].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    {item.responses != null || item.views != null ? (
                      <span className="premium-search-item-stats">
                        {item.responses != null && (
                          <span className="premium-search-item-stat">
                            <span className="premium-search-item-stat-value">{item.responses}</span>
                            <span className="premium-search-item-stat-label">respuestas</span>
                          </span>
                        )}
                        {item.views != null && (
                          <span className="premium-search-item-stat">
                            <span className="premium-search-item-stat-value">{item.views}</span>
                            <span className="premium-search-item-stat-label">vistas</span>
                          </span>
                        )}
                      </span>
                    ) : (
                      <ChevronRight
                        className="premium-search-item-chevron"
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="premium-search-empty">
                <span className="premium-search-empty-icon" aria-hidden="true">
                  <FileText className="h-7 w-7" strokeWidth={1.5} />
                </span>
                <p className="premium-search-empty-title">{emptyTitle}</p>
                <p className="premium-search-empty-sub">{emptySub}</p>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
