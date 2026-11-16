"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./ChronoChoice.css";
import {
  Check,
  CheckSquare,
  CircleDot,
  Circle,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  Plus,
  X,
  Info,
  Edit,
  Star,
  StarHalf,
} from "lucide-react";
import { cn } from "../../lib/utils.js";
import { Tooltip } from "./Tooltip.jsx";

/* Chrono System Variables */
const CHRONO_BORDER_RADIUS = "rounded-lg";
const CHRONO_TRANSITION = "transition-all duration-150 ease-ui cursor-pointer";

/* Base option styling with Chrono system */
const CHRONO_OPTION_BASE = cn(
  "chrono-option-card flex w-full items-center justify-between px-3 py-2 text-sm transition-all duration-150 ease-ui cursor-pointer text-left",
  "chrono-option-noise",
  "hover:bg-surface-2/85 dark:hover:bg-surface-2/95 hover:border-brand-500/20"
);

/* Chrono option hover state */
const CHRONO_OPTION_HOVER = "hover:border-brand-500/30 hover:bg-surface-2/50 dark:hover:bg-surface-2/60";

/* Chrono themed option cards */
const CHRONO_OPTION_VARIANT = {
  radio: "radio-variant",
  checkbox: "checkbox-variant", 
  rank: "rank-variant",
  yes_no: "yes-no-variant"
};

/* Chrono selection states */
const CHRONO_SELECTED = "bg-surface-2/60 border-brand-500/30 text-brand-700 dark:text-brand-300 font-medium";
const CHRONO_SELECTED_STATE = "chrono-selected-state";

/* Chrono containers */
const CHRONO_CONTAINER = "flex flex-col gap-1.5";

export function ChronoRadio({
  label,
  options = [],
  value,
  onChange,
  disabled = false,
  error = false,
  required = false,
  t,
  className,
}) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const selectedValue = value ?? "";

  const onKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setFocusedIndex(options.length - 1);
      }
    },
    [disabled, options.length]
  );

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-2 block text-sm font-semibold text-ink dark:text-slate-100">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
      )}
      <div
        role="radiogroup"
        aria-label={label || (t ? t("radio") : "Opción múltiple")}
        className={CHRONO_CONTAINER}
      >
        {options.map((option, i) => {
          const isSelected = selectedValue === (option.value ?? "");
          return (
            <ChronoOption
              key={option.id ?? option.label ?? i}
              option={option}
              index={i}
              isSelected={isSelected}
              disabled={disabled}
              error={error}
              variant="radio"
              onClick={() => !disabled && onChange(option.value ?? "")}
              onKeyDown={(e) => onKeyDown(e)}
              tabIndex={focusedIndex === i ? 0 : -1}
              onHover={true}
              t={t}
              otherText=""
              onOtherChange={() => {}}
              isOtherActive={false}
            />
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-danger dark:text-red-400">
          {error}
        </p>
      )}
          </div>
  );
}

