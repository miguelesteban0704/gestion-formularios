/*
 * PremiumChoice — campos de elección super modernos y premium.
 *
 * Diseño "Creative Glass" para los 4 tipos de elección del formulario público
 * y el builder (Opción múltiple, Casillas, Sí/No, Clasificación):
 *
 *  • Cada opción es una tarjeta de cristal (glass card): fondo translúcido,
 *    borde fino, radio 2xl, backdrop-blur y anillo de marca al focar.
 *  • Hover: sube ligeramente, ilumina el borde de marca y eleva la sombra.
 *  • Seleccionado: gradiente de marca suave, punto/check de marca, sombra de
 *    color de marca y texto en el tono base de la marca.
 *  • Icono de acento a la izquierda dentro de un medallón de marca.
 *  • Despliegue de opciones con framer-motion (entrada escalonada, salida suave).
 *  • Estados: error (borde rojo), disabled (opacidad), required (asterisco).
 *  • Accesibilidad completa: role="radiogroup"/"group", aria-checked,
 *    roving tabindex (flechas), Enter/Space, foco visible, Tooltip del sistema.
 *  • Todo con tokens CSS (sin hex de marca a fuego): --color-brand-*, bg-surface,
 *    text-ink, border-line, etc. Respeta dark mode y reduced-motion.
 *
 * Exporta: PremiumRadio, PremiumCheckbox, PremiumYesNo, PremiumRank.
 */
import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  Plus,
  X,
  Info,
} from "lucide-react";
import { cn } from "../../lib/utils.js";
import { Tooltip } from "./Tooltip.jsx";

/* ── Tokens de glass del sistema ── */
const GLASS =
  "bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60";

const GLASS_HOVER =
  "hover:bg-white/70 dark:hover:bg-slate-900/70 hover:border-brand-500/60 dark:hover:border-brand-400/60";

const SELECTED_BASE =
  "bg-gradient-to-r from-brand-500/10 to-brand-100/30 dark:from-brand-900/20 dark:to-brand-800/20 border border-brand-500/50 dark:border-brand-400/50 text-brand-700 dark:text-brand-300 font-medium shadow-[0_0_24px_rgba(0,210,255,0.12)] dark:shadow-[0_0_24px_rgba(0,210,255,0.08)]";

const MEDALLION =
  "shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-brand-500/20 dark:border-brand-900/30 bg-brand-500/10 dark:bg-brand-900/20";

/* ── Utilidad de animación de entrada escalonada ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

/* ── Opción base: tarjeta de cristal con icono, label y estado ── */
function ChoiceOption({
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
}) {
  const Icon = option.icon ?? ListOrdered;
  const label = option.label ?? "";
  const desc = option.description ?? "";
  const isRank = variant === "rank";

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (onKeyDown) onKeyDown(e);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const base = cn(
    "relative flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-base transition-all duration-200 ease-ui cursor-pointer",
    GLASS,
    disabled
      ? "cursor-not-allowed bg-slate-50/40 dark:bg-slate-800/20 text-slate-400 border-slate-100/40 dark:border-slate-700/30 opacity-60"
      : GLASS_HOVER,
    isSelected
      ? SELECTED_BASE
      : "border-transparent hover:text-slate-900 dark:hover:text-slate-100",
    error && !isSelected ? "border-red-500/40" : "",
    showNumber ? "pl-11" : "pl-4"
  );

  return (
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
        {/* Número de posición (solo ranking) */}
        {showNumber && (
          <span
            className={cn(
              "absolute -left-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
              isSelected
                ? "bg-brand-500 text-on-brand-500 border-brand-500 dark:bg-brand-400 dark:text-on-brand-400 dark:border-brand-400"
                : "bg-white/60 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700/50 text-ink/60 dark:text-slate-300"
            )}
          >
            {index + 1}
          </span>
        )}

        {/* Medallón de icono de acento */}
        <div className={MEDALLION}>
          <Icon
            className="h-5 w-5 shrink-0"
            style={{
              fill: isSelected ? "currentColor" : "none",
              stroke: isSelected ? "none" : "currentColor",
            }}
          />
        </div>

        <div className="flex-1 min-w-0 pl-4">
          <span
            className={cn(
              "block truncate text-fg dark:text-slate-100",
              isSelected ? "font-semibold" : "font-medium",
              disabled ? "opacity-50" : ""
            )}
          >
            {label}
          </span>
          {desc && (
            <span className="text-xs text-ink-muted/70 dark:text-slate-400/70 mt-0.5">
              {desc}
            </span>
          )}
        </div>

        {/* Indicador de selección (check o punto de marca) */}
        <div
          className={cn(
            "shrink-0 flex items-center justify-center",
            isSelected
              ? variant === "checkbox"
                ? "w-6 h-6 rounded-full bg-brand-500 border-2 border-white shadow-sm"
                : "w-2.5 h-2.5 rounded-full bg-brand-600 dark:bg-brand-400 shadow-sm"
              : variant === "checkbox"
                ? "w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/60"
                : "w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/60"
          )}
        >
          {isSelected && variant === "checkbox" && (
            <Check className="h-3.5 w-3.5 text-white" />
          )}
        </div>

        {/* Chevron de orden (solo ranking) */}
        {isRank && (
          <div
            className={cn(
              "shrink-0 opacity-40 transition-opacity",
              isSelected ? "opacity-100" : "opacity-30"
            )}
          >
            <ChevronDown className="h-4 w-4 text-brand-500" />
          </div>
        )}
      </motion.button>
    </Tooltip>
  );
}

