import React, { useCallback, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Tooltip } from "./Tooltip.jsx";
import { cn } from "../../lib/utils.js";

/* Categorías de valoración del 1 al 5, en los dos idiomas del sitio. */
const RANGE_LABELS = {
  1: { es: "Pésimo", en: "Terrible" },
  2: { es: "Malo", en: "Bad" },
  3: { es: "Aceptable", en: "Acceptable" },
  4: { es: "Bueno", en: "Good" },
  5: { es: "Excelente", en: "Excellent" },
};

/* Color dinámico por rango: 1-2 peligro, 3 aviso, 4-5 éxito. */
const rangeFor = (n) => {
  if (n <= 2) return { color: "danger" };
  if (n === 3) return { color: "warning" };
  return { color: "success" };
};

/* Clases estáticas por rango. Se escriben literales para que Tailwind
   las detecte al escanear el fuente (las clases construidas con
   template literals tipo `text-${color}` no se generan en el CSS). */
const RANGE_CLASSES = {
  danger: {
    text: "text-danger",
    bg: "bg-danger",
    border: "border-danger",
    hoverBg: "hover:bg-danger/20",
    hoverText: "hover:text-danger",
    hoverBorder: "hover:border-danger/80",
    ring: "focus-visible:ring-[var(--color-danger-ink)]",
    selected:
      "bg-danger text-white border-danger shadow-lg ring-1 ring-danger/50 scale-105",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning",
    border: "border-warning",
    hoverBg: "hover:bg-warning/20",
    hoverText: "hover:text-warning",
    hoverBorder: "hover:border-warning/80",
    ring: "focus-visible:ring-[var(--color-warning-ink)]",
    selected:
      "bg-warning text-white border-warning shadow-lg ring-1 ring-warning/50 scale-105",
  },
  success: {
    text: "text-success",
    bg: "bg-success",
    border: "border-success",
    hoverBg: "hover:bg-success/20",
    hoverText: "hover:text-success",
    hoverBorder: "hover:border-success/80",
    ring: "focus-visible:ring-[var(--color-success-ink)]",
    selected:
      "bg-success text-white border-success shadow-lg ring-1 ring-success/50 scale-105",
  },
};

const rangeClasses = (n) => RANGE_CLASSES[rangeFor(n).color];

const rangeLabel = (n, language) => {
  const entry = RANGE_LABELS[n];
  if (entry) return entry[language === "es" ? "es" : "en"];
  return String(n);
};

/* Número normalizado de la escala, o null si no hay valor válido. */
const scaleValue = (value, min, max) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/* Navegación de teclado con foco móvil (roving tabindex) sobre un radiogroup. */
function useRatingKeyboard({ min, max, value, onChange, disabled }) {
  const [focused, setFocused] = useState(() => scaleValue(value, min, max) ?? min);
  const buttons = useRef([]);

  const move = useCallback(
    (next) => {
      if (disabled) return;
      const clamped = Math.min(max, Math.max(min, next));
      setFocused(clamped);
      buttons.current?.[clamped - min]?.focus({ preventScroll: true });
    },
    [disabled, min, max]
  );

  const onKeyDown = useCallback(
    (e, n) => {
      if (disabled) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        move(n < max ? n + 1 : n);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        move(n > min ? n - 1 : n);
      } else if (e.key === "Home") {
        e.preventDefault();
        move(min);
      } else if (e.key === "End") {
        e.preventDefault();
        move(max);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange(n);
      }
    },
    [disabled, min, max, move, onChange]
  );

  return { focused, buttons, onKeyDown };
}