function ChronoOption({
  option,
  index,
  isSelected,
  disabled,
  error,
  variant, // "radio" | "checkbox" | "rank"
  onClick,
  onKeyDown,
  tabIndex = 0,
  showNumber,
  otherText,
  onOtherChange,
  isOtherActive,
  t,
}) {
  const Icon = option.icon ?? ListOrdered;
  const label = option.label ?? "";
  const desc = option.description ?? "";
  const isRank = variant === "rank";
  const isOtherOption = option.isOther === true;
  const showOtherInput = isOtherOption && isSelected && isOtherActive;

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (onKeyDown) onKeyDown(e);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const base = cn(
    CHRONO_OPTION_BASE,
    disabled
      ? "cursor-not-allowed bg-slate-50/40 dark:bg-slate-800/20 text-slate-400 border-slate-100/40 dark:border-slate-700/30 opacity-60 chrono-option-card--disabled"
      : cn(
          CHRONO_OPTION_HOVER,
          "cursor-default hover:text-slate-900 dark:hover:text-slate-100 chrono-magnetic",
          isSelected
            ? "chrono-option-card--selected"
            : "border-transparent",
          error ? "border-red-500/40" : ""
        ),
    isSelected ? CHRONO_SELECTED_STATE : "",
    showNumber ? "pl-8" : "pl-3"
  );

  return (
    <div>
      <Tooltip
        content={desc}
        side="top"
        align="center"
        delay={90}
        disabled={disabled || !desc}
        contentClassName="bg-surface-2/95 dark:bg-slate-900/95 border border-line/70 text-ink"
      >
        <motion.button
          type="button"
          role={variant === "checkbox" ? "checkbox" : "radio"}
          aria-checked={isSelected ? "true" : "false"}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : tabIndex}
          disabled={disabled}
          onClick={onClick}
          onKeyDown={handleKeyDown}
          whileHover={
            !disabled && !isSelected
              ? { y: -4, scale: 1.01, transition: { duration: 0.12 } }
              : {}
          }
          whileTap={!disabled ? { scale: 0.98 } : {}}
          className={base}
        >
          {showNumber && (
            <span className="absolute -left-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold chrono-rank-number">
              {index + 1}
            </span>
          )}

          <div className="lumo-medallion shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-brand-500/20 dark:border-brand-900/30 bg-brand-500/10 dark:bg-brand-900/20">
            <Icon
              className="h-4 w-4 shrink-0"
              style={{
                fill: isSelected ? "currentColor" : "none",
                stroke: isSelected ? "none" : "currentColor",
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pl-3">
            <span
              className={cn(
                "block truncate text-fg dark:text-slate-100 font-medium",
                isSelected ? "font-semibold" : "font-normal",
                disabled ? "opacity-50" : "",
                isSelected ? "chrono-option-label--selected" : "chrono-option-label"
              )}
            >
              {label}
            </span>
            {desc && (
              <span className="chrono-option-description text-xs text-ink-muted/70 dark:text-slate-400/70 mt-0.5">
                {desc}
              </span>
            )}
          </div>

          {variant === "checkbox" && (
            <div className={cn(
              "shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border-2 transition-all duration-200",
              isSelected
                ? "border-brand-500 bg-brand-500 dark:bg-brand-400 shadow-lg shadow-brand-500/30"
                : "border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/60 hover:border-brand-400"
            )}>
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-white" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              )}
            </div>
          )}

          {variant === "radio" && (
            <div className={cn(
              "shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-200",
              isSelected
                ? "border-brand-500 bg-brand-500 dark:bg-brand-400 shadow-lg shadow-brand-500/30"
                : "border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/60 hover:border-brand-400"
            )}>
              {isSelected ? (
                <Check className="h-4 w-4 text-white" />
              ) : (
                <Circle className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              )}
            </div>
          )}
        </motion.button>
      </Tooltip>

      {showOtherInput && (
        <div className="mt-2 ml-14 w-full max-w-md">
          <input
            type="text"
            value={otherText}
            onChange={onOtherChange}
            placeholder={option.otherPlaceholder || (option.label ? `Especificar ${option.label.toLowerCase()}` : "Especificar")}
            className="w-full h-8 pl-3 pr-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-brand-500 bg-white/80 dark:bg-slate-900/80"
          />
        </div>
      )}
    </div>
  );
}

export function ChronoCheckbox({
  label,
  options = [],
  value,
  onChange,
  disabled = false,
  error = false,
  required = false,
  t,
  className,
}) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedSet = new Set(selectedValues.map(String));

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-2.5 block text-sm font-semibold text-ink dark:text-slate-100">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
      )}
      <div
        role="group"
        aria-label={label || (t ? t("checkbox") : "Casillas")}
        className={CHRONO_CONTAINER}
      >
        {options.map((option, i) => {
          const isSelected = selectedSet.has(String(option.value ?? ""));
          return (
            <ChronoOption
              key={option.id ?? option.value ?? option.label ?? i}
              option={option}
              index={i}
              isSelected={isSelected}
              disabled={disabled}
              error={error}
              variant="checkbox"
              onClick={() => {
                if (disabled) return;
                const val = String(option.value ?? "");
                const next = isSelected
                  ? selectedValues.filter((v) => String(v) !== val)
                  : [...selectedValues, option.value ?? ""];
                onChange(next);
              }}
            />
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-danger dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/* Yes/No Toggle Component */
export function ChronoYesNo({
  label,
  value,
  onChange,
  disabled = false,
  error = false,
  required = false,
  t,
  className,
  yesLabel,
  noLabel,
}) {
  const opts = [
    {
      value: "yes",
      label: yesLabel ?? (t ? t("yes") : "Sí"),
      icon: Check,
      desc: t ? t("yesDesc") : "Afirmativo",
    },
    {
      value: "no",
      label: noLabel ?? (t ? t("no") : "No"),
      icon: X,
      desc: t ? t("noDesc") : "Negativo",
    },
  ];

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-2.5 block text-sm font-semibold text-ink dark:text-slate-100">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
      )}
      <div
        role="radiogroup"
        aria-label={label || (t ? t("yes_no") : "Sí / No")}
        className="chrono-seg-control flex w-full gap-2"
      >
        {opts.map(({ value: v, label: lbl, icon: Icon }) => {
          const isSelected = v === value;
          return (
            <motion.button
              key={v}
              type="button"
              role="radio"
              aria-checked={isSelected ? "true" : "false"}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              disabled={disabled}
              onClick={() => !disabled && onChange(v)}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(v);
                }
                if (
                  e.key === "ArrowLeft" ||
                  e.key === "ArrowRight"
                ) {
                  e.preventDefault();
                  onChange(v === "yes" ? "no" : "yes");
                }
              }}
              whileHover={!disabled && !isSelected ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.97 } : {}}
              className={cn(
                "flex-1 flex items-center justify-center gap-2.5 rounded-2xl border px-4 py-3.5 text-base font-semibold transition-all duration-200 ease-ui",
                "chrono-seg-item",
                disabled
                  ? "cursor-not-allowed bg-slate-50/40 dark:bg-slate-800/20 text-slate-400 border-slate-100/40 dark:border-slate-700/30 opacity-60 chrono-seg-item--disabled"
                  : undefined,
                isSelected
                  ? "chrono-seg-item--selected"
                  : "border-transparent hover:text-slate-900 dark:hover:text-slate-100",
                error && !isSelected ? "border-red-500/40" : ""
              )}
            >
              <div
                className={cn(
                  "shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border",
                  "chrono-medallion",
                  isSelected
                    ? "bg-brand-500 text-on-brand-500 border-brand-500 dark:bg-brand-400 dark:text-on-brand-500 shadow-[0_0_16px_rgba(0,210,255,0.35)] dark:shadow-[0_0_16px_rgba(0,210,255,0.15)]"
                    : "bg-white/60 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700/50 text-ink/60 dark:text-slate-400"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-fg dark:text-slate-100">{lbl}</span>
              <Info className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-ink-muted/60 dark:text-slate-500/60" />
            </motion.button>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-danger dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/* Rank Component - Ranking Component */
export function ChronoRank({
  label,
  options = [],
  value,
  onChange,
  disabled = false,
  error = false,
  required = false,
  t,
  className,
}) {
  /* Ranking implementation similar to original PremiumRank */
  const order = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const orderedSet = useMemo(() => new Set(order.map(String)), [order]);

  const moveTo = useCallback(
    (fromIndex, toIndex) => {
      if (disabled) return;
      const next = [...order];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onChange(next);
    },
    [disabled, order, onChange]
  );

  const addOption = useCallback(
    (opt) => {
      if (disabled) return;
      const val = String(opt.id ?? opt.value ?? opt.label);
      if (orderedSet.has(val)) return;
      onChange([...order, val]);
    },
    [disabled, order, onChange, orderedSet]
  );

  const removeOption = useCallback(
    (index) => {
      if (disabled) return;
      const next = [...order];
      next.splice(index, 1);
      onChange(next);
    },
    [disabled, order, onChange]
  );

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-2.5 block text-sm font-semibold text-ink dark:text-slate-100">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
      )}
      <div
        role="group"
        aria-label={label || (t ? t("rank") : "Clasificación")}
        className="chrono-rank flex flex-col gap-2"
      >
        <div className="chrono-rank-order flex items-center gap-2 px-2">
          <ListOrdered className="h-4 w-4 opacity-50" />
          <span className="text-xs font-semibold text-ink-muted/60 dark:text-slate-400/60">
            {t ? t("rankOrder") : "Orden actual"}
          </span>
        </div>
        {order.map((optId, i) => {
          const opt = options.find((o) => o.id === optId || o.value === optId);
          if (!opt) return null;
          const isSelected = orderedSet.has(String(optId ?? opt.value ?? opt.label));
          return (
            <div
              key={optId}
              className="chrono-rank-item flex items-center gap-2 px-2 rounded-lg border transition-all duration-150 ease-ui"
            >
              <span className="chrono-rank-number text-xs font-semibold bg-brand-500 text-on-brand-500 rounded-full w-6 h-6 flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="block truncate text-fg dark:text-slate-100 font-medium">
                  {opt.label ?? ""}
                </span>
                {opt.description && (
                  <span className="text-xs text-ink-muted/70 dark:text-slate-400/70 mt-0.5">
                    {opt.description}
                  </span>
                )}
              </div>
              <div className="shrink-0 flex h-2.5 w-2.5 rounded-full bg-brand-600 dark:bg-brand-400 shadow-sm" />
            </div>
          );
        })}

        <div className="chrono-rank-buttons mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); addOption({ label: "Nueva opción" }); }}
            className="chrono-add-option flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-500/40 bg-brand-50/50 text-brand-600 hover:bg-brand-500 hover:text-on-brand-500 dark:border-brand-400/30 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-400 dark:hover:text-on-brand-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Añadir</span>
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-danger dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}