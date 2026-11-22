import { useMemo } from "react";
import { X, Plus, Check } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { scaleOf } from "../../lib/fieldTypes.js";
import { ChronoSelect } from "./ChronoSelect.jsx";
import {
  activateClassificationScaleOther,
  getClassificationScaleItems,
  updateClassificationScaleAnswer,
  addClassificationScaleDynamicOther,
} from "../../lib/classificationScale.js";
import "./PremiumImportancia.css";

/*
 * Diseño "Signal Rail": cada opción se puntúa tocando un nodo del riel; el haz
 * de energía se enciende hasta el valor elegido y toma el color de su prioridad.
 * Contrato de datos intacto: sigue emitiendo el mismo mapa
 * { [opciónId]: score | { value, otherText } } mediante classificationScale.js.
 */

// Por encima de este número de nodos el riel deja de caber en móvil y se usa
// el desplegable (ChronoSelect) como antes.
const MAX_RAIL_NODES = 7;

// Textos propios del campo: evitan tocar LanguageContext para microcopy local.
const COPY = {
  es: {
    rated: (done, total) => `${done} de ${total} clasificadas`,
    allRated: "Todo clasificado",
    scoreOf: (score) => `Puntuación ${score}`,
  },
  en: {
    rated: (done, total) => `${done} of ${total} rated`,
    allRated: "All rated",
    scoreOf: (score) => `Score ${score}`,
  },
};

// Anclas del espectro (de más a menos prioridad). Con 5 valores cada nodo cae
// justo sobre un ancla; con cualquier otro rango se interpolan entre ellas.
const SPECTRUM = [
  { accent: "var(--color-danger)", border: "var(--color-danger)", bg: "var(--color-danger-soft)", text: "var(--color-danger-ink)" },
  { accent: "var(--color-warning)", border: "var(--color-warning)", bg: "var(--color-warning-soft)", text: "var(--color-warning-ink)" },
  { accent: "var(--color-info)", border: "var(--color-info)", bg: "var(--color-info-soft)", text: "var(--color-info-ink)" },
  { accent: "var(--color-success)", border: "var(--color-success)", bg: "var(--color-success-soft)", text: "var(--color-success-ink)" },
  { accent: "var(--fg-muted)", border: "var(--border)", bg: "color-mix(in srgb, var(--fg-muted) 10%, transparent)", text: "var(--fg-muted)" },
];

const FALLBACK_COLOR = {
  bg: "color-mix(in srgb, var(--color-brand-500) 10%, transparent)",
  border: "color-mix(in srgb, var(--color-brand-500) 45%, var(--border))",
  text: "var(--color-brand-700)",
  accent: "var(--color-brand-500)",
};

function blend(from, to, ratio) {
  if (ratio <= 0.001) return from;
  if (ratio >= 0.999) return to;
  return `color-mix(in srgb, ${from} ${Math.round((1 - ratio) * 100)}%, ${to})`;
}

/**
 * Color por POSICIÓN dentro de la escala (no por el número), así cualquier
 * rango (1-3, 1-8, 0-10…) obtiene un color distinto en cada valor.
 */
function priorityColor(value, scores) {
  const index = Array.isArray(scores) ? scores.indexOf(value) : -1;
  if (index < 0) return FALLBACK_COLOR;
  const t = scores.length > 1 ? index / (scores.length - 1) : 0;
  const pos = t * (SPECTRUM.length - 1);
  const low = Math.min(Math.floor(pos), SPECTRUM.length - 1);
  const high = Math.min(low + 1, SPECTRUM.length - 1);
  const ratio = pos - low;
  const a = SPECTRUM[low];
  const b = SPECTRUM[high];
  return {
    accent: blend(a.accent, b.accent, ratio),
    border: blend(a.border, b.border, ratio),
    bg: blend(a.bg, b.bg, ratio),
    text: blend(a.text, b.text, ratio),
  };
}

function answerObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function hasStoredAnswer(stored) {
  return stored !== undefined && stored !== null && stored !== "";
}