/* Valoración numérica: píldoras flotantes de cristal del 1 al 5. */
export function ScoreRating({
  label,
  value = 0,
  onChange,
  disabled = false,
  error,
  min = 1,
  max = 5,
  language = "en",
}) {
  const { focused, buttons, onKeyDown } = useRatingKeyboard({ min, max, value, onChange, disabled });
  const selected = scaleValue(value, min, max);

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-ink dark:text-slate-100">
          {label}
        </label>
      )}
      <div
        role="radiogroup"
        aria-label={label || "Valoración numérica"}
        className="inline-flex items-center gap-[var(--rating-gap)]"
      >
        {[...Array(max - min + 1)].map((_, i) => {
          const n = min + i;
          const rc = rangeClasses(n);
          const isSelected = selected === n;
          const isFocused = focused === n;
          return (
            <Tooltip
              key={n}
              content={rangeLabel(n, language)}
              side="top"
              align="center"
              delay={90}
              disabled={disabled}
              contentClassName="bg-surface-2/90 dark:bg-slate-900/90 border border-line/60 text-ink"
            >
              <button
                ref={(el) => (buttons.current[i] = el)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${n} de ${max}: ${rangeLabel(n, language)}`}
                tabIndex={isFocused ? 0 : -1}
                disabled={disabled}
                onClick={() => !disabled && onChange(n)}
                onKeyDown={(e) => onKeyDown(e, n)}
                className={cn(
                  "relative flex h-[var(--rating-size)] w-[var(--rating-size)] items-center justify-center rounded-full border select-none",
                  "text-sm font-semibold transition-all duration-300 ease-ui",
                  "border-white/20 dark:border-white/10 bg-white/40 dark:bg-slate-800/50 text-ink/70 shadow-sm",
                  rc.text,
                  disabled
                    ? "opacity-50 cursor-not-allowed border-white/10 dark:border-white/5 bg-white/20 dark:bg-slate-800/20 text-ink/30"
                    : `cursor-pointer ${rc.hoverBg} ${rc.hoverText} ${rc.hoverBorder} hover:-translate-y-1 hover:shadow-md`,
                  isSelected ? rc.selected : "",
                  isFocused && !isSelected
                    ? `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:z-10 ${rc.ring}`
                    : "focus-visible:outline-none",
                  error ? "ring-1 ring-danger-ring/50" : ""
                )}
              >
                {n}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

/* Valoración por estrellas: 5 estrellas con vista previa al pasar el cursor. */
export function StarRating({
  label,
  value = 0,
  onChange,
  disabled = false,
  error,
  min = 1,
  max = 5,
  language = "en",
}) {
  const { focused, buttons, onKeyDown } = useRatingKeyboard({ min, max, value, onChange, disabled });
  const [hovered, setHovered] = useState(null);
  const selected = scaleValue(value, min, max);
  const fillUpTo = disabled ? null : hovered ?? selected;

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-ink dark:text-slate-100">
          {label}
        </label>
      )}
      <div
        role="radiogroup"
        aria-label={label || "Valoración por estrellas"}
        className="inline-flex items-center gap-[var(--rating-gap)]"
      >
        {[...Array(max - min + 1)].map((_, i) => {
          const n = min + i;
          const rc = rangeClasses(n);
          const isFilled = fillUpTo != null && n <= fillUpTo;
          const isSelected = selected === n;
          const isFocused = focused === n;
          const active = isSelected || isFilled;
          return (
            <Tooltip
              key={n}
              content={rangeLabel(n, language)}
              side="top"
              align="center"
              delay={90}
              disabled={disabled}
              contentClassName="bg-surface-2/90 dark:bg-slate-900/90 border border-line/60 text-ink"
            >
              <button
                ref={(el) => (buttons.current[i] = el)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${n} de ${max}: ${rangeLabel(n, language)}`}
                tabIndex={isFocused ? 0 : -1}
                disabled={disabled}
                onClick={() => !disabled && onChange(n)}
                onKeyDown={(e) => onKeyDown(e, n)}
                onMouseEnter={() => !disabled && setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-xl border select-none",
                  "text-sm transition-all duration-300 ease-ui",
                  "border-white/20 dark:border-white/10 bg-white/40 dark:bg-slate-800/50 text-ink/70 shadow-sm",
                  rc.text,
                  disabled
                    ? "opacity-50 cursor-not-allowed border-white/10 dark:border-white/5 bg-white/20 dark:bg-slate-800/20 text-ink/30"
                    : `cursor-pointer ${rc.hoverBg} ${rc.hoverText} ${rc.hoverBorder} hover:-translate-y-1 hover:shadow-md`,
                  active ? rc.selected : "",
                  isFocused && !active
                    ? `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:z-10 ${rc.ring}`
                    : "focus-visible:outline-none",
                  error ? "ring-1 ring-danger-ring/50" : ""
                )}
              >
                <Star
                  className="h-6 w-6"
                  style={{
                    fill: active ? "currentColor" : "none",
                    stroke: active ? "none" : "currentColor",
                  }}
                />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