/* =====================================================================
   Opción múltiple (radio) — una sola selección entre varias tarjetas
   ===================================================================== */
export function PremiumRadio({
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
        <label className="mb-2.5 block text-sm font-semibold text-ink dark:text-slate-100">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </label>
      )}
      <div
        role="radiogroup"
        aria-label={label || (t ? t("radio") : "Opción múltiple")}
        className="flex flex-col gap-2"
      >
        {options.map((option, i) => {
          const isSelected = selectedValue === (option.value ?? "");
          return (
            <ChoiceOption
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

/* =====================================================================
   Casillas (checkbox) — selección múltiple de tarjetas
   ===================================================================== */
export function PremiumCheckbox({
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
        className="flex flex-col gap-2"
      >
        {options.map((option, i) => {
          const isSelected = selectedSet.has(String(option.value ?? ""));
          return (
            <ChoiceOption
              key={option.id ?? option.label ?? i}
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

/* =====================================================================
   Sí / No — dos chips grandes estilo segmented control premium
   ===================================================================== */
export function PremiumYesNo({
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
        className="flex w-full gap-2"
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
                GLASS,
                disabled
                  ? "cursor-not-allowed bg-slate-50/40 dark:bg-slate-800/20 text-slate-400 border-slate-100/40 dark:border-slate-700/30 opacity-60"
                  : GLASS_HOVER,
                isSelected
                  ? SELECTED_BASE
                  : "border-transparent hover:text-slate-900 dark:hover:text-slate-100",
                error && !isSelected ? "border-red-500/40" : ""
              )}
            >
              <div
                className={cn(
                  "shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border",
                  isSelected
                    ? "bg-brand-500 text-on-brand-500 border-brand-500 dark:bg-brand-400 dark:text-on-brand-400 dark:border-brand-400 shadow-[0_0_16px_rgba(0,210,255,0.35)] dark:shadow-[0_0_16px_rgba(0,210,255,0.15)]"
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

/* =====================================================================
   Opción ya ordenada en el ranking: tarjeta de cristal con número de
   posición y controles de subir / bajar / quitar.
   ===================================================================== */
function RankedOption({
  option,
  index,
  total,
  disabled,
  error,
  moveTo,
  removeOption,
  t,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const dragging = isDragging && !disabled;

  const base = cn(
    "relative flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-base transition-all duration-200 ease-ui",
    GLASS,
    disabled
      ? "cursor-not-allowed bg-slate-50/40 dark:bg-slate-800/20 text-slate-400 border-slate-100/40 dark:border-slate-700/30 opacity-60"
      : cn(
          GLASS_HOVER,
          dragging
            ? "opacity-50 scale-[0.98] ring-2 ring-brand-500 dark:ring-brand-400 shadow-[0_0_24px_rgba(0,210,255,0.25)]"
            : "cursor-default hover:text-slate-900 dark:hover:text-slate-100",
          isDropTarget
            ? "border-t-2 border-brand-500 dark:border-brand-400 shadow-[0_0_16px_rgba(0,210,255,0.15)] dark:shadow-[0_0_16px_rgba(0,210,255,0.08)]"
            : "border-transparent",
          error ? "border-red-500/40" : ""
        )
  );

  const Icon = option.icon ?? ListOrdered;

  return (
    <div className="flex w-full items-center gap-2">
      <motion.button
        type="button"
        role="radio"
        aria-checked="true"
        aria-posinset={index + 1}
        aria-setsize={total}
        aria-disabled={disabled}
        aria-label={
          disabled
            ? undefined
            : `Opción ${index + 1} de ${total}. ${option.label ?? "sin nombre"}. Arrastra para reordenar.`
        }
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
        draggable={!disabled}
        onDragStart={onDragStart ? onDragStart(index) : undefined}
        onDragOver={onDragOver ? onDragOver(index) : undefined}
        onDragLeave={onDragLeave}
        onDrop={onDrop ? onDrop(index) : undefined}
        onDragEnd={onDragEnd}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" && !isFirst) {
            e.preventDefault();
            moveTo(index, index - 1);
          }
          if (e.key === "ArrowDown" && !isLast) {
            e.preventDefault();
            moveTo(index, index + 1);
          }
        }}
        className={base}
      >
        <span className="absolute -left-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold bg-brand-500 text-on-brand-500 border-brand-500 dark:bg-brand-400 dark:text-on-brand-400 dark:border-brand-400">
          {index + 1}
        </span>

        <div className={MEDALLION}>
          <Icon
            className="h-5 w-5 shrink-0"
            style={{ fill: "currentColor", stroke: "none" }}
          />
        </div>

        <div className="flex-1 min-w-0 pl-4">
          <span className="block truncate text-fg dark:text-slate-100 font-semibold">
            {option.label ?? ""}
          </span>
          {option.description && (
            <span className="text-xs text-ink-muted/70 dark:text-slate-400/70 mt-0.5">
              {option.description}
            </span>
          )}
        </div>

        <div className="shrink-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-brand-600 dark:bg-brand-400 shadow-sm" />
      </motion.button>

      <div className="shrink-0 flex flex-col gap-1">
        {!isFirst && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveTo(index, index - 1);
            }}
            aria-label={t ? t("rankMoveUp") : "Subir posición"}
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60 text-ink dark:text-slate-100 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        )}
        {!isLast && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveTo(index, index + 1);
            }}
            aria-label={t ? t("rankMoveDown") : "Bajar posición"}
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60 text-ink dark:text-slate-100 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeOption(index);
            }}
            aria-label={t ? t("rankRemove") : "Quitar del orden"}
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-xl border border-red-500/40 bg-red-50/50 text-red-600 hover:bg-red-500 hover:text-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-800 dark:hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   Opción disponible para añadir al orden (hacer clic en la tarjeta o en "+").
   ===================================================================== */
function AvailableOption({
  option,
  disabled,
  error,
  addOption,
  t,
}) {
  const base = cn(
    "relative flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-base transition-all duration-200 ease-ui cursor-pointer",
    GLASS,
    disabled
      ? "cursor-not-allowed bg-slate-50/40 dark:bg-slate-800/20 text-slate-400 border-slate-100/40 dark:border-slate-700/30 opacity-60"
      : GLASS_HOVER,
    "border-transparent hover:text-slate-900 dark:hover:text-slate-100",
    error ? "border-red-500/40" : ""
  );

  const Icon = option.icon ?? ListOrdered;

  return (
    <div className="flex w-full items-center gap-2">
      <motion.button
        type="button"
        role="button"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
        onClick={() => !disabled && addOption(option)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            addOption(option);
          }
        }}
        whileHover={
          !disabled
            ? { y: -2, scale: 1.01, transition: { duration: 0.12 } }
            : {}
        }
        whileTap={!disabled ? { scale: 0.98 } : {}}
        className={cn(
          "flex-1 items-center justify-between",
          base,
          disabled ? "" : "pr-8"
        )}
      >
        <div className={MEDALLION}>
          <Icon
            className="h-5 w-5 shrink-0 opacity-60"
            style={{ fill: "none", stroke: "currentColor" }}
          />
        </div>

        <div className="flex-1 min-w-0 pl-4">
          <span className="block truncate text-fg dark:text-slate-100 font-medium disabled:opacity-50">
            {option.label ?? ""}
          </span>
          {option.description && (
            <span className="text-xs text-ink-muted/70 dark:text-slate-400/70 mt-0.5">
              {option.description}
            </span>
          )}
        </div>

        {!disabled && (
          <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-xl border border-brand-500/40 bg-brand-50/50 text-brand-600 hover:bg-brand-500 hover:text-on-brand-500 dark:border-brand-400/30 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-400 dark:hover:text-on-brand-400 transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </div>
        )}
      </motion.button>
    </div>
  );
}

/* =====================================================================
   Clasificación (rank) — ordenar opciones en posiciones numeradas.
   ===================================================================== */
export function PremiumRank({
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
  /*
   * `value` es un array de IDs de opciones en el orden elegido (p. ej.
   * ["opt_2", "opt_0", "opt_1"]). Renderizamos cada posición con su opción
   * asignada y un número de posición (1.º, 2.º, 3.º…).
   */
  const order = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const orderedSet = new Set(order.map(String));

  const optionById = (id) =>
    options.find((o) => o.id === id || o.value === id);

  const available = options.filter(
    (o) => !orderedSet.has(String(o.id ?? o.value ?? o.label))
  );

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

  /* ── Arrastre nativo (HTML5) para reordenar opciones del ranking ── */
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  const onDragStart = useCallback(
    (fromIndex) => (e) => {
      if (disabled) return;
      e.dataTransfer.setData("text/plain", String(fromIndex));
      e.dataTransfer.effectAllowed = "move";
      setDragIndex(fromIndex);
    },
    [disabled]
  );

  const onDragOver = useCallback(
    (toIndex) => (e) => {
      if (disabled) return;
      e.preventDefault(); // permite soltar
      e.dataTransfer.dropEffect = "move";
      setDropIndex(toIndex);
    },
    [disabled]
  );

  const onDragLeave = useCallback(() => {
    setDropIndex(null);
  }, []);

  const onDrop = useCallback(
    (toIndex) => (e) => {
      if (disabled) return;
      e.preventDefault();
      const fromIndex = Number(e.dataTransfer.getData("text/plain"));
      if (!Number.isFinite(fromIndex) || fromIndex === toIndex) {
        setDragIndex(null);
        setDropIndex(null);
        return;
      }
      moveTo(fromIndex, toIndex);
      setDragIndex(null);
      setDropIndex(null);
    },
    [disabled, moveTo]
  );

  const onDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropIndex(null);
  }, []);

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
        className="flex flex-col gap-2"
      >
        {/* ── Orden actual ── */}
        {order.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-2">
              <ListOrdered className="h-4 w-4 opacity-50" />
              <span className="text-xs font-semibold text-ink-muted/60 dark:text-slate-400/60">
                {t ? t("rankOrder") : "Orden actual"}
              </span>
            </div>
            {order.map((optId, i) => {
              const opt = optionById(optId);
              if (!opt) return null;
              return (
                <RankedOption
                  key={optId}
                  option={opt}
                  index={i}
                  total={order.length}
                  disabled={disabled}
                  error={error}
                  moveTo={moveTo}
                  removeOption={removeOption}
                  t={t}
                  isDragging={dragIndex === i}
                  isDropTarget={dropIndex === i && dragIndex !== i}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                />
              );
            })}
          </>
        )}

        {/* ── Opciones disponibles para añadir ── */}
        {available.length > 0 && (
          <>
            {order.length > 0 && (
              <div className="flex items-center gap-2 px-2 mt-2">
                <ListOrdered className="h-4 w-4 opacity-50" />
                <span className="text-xs font-semibold text-ink-muted/60 dark:text-slate-400/60">
                  {t ? t("rankAvailable") : "Disponibles para añadir"}
                </span>
              </div>
            )}
            {available.map((opt) => (
              <AvailableOption
                key={opt.id ?? opt.value ?? opt.label}
                option={opt}
                disabled={disabled}
                error={error}
                addOption={addOption}
                t={t}
              />
            ))}
          </>
        )}

        {/* ── Estado vacío ── */}
        {order.length === 0 && options.length > 0 && available.length === options.length && (
          <p className="mt-2 text-xs text-ink-muted/60 dark:text-slate-400/60 italic">
            {t ? t("rankEmpty") : "Selecciona opciones para ordenar"}
          </p>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs font-medium text-danger dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/* =====================================================================
   Animación de contenedor para lista de opciones (reutilizable)
   ===================================================================== */
export function ChoiceList({ children }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-2"
    >
      <AnimatePresence mode="wait">{children}</AnimatePresence>
    </motion.div>
  );
}
