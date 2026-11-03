import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Landmark, Building2, Banknote, Network, MapPin, Search, Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { CardSurface } from "../ui/CardSurface.jsx";
import "./admin.css";

const CATEGORY_META = {
  organos_estatales: { icon: Landmark, es: "Órganos Estatales", en: "State Bodies" },
  oace: { icon: Building2, es: "OACE · Ministerios", en: "OACE · Ministries" },
  financieras: { icon: Banknote, es: "Financieras", en: "Financial" },
  rectoras: { icon: Network, es: "Rectoras", en: "Governing" },
  locales: { icon: MapPin, es: "Poder Popular", en: "People's Power" },
};

/**
 * Selector de entidades super moderno: búsqueda integrada, agrupación por
 * categoría, icono sutil por categoría y previsualización del tipo al elegir.
 * Controlado: `value` es el `_id` (o ""), `onChange` recibe la entidad.
 */
export function EntitySelect({ entities = [], value = "", onChange, placeholder, ariaLabel }) {
  const rt = useRoleT();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const instanceId = useId();
  const listboxId = `entity-options-${instanceId}`;

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  const selected = useMemo(
    () => entities.find((e) => e._id === value) || null,
    [entities, value]
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? entities.filter((e) => String(e.name || "").toLowerCase().includes(q) || String(e.code || "").toLowerCase().includes(q))
      : entities;
    const map = new Map();
    for (const e of list) {
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category).push(e);
    }
    return [...map.entries()];
  }, [entities, query]);

  const groupedOptions = useMemo(() => {
    let index = 0;
    return groups.map(([category, items]) => [
      category,
      items.map((entity) => ({ entity, index: index++ })),
    ]);
  }, [groups]);
  const visibleEntities = useMemo(
    () => groupedOptions.flatMap(([, items]) => items.map(({ entity }) => entity)),
    [groupedOptions]
  );
  const SelectedIcon = selected ? CATEGORY_META[selected.category]?.icon || Landmark : null;
  const activeOption = visibleEntities[activeIndex];
  const activeOptionId = open && activeOption ? `${listboxId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (activeOptionId) {
      document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeOptionId]);

  const openMenu = (focusSearch = false) => {
    setOpen(true);
    setActiveIndex(0);
    if (focusSearch || !window.matchMedia("(pointer: coarse)").matches) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  };

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectEntity = (entity) => {
    onChange?.(entity);
    closeMenu(true);
  };

  const handleTriggerKeyDown = (event) => {
    if (!open && ["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openMenu(true);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "ArrowDown" && visibleEntities.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleEntities.length - 1));
    } else if (event.key === "ArrowUp" && visibleEntities.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home" && visibleEntities.length) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && visibleEntities.length) {
      event.preventDefault();
      setActiveIndex(visibleEntities.length - 1);
    } else if (event.key === "Enter" && activeOption) {
      event.preventDefault();
      selectEntity(activeOption);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={handleTriggerKeyDown}
        aria-label={`${ariaLabel || rt("entity")}: ${selected?.name || placeholder || rt("searchEntities")}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="adm-field-premium group/entity-select flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-fg"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-500/15 bg-brand-500/10 text-brand-600 transition-colors group-hover/entity-select:bg-brand-500/15 dark:text-brand-300">
          {SelectedIcon ? <SelectedIcon className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" /> : <MapPin className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate font-semibold">{selected.name}</span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                {CATEGORY_META[selected.category]?.[language] || selected.category}
              </span>
            </>
          ) : (
            <span className="font-medium text-muted">{placeholder || rt("searchEntities")}</span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} strokeWidth={1.7} aria-hidden="true" />
      </button>

      {open && (
        <div className="card-surface absolute z-40 mt-2 max-h-[min(28rem,calc(100dvh-8rem))] w-full overflow-hidden animate-scale-in" style={{ "--card-backdrop": "none" }}>
          <CardSurface />
          <div className="relative z-10">
            <div className="sticky top-0 z-10 bg-[color:var(--card-bg)] px-3.5 py-3 backdrop-blur-2xl">
              <div className="flex items-center gap-2.5 rounded-xl border border-brand-500/20 bg-surface-2/60 px-3 shadow-inner transition-[border-color,background-color,box-shadow] duration-200 focus-within:border-brand-400 focus-within:bg-surface focus-within:ring-4 focus-within:ring-brand-500/10">
                <Search className="h-4 w-4 shrink-0 text-brand-500" strokeWidth={1.7} aria-hidden="true" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={rt("searchEntities")}
                  aria-label={ariaLabel ? `${rt("searchEntities")}: ${ariaLabel}` : rt("searchEntities")}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={open}
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                  autoComplete="off"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
                />
              </div>
            </div>
            <div id={listboxId} role="listbox" aria-label={ariaLabel || rt("searchEntities")} className="max-h-[min(23rem,calc(100dvh-13rem))] overflow-y-auto scrollbar-thin p-2">
            {groupedOptions.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted" role="status">{rt("noResults")}</p>
            )}
            {groupedOptions.map(([category, items]) => {
              const meta = CATEGORY_META[category] || { icon: Landmark };
              const Icon = meta.icon;
              const groupLabelId = `${listboxId}-group-${category}`;
              return (
                <div key={category} role="group" aria-labelledby={groupLabelId} className="mb-2 last:mb-0">
                  <p id={groupLabelId} className="flex items-center gap-2 px-2.5 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
                    {meta[language] || category} · {items.length}
                  </p>
                  {items.map(({ entity, index }) => (
                    <button
                      key={entity._id}
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={entity._id === value}
                      tabIndex={-1}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => selectEntity(entity)}
                      className={cn(
                        "flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-fg transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/60",
                        index === activeIndex && "bg-surface-2",
                        entity._id === value && "font-semibold"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{entity.name}</span>
                      {entity._id === value && <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" strokeWidth={1.8} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CATEGORY_META };