/**
 * Riel de puntuación accesible (radiogroup con tabindex "roving").
 * Flechas / Inicio / Fin cambian la puntuación igual que un grupo de radios.
 */
function ScoreRail({ scores, value, disabled, ariaLabel, minLabel, maxLabel, scoreLabel, onSelect }) {
  const count = scores.length;
  const selectedIndex = scores.indexOf(value);
  const tabStopIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const fill = selectedIndex >= 0 && count > 1 ? selectedIndex / (count - 1) : 0;
  const accent = selectedIndex >= 0 ? priorityColor(value, scores).accent : "var(--color-brand-500)";

  const handleKeyDown = (event) => {
    if (disabled) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next = null;
    if (step !== undefined) {
      const base = selectedIndex >= 0 ? selectedIndex : step > 0 ? -1 : count;
      next = Math.min(count - 1, Math.max(0, base + step));
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    }
    if (next === null) return;
    event.preventDefault();
    onSelect(scores[next]);
    event.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      className={cn("imp-rail", selectedIndex >= 0 && "imp-rail--active")}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      style={{ "--imp-n": count, "--imp-fill": fill, "--imp-accent": accent }}
    >
      {scores.map((score, index) => {
        const colors = priorityColor(score, scores);
        const checked = index === selectedIndex;
        const lit = selectedIndex >= 0 && index < selectedIndex;
        const edgeLabel = index === 0 ? minLabel : index === count - 1 ? maxLabel : "";
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${scoreLabel(score)}${edgeLabel ? ` · ${edgeLabel}` : ""}`}
            title={edgeLabel || undefined}
            tabIndex={index === tabStopIndex ? 0 : -1}
            disabled={disabled}
            className={cn("imp-node", checked && "imp-node--selected", lit && "imp-node--lit")}
            style={{ "--node-accent": colors.accent, "--node-soft": colors.bg, "--node-ink": colors.text }}
            onClick={() => onSelect(score)}
          >
            <span className="imp-node-value">{score}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PremiumImportancia({
  field,
  value,
  onChange,
  disabled = false,
  error = false,
  required = field?.required === true,
  t,
  language = "es",
  label = "",
}) {
  const scale = scaleOf(field);
  const copy = COPY[language] || COPY.es;
  const minLabel = scale.minLabel || (t ? t("priorityMinLabel") : "Mínimo");
  const maxLabel = scale.maxLabel || (t ? t("priorityMaxLabel") : "Máximo");
  const scores = useMemo(
    () => Array.from({ length: scale.max - scale.min + 1 }, (_, index) => scale.min + index),
    [scale.min, scale.max],
  );
  const scoreOptions = scores.map((score) => ({ value: String(score), label: String(score) }));
  const useRail = scores.length <= MAX_RAIL_NODES;
  const items = getClassificationScaleItems(field, value, { includeConditional: false, t });
  const answers = answerObject(value);
  const fieldLabel = label || (t ? t("importancia") : "Clasificación por escala");

  // Progreso: cuentan las filas visibles (las «Otros» sin activar no suman).
  const countable = items.filter((item) => !item.isOther || hasStoredAnswer(answers[item.id]));
  const total = countable.length;
  const rated = countable.filter((item) => Number.isInteger(item.value)).length;
  const allRated = total > 0 && rated === total;
  const segmented = total <= 16;

  const setScore = (item, score) => {
    if (disabled) return;
    onChange?.(updateClassificationScaleAnswer(field, answers, item.id, score));
  };

  const activateOther = (item) => {
    if (disabled) return;
    onChange?.(activateClassificationScaleOther(field, answers, item.id));
  };

  const addDynamicOther = (item) => {
    if (disabled) return;
    // Solo permitir agregar en opciones "Otros" originales (no dinámicas)
    if (item.isDynamicOther) return;
    onChange?.(addClassificationScaleDynamicOther(field, answers, item.id));
  };

  const removeOther = (item) => {
    if (disabled) return;
    const next = { ...answers };
    delete next[item.id];
    onChange?.(next);
  };

  const setOtherText = (item, otherText) => {
    if (disabled) return;
    const stored = answers[item.id];
    const storedValue = Number.isInteger(item.value)
      ? item.value
      : stored !== null && typeof stored === "object"
        ? stored.value ?? stored.priority
        : stored;
    onChange?.({
      ...answers,
      [item.id]: { value: storedValue === "other" ? "other" : storedValue ?? null, otherText },
    });
  };

  return (
    <div className="imp-container">
      {label && (
        <label className="imp-label">
          {label}
          {required && <span className="imp-required" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="imp-hud">
        <div className="imp-scale-indicator" aria-hidden="true">
          <div className="imp-scale-track">
            {scores.map((score) => {
              const colors = priorityColor(score, scores);
              return (
                <span
                  key={score}
                  className="imp-scale-step"
                  style={{
                    background: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                    "--node-accent": colors.accent,
                  }}
                >
                  {score}
                </span>
              );
            })}
          </div>
          <div className="imp-scale-labels">
            <span className="imp-scale-min">{minLabel}</span>
            <span className="imp-scale-max">{maxLabel}</span>
          </div>
        </div>

        {total > 0 && (
          <div
            className={cn("imp-progress", allRated && "imp-progress--done")}
            role="status"
            style={{ "--imp-progress": total ? rated / total : 0 }}
          >
            <span className="imp-progress-text">
              {allRated && <Check className="imp-progress-check" aria-hidden="true" />}
              {allRated ? copy.allRated : copy.rated(rated, total)}
            </span>
            <span className="imp-progress-meter" aria-hidden="true">
              {segmented ? (
                countable.map((item, index) => (
                  <span
                    key={item.id}
                    className={cn("imp-progress-seg", Number.isInteger(item.value) && "imp-progress-seg--on")}
                    style={{ "--seg-i": index }}
                  />
                ))
              ) : (
                <span className="imp-progress-bar" />
              )}
            </span>
          </div>
        )}
      </div>

      <div
        className="imp-services-list"
        role="group"
        aria-label={fieldLabel}
        aria-invalid={error || undefined}
      >
        {items.map((item, index) => {
          const itemLabel =
            item.label ||
            (item.isConditional && t
              ? t("classificationScaleConditionalDefaultLabel")
              : t
                ? t("optionLabel")
                : "Opción");
          const stored = answers[item.id];
          const isOtherSelected = item.isOther && hasStoredAnswer(stored);
          const isStored = item.isOther ? isOtherSelected : hasStoredAnswer(stored);
          const isDynamicOther = item.isDynamicOther === true;
          const hasScore = Number.isInteger(item.value);
          const rowAccent = hasScore ? priorityColor(item.value, scores).accent : "var(--color-brand-500)";
          const rowFill =
            hasScore && scores.length > 1 ? scores.indexOf(item.value) / (scores.length - 1) : 0;

          return (
            <section
              key={item.id}
              className={cn(
                "imp-service-card imp-option-card imp-score-row",
                item.isOther && "imp-service-card--other",
                item.isConditional && "imp-conditional--row",
                isStored && "imp-service-card--has-priority",
                hasScore && "imp-service-card--scored",
                error && !hasScore && !item.isOther && "imp-service-card--error",
                disabled && "imp-service-card--disabled",
                isDynamicOther && "imp-service-card--dynamic-other",
              )}
              style={{ "--imp-accent": rowAccent, "--imp-fill": rowFill }}
              {...(isDynamicOther
                ? { "aria-label": itemLabel }
                : { "aria-labelledby": `q-${field.id}-${item.id}-label` })}
            >
              <div className="imp-option-main">
                <div className="imp-option-label-wrap">
                  {!isDynamicOther && (
                    <span className="imp-service-index" aria-hidden="true">
                      {index + 1}
                    </span>
                  )}
                  {!isDynamicOther && (
                    <span
                      className="imp-option-label"
                      id={`q-${field.id}-${item.id}-label`}
                    >
                      {itemLabel}
                    </span>
                  )}
                  {item.isOther && !isDynamicOther && (
                    <span className="imp-other-badge">
                      {t ? t("otherOptionLabel") : "Otros"}
                    </span>
                  )}
                </div>

                {item.isOther && !isOtherSelected ? (
                  <div className="imp-score-select-controls" role="group" aria-label={itemLabel}>
                    <button
                      type="button"
                      className="imp-other-toggle imp-score-add-other"
                      aria-label={`${t ? t("addOther") : "Agregar Otros"}: ${itemLabel}`}
                      aria-expanded={false}
                      disabled={disabled}
                      onClick={() => activateOther(item)}
                    >
                      {t ? t("addOther") : "Agregar Otros"}
                    </button>
                    {!item.isDynamicOther && !disabled && (
                      <button
                        type="button"
                        className="imp-add-dynamic-other"
                        aria-label={`${t ? t("classificationScaleAddOtherOption") : "Agregar otra opción 'Otros'"}: ${itemLabel}`}
                        onClick={() => addDynamicOther(item)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="imp-score-select-controls"
                    role="group"
                    aria-label={itemLabel}
                  >
                    {useRail ? (
                      <ScoreRail
                        scores={scores}
                        value={hasScore ? item.value : null}
                        disabled={disabled}
                        ariaLabel={itemLabel}
                        minLabel={minLabel}
                        maxLabel={maxLabel}
                        scoreLabel={copy.scoreOf}
                        onSelect={(score) => setScore(item, score)}
                      />
                    ) : (
                      <ChronoSelect
                        label=""
                        options={scoreOptions}
                        value={hasScore ? String(item.value) : ""}
                        onChange={(nextValue) => setScore(item, nextValue === "" ? null : Number(nextValue))}
                        disabled={disabled}
                        placeholder="#"
                        error={error}
                        required={required}
                        language={language}
                        t={t}
                        className="imp-score-select-trigger"
                        optionClassName="imp-score-select-option"
                        dropdownMinWidth={96}
                        textColor="var(--fg)"
                      />
                    )}
                    {isStored && (!item.isOther || hasScore) && (
                      <button
                        type="button"
                        className="imp-score-clear"
                        aria-label={`${t ? t("classificationScaleClearScore") : "Quitar puntuación"}: ${itemLabel}`}
                        disabled={disabled}
                        onClick={() => setScore(item, null)}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                    {!item.isDynamicOther && !disabled && item.isOther && isOtherSelected && (
                      <button
                        type="button"
                        className="imp-add-dynamic-other"
                        aria-label={`${t ? t("classificationScaleAddOtherOption") : "Agregar otra opción 'Otros'"}: ${itemLabel}`}
                        onClick={() => addDynamicOther(item)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {item.isOther && isOtherSelected && (
                <div className="imp-other-field">
                  <label
                    className="imp-conditional-label"
                    htmlFor={`q-${field.id}-${item.id}-other`}
                  >
                    {t ? t("classificationScaleOtherTextLabel") : "Tu respuesta"}
                  </label>
                  <input
                    id={`q-${field.id}-${item.id}-other`}
                    type="text"
                    className="imp-conditional-input"
                    value={item.otherText || ""}
                    onChange={(event) => setOtherText(item, event.target.value)}
                    placeholder={t ? t("otherTextPlaceholder") : "Escribe tu respuesta"}
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    className="imp-other-toggle imp-other-toggle--active"
                    aria-label={`${isDynamicOther ? (t ? t("removeDynamicOther") : "Quitar") : (t ? t("removeOther") : "Quitar Otros")}: ${itemLabel}`}
                    disabled={disabled}
                    onClick={() => removeOther(item)}
                  >
                    {isDynamicOther ? (t ? t("removeDynamicOther") : "Quitar") : (t ? t("removeOther") : "Quitar Otros")}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
