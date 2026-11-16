import { useMemo } from "react";
import { X, Plus } from "lucide-react";
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

const PRIORITY_COLORS = {
  1: { bg: "var(--color-danger-soft)", border: "var(--color-danger)", text: "var(--color-danger-ink)" },
  2: { bg: "var(--color-warning-soft)", border: "var(--color-warning)", text: "var(--color-warning-ink)" },
  3: { bg: "var(--color-info-soft)", border: "var(--color-info)", text: "var(--color-info-ink)" },
  4: { bg: "var(--color-success-soft)", border: "var(--color-success)", text: "var(--color-success-ink)" },
  5: { bg: "color-mix(in srgb, var(--fg-muted) 10%, transparent)", border: "var(--border)", text: "var(--fg-muted)" },
};

function priorityColor(value) {
  return PRIORITY_COLORS[value] || {
    bg: "color-mix(in srgb, var(--color-brand-500) 10%, transparent)",
    border: "color-mix(in srgb, var(--color-brand-500) 45%, var(--border))",
    text: "var(--color-brand-700)",
  };
}

function answerObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
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
  const minLabel = scale.minLabel || (t ? t("priorityMinLabel") : "Mínimo");
  const maxLabel = scale.maxLabel || (t ? t("priorityMaxLabel") : "Máximo");
  const scores = useMemo(
    () => Array.from({ length: scale.max - scale.min + 1 }, (_, index) => scale.min + index),
    [scale.min, scale.max],
  );
  const scoreOptions = scores.map((score) => ({ value: String(score), label: String(score) }));
  const items = getClassificationScaleItems(field, value, { includeConditional: false, t });
  const answers = answerObject(value);
  const fieldLabel = label || (t ? t("importancia") : "Clasificación por escala");

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

      <div className="imp-scale-indicator" aria-hidden="true">
        <div className="imp-scale-track">
          {scores.map((score) => {
            const colors = priorityColor(score);
            return (
              <span
                key={score}
                className="imp-scale-step"
                style={{
                  background: colors.bg,
                  borderColor: colors.border,
                  color: colors.text,
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
          const isOtherSelected =
            item.isOther && stored !== undefined && stored !== null && stored !== "";
          const isStored = item.isOther
            ? isOtherSelected
            : stored !== undefined && stored !== null && stored !== "";
          const isDynamicOther = item.isDynamicOther === true;

          return (
            <section
              key={item.id}
              className={cn(
                "imp-service-card imp-option-card imp-score-row",
                item.isOther && "imp-service-card--other",
                item.isConditional && "imp-conditional--row",
                isStored && "imp-service-card--has-priority",
                disabled && "imp-service-card--disabled",
                isDynamicOther && "imp-service-card--dynamic-other",
              )}
              aria-labelledby={`q-${field.id}-${item.id}-label`}
            >
              <div className="imp-option-main">
                <div className="imp-option-label-wrap">
                  {!isDynamicOther && (
                    <span className="imp-service-index" aria-hidden="true">
                      {index + 1}.
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
                    <ChronoSelect
                      label=""
                      options={scoreOptions}
                      value={Number.isInteger(item.value) ? String(item.value) : ""}
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
                    {isStored && (!item.isOther || Number.isInteger(item.value)) && (
                      <button
                        type="button"
                        className="imp-score-clear"
                        aria-label={`${t ? t("classificationScaleClearScore") : "Quitar puntuación"}: ${itemLabel}`}
                        disabled={disabled}
                        onClick={() => setScore(item, null)}
                      >
                        <X className="h-4 w-2" aria-hidden="true" />
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
