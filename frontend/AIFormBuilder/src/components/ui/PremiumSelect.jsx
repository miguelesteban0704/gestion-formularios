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
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "../../lib/utils.js";

const triggerBase =
  "relative flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-base transition-all duration-300 bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm";

const triggerInner =
  "flex items-center gap-3 overflow-hidden";

const optionBase =
  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base transition-all duration-200 cursor-pointer text-left";

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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState(null);
  const selectRef = useRef(null);
  const triggerRef = useRef(null);

  const placeholderText = placeholder ?? (t ? t("placeholder") : "Seleccionar…");

  const filtered = options.filter((opt) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return String(opt.label).toLowerCase().includes(q);
  });

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
    disabled
      ? "cursor-not-allowed bg-slate-200/40 text-slate-400 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/50 opacity-70"
      : "cursor-pointer hover:border-brand-400/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none",
    error
      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
      : "border-slate-200/60 dark:border-slate-700/60",
    required ? "border-brand-500/30" : "",
    className
  );

  const dropdownClasses = cn(
    "max-h-[300px] overflow-auto rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-xl p-1.5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.18)] dark:border-slate-700/60 dark:bg-slate-900/85",
    disabled ? "pointer-events-none opacity-0" : ""
  );

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
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-900/20 border border-brand-500/20 dark:border-brand-900/30">
                  <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
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
                "shrink-0 transition-all duration-300",
                isOpen ? "rotate-180 scale-110" : ""
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
                    minWidth: rect.width,
                    width: rect.width,
                    zIndex: 9999,
                  }}
                >
                  {searchable && filtered.length > 0 && (
                    <div className="relative mb-2">
                      <Search
                        className="absolute left-3 top-3 h-4 w-4 opacity-40"
                      />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t ? t("search") : "Buscar…"}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50/60 dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100"
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
                              isSelected
                                ? "bg-gradient-to-r from-brand-500/10 to-brand-100/30 border border-brand-500/40 text-brand-700 font-medium dark:bg-brand-900/30 dark:border-brand-800/50 dark:text-brand-300 shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                : "border-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            )}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                          >
                            {isSelected && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400" />
                            )}
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isSelected
                                  ? "text-brand-600 dark:text-brand-400"
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
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-900/20 border border-brand-500/20 dark:border-brand-900/30">
                  <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
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
                "shrink-0 transition-all duration-300",
                isOpen ? "rotate-180 scale-110" : ""
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
                    minWidth: rect.width,
                    width: rect.width,
                    zIndex: 9999,
                  }}
                >
                  {searchable && filtered.length > 0 && (
                    <div className="relative mb-2">
                      <Search
                        className="absolute left-3 top-3 h-4 w-4 opacity-40"
                      />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t ? t("search") : "Buscar…"}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50/60 dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100"
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
                              isSelected
                                ? "bg-gradient-to-r from-brand-500/10 to-brand-100/30 border border-brand-500/40 text-brand-700 font-medium dark:bg-brand-900/30 dark:border-brand-800/50 dark:text-brand-300 shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                : "border-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                            )}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                          >
                            {isSelected && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400" />
                            )}
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isSelected
                                  ? "text-brand-600 dark:text-brand-400"
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
