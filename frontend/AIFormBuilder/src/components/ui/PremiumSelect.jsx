/*
 * PremiumSelect — Select premium super moderno para campos de elección.
 *
 * Diseño "Creative Glass" con:
 *  • Trigger de cristal con gradiente de marca en el borde (foco) y anillo
 *  • Ícono de acento a la izquierda con fondo de marca suave
 *  • Chevron animado con rotación 180° y escala sutil
 *  • Desplegable en portal (document.body, position: fixed) que nunca se recorta
 *  • Volteo automático hacia arriba si no hay espacio abajo
 *  • Reposición en scroll/resize de la ventana
 *  • Opciones con estados hover (fondo de marca suave) y seleccionado con
 *    gradiente de marca + punto indicador
 *  • Búsqueda integrada con lupa y filtro en tiempo real
 *  • Estados: error (borde rojo), disabled (opacidad), required (asterisco)
 *  • Tooltip elegante encima (municipio pendiente de provincia)
 *  • Animaciones fluidas con framer-motion (entrada del dropdown y opciones)
 *  • Prop `usedValues`: filtra opciones ya seleccionadas en otros campos
 *  • Prop `compact`: modo compacto para LivePreview
 *  • Prop `maxWidth`: ancho máximo del trigger
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "../../lib/utils.js";
import "./PremiumSelect.css";

const triggerBase =
  "refined-select-trigger relative flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all duration-150 cursor-pointer text-left";

const triggerInner =
  "refined-trigger-inner flex items-center gap-0.625 overflow-hidden";

const optionBase =
  "refined-select-option flex w-full items-center gap-0.625 rounded-md border px-3 py-1.5 text-sm transition-all duration-120 cursor-pointer text-left";

const DROPDOWN_HEIGHT = 300;

export function PremiumSelect({
  label,
  icon: Icon,
  options = [],
  value,
  onChange = () => {},
  disabled = false,
  placeholder,
  error = false,
  required = false,
  searchable = false,
  tooltip,
  className,
  language = "es",
  t,
  usedValues = [],      // NEW: valores ya usados en otros campos (para filtrar)
  compact = false,      // NEW: modo compacto para LivePreview
  maxWidth,             // NEW: ancho máximo del trigger
  selectionVariant = "default", // "default" | "scale": estilo del indicador de selección
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState(null);
  const selectRef = useRef(null);
  const triggerRef = useRef(null);

  const placeholderText = placeholder ?? (t ? t("placeholder") : "Seleccionar…");

  const filtered = useMemo(() => {
    return options.filter((opt) => {
      // Filtrar por búsqueda
      if (query) {
        const q = query.toLowerCase();
        if (!String(opt.label).toLowerCase().includes(q)) return false;
      }
      // Filtrar valores ya usados (excepto el valor actual seleccionado)
      if (usedValues.length > 0 && usedValues.includes(opt.value) && opt.value !== value) {
        return false;
      }
      return true;
    });
  }, [options, query, value, usedValues]);

  // Cierra al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        // Si el clic cae dentro del dropdown montado en portal (document.body),
        // no cerrar: dejar que el onClick de la opción dispare la selección.
        if (event.target.closest('[data-dropdown="true"]')) return;
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape cierra
  useEffect(() => {
    if (!isOpen) return;
    function onKey(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const positionDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const flip = trigger.bottom + DROPDOWN_HEIGHT > viewportHeight;
    setRect({
      top: flip ? trigger.top - DROPDOWN_HEIGHT - 10 : trigger.bottom + 10,
      left: trigger.left,
      width: trigger.width,
      flip,
    });
  }, []);

  // Reposiciona mientras está abierto (scroll / resize)
  useEffect(() => {
    if (!isOpen) return;
    positionDropdown();
    window.addEventListener("scroll", positionDropdown, true);
    window.addEventListener("resize", positionDropdown);
    return () => {
      window.removeEventListener("scroll", positionDropdown, true);
      window.removeEventListener("resize", positionDropdown);
    };
  }, [isOpen, positionDropdown]);

  const handleSelect = (opt) => {
    setIsOpen(false);
    setQuery("");
    onChange(opt.value);
  };

  const toggle = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) positionDropdown();
      return next;
    });
    if (!isOpen && searchable) setQuery("");
  };

  const selectedOpt = options.find((o) => o.value === value);

  const triggerClasses = cn(
    triggerBase,
    "refined-select-trigger",
    compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
    maxWidth ? "max-w-[300px]" : "w-full",
    disabled
      ? "cursor-not-allowed bg-slate-200/40 text-slate-400 border-slate-300 dark:bg-slate-800/30 dark:border-slate-600 opacity-70 refined-select-trigger--disabled"
      : "cursor-pointer hover:border-brand-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none",
    error
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 refined-select-trigger--error"
      : "border-slate-300 dark:border-slate-600",
    required ? "border-brand-500" : "",
    className
  );

  const dropdownClasses = cn(
    "max-h-[260px] overflow-auto rounded-md border border-slate-300 bg-white/90 backdrop-blur-xl p-1.5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.18)] dark:border-slate-600 dark:bg-slate-900/85",
    "refined-select-panel",
    disabled ? "pointer-events-none opacity-0" : ""
  );

  // Ajustar rect.width para maxWidth en modo compacto
  const dropdownWidth = maxWidth ? Math.max(rect?.width || 200, 160) : rect?.width;

  return (
    <div ref={selectRef} className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-semibold text-fg dark:text-slate-100">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {/* Tooltip elegante encima (municipio pendiente de provincia) */}
      {tooltip ? (
        <span>
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={toggle}
            className={triggerClasses}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <div className={triggerInner}>
              {Icon && (
                <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-brand-500/10 dark:bg-brand-900/20 border border-brand-500/60 dark:border-brand-800/70 refined-trigger-medallion">
                  <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </div>
              )}
              <span
                className={cn(
                  "truncate min-w-0 text-fg dark:text-slate-100 font-medium",
                  !value && !selectedOpt ? "opacity-60 italic" : ""
                )}
              >
                {selectedOpt?.label || value || placeholderText}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "shrink-0 transition-all duration-200 refined-trigger-chevron",
                isOpen ? "refined-trigger-chevron--open rotate-180" : ""
              )}
            />
          </button>

          {isOpen && !disabled && rect && (
            <>
              {createPortal(
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  data-dropdown="true"
                  className={cn("z-[9999]", dropdownClasses)}
                  style={{
                    position: "fixed",
                    left: rect.left,
                    top: rect.top,
                    minWidth: dropdownWidth,
                    width: dropdownWidth,
                    zIndex: 9999,
                    transformOrigin: rect.flip ? "bottom center" : "top center",
                  }}
                >
                  {/* Igual que en ChronoSelect: el buscador permanece visible sin
                      coincidencias para poder borrar la búsqueda sin cerrar. */}
                  {searchable && (
                    <div className="relative mb-2">
                      <Search
                        className="absolute left-3 top-3 h-4 w-4 opacity-40"
                      />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t ? t("search") : "Buscar…"}
                        className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-surface-2/60 dark:bg-surface-2/80 dark:border-slate-600 dark:text-slate-100 refined-select-search"
                        autoFocus
                      />
                    </div>
                  )}

                  {filtered.length > 0 ? (
                    <AnimatePresence mode="wait">
                      {filtered.map((opt, i) => {
                        const isSelected = opt.value === value;
                        return (
                          <motion.button
                            key={opt.value}
                            type="button"
                            whileHover={{ scale: 1.02, transition: { duration: 0.02 } }}
                            onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}
                            className={cn(
                              optionBase,
                              "refined-select-option",
                              isSelected
                                ? "refined-select-option--selected bg-brand-500/10 border border-brand-500/75 text-brand-700 font-medium dark:bg-brand-900/20 dark:border-brand-700/70 dark:text-brand-300 shadow-[0_0_12px_rgba(0,210,255,0.1)] dark:shadow-[0_0_12px_rgba(0,210,255,0.05)]"
                                : "border-slate-300 dark:border-slate-600 hover:bg-surface-2/60 dark:hover:bg-surface-2/80 hover:text-slate-900 dark:hover:text-slate-100"
                            )}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                          >
                            {selectionVariant !== "scale" && isSelected && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400" />
                            )}
                            <Check
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 refined-select-check",
                                isSelected
                                  ? cn(
                                      "refined-select-check--checked",
                                      selectionVariant === "scale"
                                        ? "text-white dark:text-white"
                                        : "text-brand-600 dark:text-brand-400"
                                    )
                                  : "opacity-0"
                              )}
                            />
                            <span className="flex-1 truncate">
                              {opt.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  ) : (
                    <div className="px-4 py-3 text-sm opacity-60 text-center dark:text-slate-400 italic">
                      {query ? (t ? t("noMatches") : "Sin coincidencias") : (t ? t("noOptions") : "Sin opciones")}
                    </div>
                  )}
                </motion.div>,
                document.body
              )}
            </>
          )}
        </span>
      ) : (
        <>
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={toggle}
            className={triggerClasses}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <div className={triggerInner}>
              {Icon && (
                <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-brand-500/10 dark:bg-brand-900/20 border border-brand-500/60 dark:border-brand-800/70 refined-trigger-medallion">
                  <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </div>
              )}
              <span
                className={cn(
                  "truncate min-w-0 text-fg dark:text-slate-100 font-medium",
                  !value && !selectedOpt ? "opacity-60 italic" : ""
                )}
              >
                {selectedOpt?.label || value || placeholderText}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "shrink-0 transition-all duration-200 refined-trigger-chevron",
                isOpen ? "refined-trigger-chevron--open rotate-180" : ""
              )}
            />
          </button>

          {isOpen && !disabled && rect && (
            <>
              {createPortal(
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  data-dropdown="true"
                  className={cn("z-[9999]", dropdownClasses)}
                  style={{
                    position: "fixed",
                    left: rect.left,
                    top: rect.top,
                    minWidth: dropdownWidth,
                    width: dropdownWidth,
                    zIndex: 9999,
                    transformOrigin: rect.flip ? "bottom center" : "top center",
                  }}
                >
                  {/* Igual que en ChronoSelect: el buscador permanece visible sin
                      coincidencias para poder borrar la búsqueda sin cerrar. */}
                  {searchable && (
                    <div className="relative mb-2">
                      <Search
                        className="absolute left-3 top-3 h-4 w-4 opacity-40"
                      />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t ? t("search") : "Buscar…"}
                        className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-surface-2/60 dark:bg-surface-2/80 dark:border-slate-600 dark:text-slate-100 refined-select-search"
                        autoFocus
                      />
                    </div>
                  )}

                  {filtered.length > 0 ? (
                    <AnimatePresence mode="wait">
                      {filtered.map((opt, i) => {
                        const isSelected = opt.value === value;
                        return (
                          <motion.button
                            key={opt.value}
                            type="button"
                            whileHover={{ scale: 1.02, transition: { duration: 0.02 } }}
                            onClick={(e) => { e.stopPropagation(); handleSelect(opt); }}
                            className={cn(
                              optionBase,
                              "refined-select-option",
                              isSelected
                                ? "refined-select-option--selected bg-brand-500/10 border border-brand-500/75 text-brand-700 font-medium dark:bg-brand-900/20 dark:border-brand-700/70 dark:text-brand-300 shadow-[0_0_12px_rgba(0,210,255,0.1)] dark:shadow-[0_0_12px_rgba(0,210,255,0.05)]"
                                : "border-slate-300 dark:border-slate-600 hover:bg-surface-2/60 dark:hover:bg-surface-2/80 hover:text-slate-900 dark:hover:text-slate-100"
                            )}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                          >
                            {selectionVariant !== "scale" && isSelected && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400" />
                            )}
                            <Check
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 refined-select-check",
                                isSelected
                                  ? cn(
                                      "refined-select-check--checked",
                                      selectionVariant === "scale"
                                        ? "text-white dark:text-white"
                                        : "text-brand-600 dark:text-brand-400"
                                    )
                                  : "opacity-0"
                              )}
                            />
                            <span className="flex-1 truncate">
                              {opt.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  ) : (
                    <div className="px-4 py-3 text-sm opacity-60 text-center dark:text-slate-400 italic">
                      {query ? (t ? t("noMatches") : "Sin coincidencias") : (t ? t("noOptions") : "Sin opciones")}
                    </div>
                  )}
                </motion.div>,
                document.body
              )}
            </>
          )}
        </>
      )}

      {error && (
        <p className="mt-2 text-xs font-medium text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
