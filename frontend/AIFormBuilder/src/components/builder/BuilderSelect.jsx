/*
 * BuilderSelect — select premium moderno para el constructor.
 *
 * Diseño "cristal" (glassmorphism) alineado con PremiumSelect:
 * trigger de cristal con icono, valor/placeholder y chevron animado;
 * desplegable montado en un PORTAL sobre `document.body` con `position: fixed`,
 * medido contra el disparador, voltea hacia arriba si no hay sitio y se
 * reposiciona en scroll/resize. Backdrop-blur, bordes de marca, sombras
 * suaves y transiciones fluidas.
 *
 * A diferencia de un `<select>` nativo, este control puede mostrar íconos,
 * placeholders traducidos y estados de selección marcados, y respeta el
 * idioma activo a través de `t` para el placeholder.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils.js";

const triggerBase =
  "relative flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-200 bg-background";

const optionBase =
  "flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors cursor-pointer text-left";

const DROPDOWN_HEIGHT = 280;

export function BuilderSelect({
  label,
  icon: Icon,
  options = [],
  value,
  onChange,
  disabled = false,
  placeholder = "Select an option…",
  error = false,
  required = false,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const selectRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedOpt = options.find((o) => o.value === value);

  const triggerClasses = cn(
    triggerBase,
    disabled
      ? "cursor-not-allowed bg-slate-100/50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 opacity-60"
      : "cursor-pointer hover:border-brand-400/60 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/12 focus:outline-none",
    error ? "border-red-500" : "border-slate-300 dark:border-slate-700",
    className
  );

  const dropdownClasses = cn(
    "max-h-[260px] overflow-auto rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-1 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)] dark:border-slate-700 dark:bg-slate-900/95",
    disabled ? "pointer-events-none opacity-0" : ""
  );

  const positionDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const flip = trigger.bottom + DROPDOWN_HEIGHT > viewportHeight;
    setRect({
      top: flip ? trigger.top - DROPDOWN_HEIGHT - 8 : trigger.bottom + 8,
      left: trigger.left,
      width: trigger.width,
      flip,
    });
  }, []);

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const handleSelect = (opt) => {
    setIsOpen(false);
    onChange(opt.value);
  };

  const toggle = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) positionDropdown();
      return next;
    });
  };

  return (
    <div ref={selectRef} className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-fg dark:text-slate-100">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={triggerClasses}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {Icon && (
            <div className="shrink-0 opacity-60">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <span
            className={cn(
              "truncate min-w-0",
              !value && !selectedOpt ? "opacity-50" : ""
            )}
          >
            {selectedOpt?.label || value || placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "shrink-0 transition-transform duration-200 opacity-60",
            isOpen ? "rotate-180" : ""
          )}
        />
      </button>

      {isOpen && !disabled && rect && (
        <div
          style={{
            position: "fixed",
            left: rect.left,
            top: rect.top,
            minWidth: rect.width,
            width: rect.width,
          }}
        >
          {createPortal(
            <div className={cn("z-[var(--z-dropdown, 60)]", dropdownClasses)}>
              {options.length > 0 ? (
                options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        optionBase,
                        isSelected
                          ? "bg-brand-50 border-brand-200 text-brand-700 font-medium dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-300"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                      )}
                    >
                      {isSelected && (
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3.5 py-2 text-xs opacity-50 text-center dark:text-slate-400">
                  Sin opciones
                </div>
              )}
            </div>,
            document.body
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}
