import React, { useCallback, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Tooltip } from "./Tooltip.jsx";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

const RANGE_TRANSLATION_KEYS = {
  1: "ratingRangeTerrible",
  2: "ratingRangeBad",
  3: "ratingRangeAcceptable",
  4: "ratingRangeGood",
  5: "ratingRangeExcellent",
};

/* Color dinámico por rango: 1-2 peligro, 3 aviso, 4-5 éxito. */
const rangeFor = (n) => {
  if (n <= 2) return { color: "danger" };
  if (n === 3) return { color: "warning" };
  return { color: "success" };
};

/* Clases estáticas por rango con soporte dark mode completo. */
const RANGE_CLASSES = {
  danger: {
    text: "text-danger dark:text-danger",
    bg: "bg-danger/10 dark:bg-danger/20",
    border: "border-danger/30 dark:border-danger/40",
    hoverBg: "hover:bg-danger/20 dark:hover:bg-danger/30",
    hoverText: "hover:text-danger dark:hover:text-danger",
    hoverBorder: "hover:border-danger/60 dark:hover:border-danger/70",
    ring: "focus-visible:ring-[var(--color-danger-ink)] dark:focus-visible:ring-[var(--color-danger)]",
    selected: [
      "bg-danger dark:bg-danger text-white dark:text-white",
      "border-danger dark:border-danger",
      "hover:bg-danger dark:hover:bg-danger hover:text-white dark:hover:text-white",
      "hover:border-danger dark:hover:border-danger",
      "shadow-lg ring-1 ring-danger/50 scale-105",
    ].join(" "),
  },
  warning: {
    text: "text-warning dark:text-warning",
    bg: "bg-warning/10 dark:bg-warning/20",
    border: "border-warning/30 dark:border-warning/40",
    hoverBg: "hover:bg-warning/20 dark:hover:bg-warning/30",
    hoverText: "hover:text-warning dark:hover:text-warning",
    hoverBorder: "hover:border-warning/60 dark:hover:border-warning/70",
    ring: "focus-visible:ring-[var(--color-warning-ink)] dark:focus-visible:ring-[var(--color-warning)]",
    selected: [
      "bg-warning dark:bg-warning text-white dark:text-white",
      "border-warning dark:border-warning",
      "hover:bg-warning dark:hover:bg-warning hover:text-white dark:hover:text-white",
      "hover:border-warning dark:hover:border-warning",
      "shadow-lg ring-1 ring-warning/50 scale-105",
    ].join(" "),
  },
  success: {
    text: "text-success dark:text-success",
    bg: "bg-success/10 dark:bg-success/20",
    border: "border-success/30 dark:border-success/40",
    hoverBg: "hover:bg-success/20 dark:hover:bg-success/30",
    hoverText: "hover:text-success dark:hover:text-success",
    hoverBorder: "hover:border-success/60 dark:hover:border-success/70",
    ring: "focus-visible:ring-[var(--color-success-ink)] dark:focus-visible:ring-[var(--color-success)]",
    selected: [
      "bg-success dark:bg-success text-white dark:text-white",
      "border-success dark:border-success",
      "hover:bg-success dark:hover:bg-success hover:text-white dark:hover:text-white",
      "hover:border-success dark:hover:border-success",
      "shadow-lg ring-1 ring-success/50 scale-105",
    ].join(" "),
  },
};

const rangeClasses = (n) => RANGE_CLASSES[rangeFor(n).color];

const rangeLabel = (n, t) =>
  RANGE_TRANSLATION_KEYS[n] ? t(RANGE_TRANSLATION_KEYS[n]) : String(n);

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

/* Clases base compartidas para botones de rating (light + dark) */
const BASE_BUTTON_CLASSES = [
  "relative flex items-center justify-center rounded-full border select-none",
  "text-sm font-semibold transition-all duration-300 ease-ui",
  /* Base: superficie semitransparente con borde sutil - funciona en ambos temas */
  "bg-white/50 dark:bg-slate-800/60",
  "border-white/20 dark:border-white/10",
  "text-ink dark:text-slate-100",
  "shadow-sm",
].join(" ");

const DISABLED_CLASSES =
  "opacity-50 cursor-not-allowed border-white/10 dark:border-white/5 bg-white/20 dark:bg-slate-800/30 text-ink/40 dark:text-slate-400";

const FOCUS_RING_BASE = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:z-10";

/* Valoración numérica: píldoras flotantes de cristal del 1 al 5. */
export function ScoreRating({
  label,
  value = 0,
  onChange,
  disabled = false,
  error,
  min = 1,
  max = 5,
}) {
  const { t } = useLanguage();
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
        aria-label={label || t("field_score_rating")}
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
              content={rangeLabel(n, t)}
              side="top"
              align="center"
              delay={90}
              disabled={disabled}
              contentClassName="bg-surface-2/90 dark:bg-slate-900/90 border border-line/60 text-ink dark:text-slate-100"
            >
              <button
                ref={(el) => (buttons.current[i] = el)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${n} ${t("ratingScaleOf")} ${max}: ${rangeLabel(n, t)}`}
                tabIndex={isFocused ? 0 : -1}
                disabled={disabled}
                onClick={() => !disabled && onChange(n)}
                onKeyDown={(e) => onKeyDown(e, n)}
                className={cn(
                  BASE_BUTTON_CLASSES,
                  `h-[var(--rating-size)] w-[var(--rating-size)]`,
                  rc.text,
                  disabled ? DISABLED_CLASSES : `cursor-pointer ${rc.hoverBg} ${rc.hoverText} ${rc.hoverBorder} hover:-translate-y-1 hover:shadow-md`,
                  isSelected ? rc.selected : "",
                  isFocused && !isSelected ? `${FOCUS_RING_BASE} ${rc.ring}` : "focus-visible:outline-none",
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
}) {
  const { t } = useLanguage();
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
        aria-label={label || t("field_quality_rating")}
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
              content={rangeLabel(n, t)}
              side="top"
              align="center"
              delay={90}
              disabled={disabled}
              contentClassName="bg-surface-2/90 dark:bg-slate-900/90 border border-line/60 text-ink dark:text-slate-100"
            >
              <button
                ref={(el) => (buttons.current[i] = el)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${n} ${t("ratingScaleOf")} ${max}: ${rangeLabel(n, t)}`}
                tabIndex={isFocused ? 0 : -1}
                disabled={disabled}
                onClick={() => !disabled && onChange(n)}
                onKeyDown={(e) => onKeyDown(e, n)}
                onMouseEnter={() => !disabled && setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  BASE_BUTTON_CLASSES.replace("rounded-full", "rounded-xl"),
                  "h-10 w-10 text-sm",
                  rc.text,
                  disabled ? DISABLED_CLASSES : `cursor-pointer ${rc.hoverBg} ${rc.hoverText} ${rc.hoverBorder} hover:-translate-y-1 hover:shadow-md`,
                  active ? rc.selected : "",
                  isFocused && !active ? `${FOCUS_RING_BASE} ${rc.ring}` : "focus-visible:outline-none",
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
