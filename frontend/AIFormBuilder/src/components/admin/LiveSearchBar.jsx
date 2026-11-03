import { useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils.js";

/**
 * Campo de búsqueda del panel de filtros — look "premium" materializado:
 * aura de marca que despierta al hover/focus, ring exterior, icono en badge
 * tintado, filete de acento con glow, ripple al limpiar y spinner de carga.
 *
 * Sin panel flotante de resultados (la lista de abajo ya se filtra en vivo
 * con debounce de la página) y sin atajo ⌘K propio: la paleta global del
 * layout es la dueña de ese atajo.
 *
 * Escape borra el término; el botón X aparece solo con valor.
 */
export function LiveSearchBar({
  value,
  onChange,
  placeholder = "Buscar…",
  label,
  id: idProp,
  ariaLabel,
  pending = false,
  className,
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const inputRef = useRef(null);
  const [ripple, setRipple] = useState(null);

  const clear = (e) => {
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setRipple({ x: rect.width / 2, y: rect.height / 2 });
      setTimeout(() => setRipple(null), 420);
    }
    onChange("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape" && value) {
      e.preventDefault();
      clear();
    }
  };

  return (
    <div className={cn("adm-live-search", className)} role="search">
      {label && (
        <label className="adm-label" htmlFor={id}>
          {label}
        </label>
      )}

      <div className="adm-live-search-shell">
        <span className="adm-live-search-aura" aria-hidden="true" />
        <span className="adm-live-search-ring" aria-hidden="true" />

        <span className="adm-live-search-icon-wrap">
          <Search className="adm-live-search-icon" strokeWidth={1.8} aria-hidden="true" />
        </span>

        <input
          ref={inputRef}
          id={id}
          type="search"
          role="searchbox"
          aria-label={ariaLabel || label || placeholder}
          aria-busy={pending}
          value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className="adm-live-search-input"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />

        {pending && value.trim() ? (
          <span className="adm-live-search-pending" role="status" aria-label="Buscando" />
        ) : null}

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
    </div>
  );
}
