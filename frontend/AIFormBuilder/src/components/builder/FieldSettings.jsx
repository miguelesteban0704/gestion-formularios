import { useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Plus, X, Wand2, GripVertical, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
import { Input, Textarea, Label } from "../ui/Input.jsx";
import { Switch } from "../ui/Switch.jsx";
import { Button } from "../ui/Button.jsx";
import { ImageUpload } from "./ImageUpload.jsx";
import { BuilderSelect } from "./BuilderSelect.jsx";
import { FIELD_DEFS, OPTION_TYPES, MIN_CHOICE_OPTIONS, uid, scaleOf, DEFAULT_SCALE, MIN_SCALE_STEPS, MAX_SCALE_STEPS, isStatic, optionAnswerValue } from "../../lib/fieldTypes.js";
import { specialOptionsFor } from "../../lib/specialOptions.js";
import { aiApi } from "../../services/index.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { ValidationSettings } from "./ValidationSettings.jsx";

/** Editor panel for a single field's properties. */
export function FieldSettings({ field, onChange, allQuestions = [], fieldIndex = 0, accent }) {
  const def = FIELD_DEFS[field.type];
  const [aiBusy, setAiBusy] = useState(false);
  const [improving, setImproving] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const { t, language } = useLanguage();
  const optionSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const set = (patch) => onChange({ ...field, ...patch });
  const setValidation = (patch) => set({ validation: { ...field.validation, ...patch } });

  const updateOption = (id, label) =>
    set({ options: field.options.map((o) => (o.id === id ? { ...o, label } : o)) });
  const addOption = () =>
    set({ options: [...field.options, { id: uid("opt"), label: `Option ${field.options.length + 1}`, value: "" }] });
  const removeOption = (id) => {
    const option = field.options.find((item) => item.id === id);
    const clearOtherCondition =
      option?.isOther === true && field.visibleIf?.sameFieldCondition === "__other__";
    set({
      options: field.options.filter((item) => item.id !== id),
      ...(clearOtherCondition
        ? {
            visibleIf: {
              ...field.visibleIf,
              sameFieldCondition: undefined,
              sameFieldScale: undefined,
            },
          }
        : {}),
    });
  };
  const toggleOtherOption = (id, enabled) => {
    const current = field.options.find((option) => option.id === id);
    const options = field.options.map((option) => {
      const rest = { ...option };
      delete rest.isOther;
      return option.id === id && enabled ? { ...rest, isOther: true } : rest;
    });
    const clearOtherCondition =
      !enabled &&
      current?.isOther === true &&
      field.visibleIf?.sameFieldCondition === "__other__";

    set({
      options,
      ...(clearOtherCondition
        ? {
            visibleIf: {
              ...field.visibleIf,
              sameFieldCondition: undefined,
              sameFieldScale: undefined,
            },
          }
        : {}),
    });
  };
  const moveOption = (id, direction) => {
    const index = field.options.findIndex((option) => option.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= field.options.length) return;
    set({ options: arrayMove(field.options, index, nextIndex) });
  };
  const reorderOptions = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = field.options.findIndex((option) => option.id === active.id);
    const newIndex = field.options.findIndex((option) => option.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    set({ options: arrayMove(field.options, oldIndex, newIndex) });
  };

  const suggestValidation = async () => {
    setAiBusy(true);
    try {
      const v = await aiApi.generateValidation({
        label: field.label,
        type: field.type,
        description: field.description,
      });
      setValidation(v);
      toast.success(t("validationSuggested"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAiBusy(false);
    }
  };

  const improve = async () => {
    setImproving(true);
    try {
      const result = await aiApi.improveQuestion({ label: field.label, type: field.type });
      set({ label: result.improved });
      setFollowUps(result.followUps || []);
      toast.success(t("questionImproved"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImproving(false);
    }
  };

  // Static layout blocks have a simpler editor.
  if (def.static) {
    if (field.type === "image") {
      // La vista previa y el botón para quitar viven en la tarjeta del lienzo;
      // este panel conserva únicamente la edición de URL.
      if (field.content) {
        return (
          <div>
            <Label>URL de la imagen</Label>
            <Input
              value={field.content}
              placeholder="https://…"
              onChange={(e) => set({ content: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Puedes copiar o editar la URL directamente
            </p>
          </div>
        );
      }
      // El uploader aparece solo cuando el bloque aún no tiene imagen.
      return (
        <ImageUpload
          initialUrl=""
          accent={accent}
          onUpload={({ previewUrl }) => set({ content: previewUrl })}
          onRemove={() => set({ content: "" })}
          hints={{ dragDrop: "Arrastra y suelta una imagen", remove: "Quitar", formatHint: "JPG, PNG, WEBP, GIF · hasta 8 MB" }}
        />
      );
    }
    return (
      <div className="space-y-4">
        <Label>{field.type === "image" ? t("imageBlock") : t("content")}</Label>
        {field.type === "image" ? (
          <Input
            value={field.content}
            placeholder="https://…"
            onChange={(e) => set({ content: e.target.value })}
          />
        ) : (
          <Textarea value={field.content} onChange={(e) => set({ content: e.target.value })} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <Label>{t("questionLabel")}</Label>
          {/* AI feature hidden - retained in code: the "AI improve" button used to
              live here (Wand2 → improve()). The `improve` handler is still defined
              below, but nothing in the UI can call it anymore. */}
        </div>
        <Input value={field.label} onChange={(e) => set({ label: e.target.value })} />
      </div>

      {/* AI feature hidden - retained in code: the "Suggested follow-up questions"
          panel used to render here whenever `improve()` was called. */}

      {!["yes_no", "rating", "quality_rating", "score_rating", "importancia", "file", "date", "time", "rank"].includes(field.type) && (
        <div>
          <Label>{t("placeholder")}</Label>
          <Input value={field.placeholder} onChange={(e) => set({ placeholder: e.target.value })} />
        </div>
      )}

      <div>
        <Label>{t("description")}</Label>
        <Input
          value={field.description}
          placeholder={t("optionalHelperText")}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>

      {def.hasScale && <ScaleEditor field={field} set={set} />}

      {OPTION_TYPES.includes(field.type) && (
        <div>
          <Label>{t("options")}</Label>
          {field.options.length < MIN_CHOICE_OPTIONS && (
            <p className="mb-1.5 flex items-start gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              {t("noOptionsYet")}
            </p>
          )}
          {field.type === "importancia" ? (
            <DndContext sensors={optionSensors} onDragEnd={reorderOptions}>
              <SortableContext
                items={field.options.map((option) => option.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {field.options.map((option, index) => (
                    <SortableOption
                      key={option.id}
                      option={option}
                      index={index}
                      count={field.options.length}
                      t={t}
                      onChange={(label) => updateOption(option.id, label)}
                      onRemove={() => removeOption(option.id)}
                      onMove={(direction) => moveOption(option.id, direction)}
                      onToggleOther={(enabled) => toggleOtherOption(option.id, enabled)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-1.5">
              {field.options.map((o) => (
                <div key={o.id} className="flex items-center gap-1.5">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted" />
                  <Input
                    value={o.label}
                    onChange={(e) => updateOption(o.id, e.target.value)}
                    className="h-9"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeOption(o.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" className="mt-1.5" onClick={addOption}>
            <Plus className="h-3.5 w-3.5" /> {t("addOption")}
          </Button>
        </div>
      )}

      <div>
        <Label>{t("helpText")}</Label>
        <Input
          value={field.helpText}
          placeholder={t("shownBelowField")}
          onChange={(e) => set({ helpText: e.target.value })}
        />
      </div>

      <div className="rounded-xl border border-default bg-surface-2 p-3">
        <Switch
          checked={field.required}
          onChange={(v) => set({ required: v })}
          label={t("required")}
          description={t("requiredDescription")}
        />
      </div>

      {/* Lógica condicional: puerta de consentimiento y visibilidad según otra
          respuesta. Lo oculto no se valida ni se envía (ver FormView). */}
      {!def.static && (
        <div className="rounded-xl border border-default p-3">
          <Label className="mb-0">{t("logicSection")}</Label>
          {field.type === "yes_no" && (
            <div className="mt-2">
              <Switch
                checked={!!field.isConsentGate}
                onChange={(v) => set({ isConsentGate: v })}
                label={t("consentGate")}
                description={t("consentGateDescription")}
              />
            </div>
          )}
          <div className="mt-2">
            <ConditionEditor
              field={field}
              set={set}
              allQuestions={allQuestions}
              fieldIndex={fieldIndex}
              t={t}
            />
          </div>
        </div>
      )}

      {/* Validation */}
      <ValidationSettings
        field={field}
        setValidation={setValidation}
        setRequired={(on) => set({ required: on })}
        onSuggest={suggestValidation}
        aiBusy={aiBusy}
        t={t}
        language={language}
      />
    </div>
  );
}

function SortableOption({ option, index, count, t, onChange, onRemove, onMove, onToggleOther }) {
  const { listeners, setNodeRef, transform, isDragging } = useSortable({ id: option.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-1.5 rounded-lg ${isDragging ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        {...listeners}
        className="grid h-9 w-6 shrink-0 cursor-grab place-items-center text-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        aria-label={`${t("options")} ${index + 1}`}
        value={option.label}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-[8rem] flex-1"
      />
      <Switch
        checked={option.isOther === true}
        onChange={onToggleOther}
        label={`${t("classificationScaleMarkOther")}: ${option.label}`}
        className="w-full sm:w-auto"
      />
      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${t("classificationScaleMoveUp")} ${option.label}`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${t("classificationScaleMoveDown")} ${option.label}`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${t("removeOption")} ${option.label}`}
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        className="h-9"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

/**
 * Editor de la condición de visibilidad ("Mostrar solo si…").
 *
 * La condición apunta a una pregunta ANTERIOR que ya se puede responder: no
 * tiene sentido depender de lo que viene después, porque aún no se contestó.
 * El valor se elige de las opciones de la pregunta de la que se depende
 * cuando las tiene (lista, sí/no), o se escribe a mano si es texto libre.
 */
function ConditionEditor({ field, set, allQuestions, fieldIndex, t }) {
  const { language } = useLanguage();
  const prev = (allQuestions || [])
    .slice(0, Math.max(0, fieldIndex))
    .filter((q) => q && !isStatic(q.type) && q.id !== field.id);
  const cond = field.visibleIf || {};
  const dep = prev.find((q) => q.id === cond.questionId) || null;

  const defaultValueFor = (q) => {
    if (!q) return "";
    if (q.type === "yes_no") return "Sí";
    if (Array.isArray(q.options) && q.options.length) return q.options[0].label || "";
    return "";
  };

  // Verifica si el campo es de tipo texto (sin opciones predefinidas)
  const isTextField = (f) => {
    const def = FIELD_DEFS[f.type];
    if (!def) return false;
    return !def.hasOptions && !def.static;
  };

  // Opciones para el select de Valor cuando se activa "Misma Pregunta"
  const getSameFieldConditionOptions = (lang) => {
    if (field.type === "gender") {
      // Se pasa `field` para que las opciones salgan del MISMO origen que usa
      // FieldRenderer (customOptions del autor). Si aquí se usara el catálogo
      // por defecto, el valor guardado en sameFieldCondition nunca coincidiría
      // con la respuesta y el campo extra no aparecería.
      return specialOptionsFor("gender", { language: lang, field }).map((o) => ({
        value: o.value,
        label: o.label,
      }));
    }
    if (field.type === "province") {
      return specialOptionsFor("province", { language: lang }).map((o) => ({
        value: o.value,
        label: o.label,
      }));
    }
    if (field.type === "education_level") {
      return specialOptionsFor("education_level", { language: lang }).map((o) => ({
        value: o.value,
        label: o.label,
      }));
    }
    // Para otros campos con opciones (radio, checkbox, dropdown, etc.)
    return (field.options || []).map((o, i) => ({
      value: optionAnswerValue(o, i),
      label: o.label ?? "",
    }));
  };

  if (!field.visibleIf) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const first = prev[0];
          if (first) {
            set({
              visibleIf: {
                questionId: first.id,
                operator: first.type === "checkbox" ? "includes" : "equals",
                value: defaultValueFor(first),
              },
            });
          } else {
            set({
              visibleIf: {
                questionId: undefined,
                sameFieldCondition: "",
                operator: undefined,
                value: undefined,
              },
            });
          }
        }}
      >
        <Plus className="h-3.5 w-3.5" /> {t("showOnlyIf")}
      </Button>
    );
  }

  const patch = (p) => set({ visibleIf: { ...field.visibleIf, ...p } });
  const updateConditionalOption = (patch) => {
    const current =
      field.conditionalOption || {
        id: uid("opt"),
        label: t("classificationScaleConditionalDefaultLabel"),
        defaultValue: scaleOf(field).min,
      };
    set({ conditionalOption: { ...current, ...patch } });
  };

  const pickDep = (id) => {
    const next = prev.find((q) => q.id === id) || prev[0];
    patch({
      questionId: next.id,
      operator: next.type === "checkbox" ? "includes" : "equals",
      value: defaultValueFor(next),
    });
  };

  const depOptions = Array.isArray(dep?.options) ? dep.options.map((o) => o.label) : [];
  const yesNoOptions = dep?.type === "yes_no";

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">{t("conditionQuestion")}</Label>
        <BuilderSelect
          label=""
          options={[
            ...prev.map((q) => ({
              value: q.id,
              label: String(q.label || q.type).slice(0, 60),
            })),
            { value: "__same_field__", label: t("sameQuestion") || "Misma Pregunta" },
          ]}
          value={cond.sameFieldCondition !== undefined ? "__same_field__" : cond.questionId}
          onChange={(v) => {
            if (v === "__same_field__") {
              // Activar condición de mismo campo (Misma Pregunta)
              patch({
                sameFieldCondition: "",
                questionId: undefined,
                operator: undefined,
                value: undefined,
              });
            } else {
              // Activar condición normal (otra pregunta)
              const next = prev.find((q) => q.id === v) || prev[0];
              if (!next?.id) return;
              patch({
                questionId: next.id,
                operator: next.type === "checkbox" ? "includes" : "equals",
                value: defaultValueFor(next),
                sameFieldCondition: undefined,
              });
            }
          }}
          placeholder={t("conditionQuestion")}
        />
      </div>
      {cond.sameFieldCondition !== undefined && field.type !== "importancia" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{t("condition")}</Label>
            <BuilderSelect
              label=""
              options={[
                { value: "equals", label: t("opEquals") },
                { value: "not_equals", label: t("opNotEquals") },
                { value: "includes", label: t("opIncludes") },
                { value: "not_includes", label: t("opNotIncludes") },
              ]}
              value={cond.operator || "equals"}
              onChange={(v) => patch({ operator: v })}
              placeholder={t("conditionOperator")}
              className="col-span-2"
            />
          </div>
          <div>
            <Label className="text-xs">{t("value")}</Label>
            {isTextField(field.type) ? (
              <div>
                <Input
                  label=""
                  value={cond.sameFieldCondition || ""}
                  onChange={(e) => patch({ sameFieldCondition: e.target.value })}
                  placeholder={t("conditionValueTextPlaceholder")}
                  className="h-9 col-span-2"
                />
              </div>
            ) : (
              <div>
                <BuilderSelect
                  label=""
                  options={getSameFieldConditionOptions(language)}
                  value={cond.sameFieldCondition || ""}
                  onChange={(v) => patch({ sameFieldCondition: v })}
                  placeholder={t("conditionValuePlaceholder")}
                  className="col-span-2"
                />
              </div>
            )}
          </div>
        </div>
      )}
      {cond.sameFieldCondition !== undefined && field.type === "importancia" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{t("conditionValue")}</Label>
            <BuilderSelect
              label=""
              options={[
                ...(field.options || []).flatMap((option, index) =>
                  option.isOther === true
                    ? []
                    : [
                        {
                          value: optionAnswerValue(option, index),
                          label: option.label ?? `Opción ${index + 1}`,
                        },
                      ],
                ),
                ...((field.options || []).some((option) => option.isOther === true) ||
                cond.sameFieldCondition === "__other__"
                  ? [
                      {
                        value: "__other__",
                        label: t("classificationScaleOtherTrigger"),
                      },
                    ]
                  : []),
              ]}
              value={cond.sameFieldCondition || ""}
              onChange={(value) => {
                if (value === "__other__") {
                  set({
                    visibleIf: {
                      ...field.visibleIf,
                      sameFieldCondition: value,
                      sameFieldScale: undefined,
                    },
                    conditionalOption:
                      field.conditionalOption || {
                        id: uid("opt"),
                        label: t("classificationScaleConditionalDefaultLabel"),
                        defaultValue: scaleOf(field).min,
                      },
                  });
                } else {
                  patch({ sameFieldCondition: value, sameFieldScale: undefined });
                }
              }}
              placeholder={t("conditionValuePlaceholder")}
            />
          </div>
          {cond.sameFieldCondition !== "__other__" && (
          <div>
            <Label className="text-xs">{t("sameFieldScale")}</Label>
            <BuilderSelect
              label=""
              options={Array.from(
                { length: scaleOf(field).max - scaleOf(field).min + 1 },
                (_, i) => {
                  const n = scaleOf(field).min + i;
                  return { value: String(n), label: String(n) };
                },
              )}
              value={cond.sameFieldScale || ""}
              onChange={(v) => patch({ sameFieldScale: v })}
              placeholder={t("sameFieldScalePlaceholder")}
            />
          </div>
          )}
        </div>
      )}
      {cond.sameFieldCondition === "__other__" && field.type === "importancia" && (
        <div className="space-y-2 rounded-lg border border-default bg-surface-2 p-3">
          <p className="text-xs font-medium text-fg">{t("classificationScaleConditionalTitle")}</p>
          <div>
            <Label className="text-xs">{t("classificationScaleConditionalLabel")}</Label>
            <Input
              value={field.conditionalOption?.label || ""}
              placeholder={t("classificationScaleConditionalDefaultLabel")}
              className="h-9"
              onChange={(event) =>
                updateConditionalOption({ label: event.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs">{t("classificationScaleConditionalDefaultScore")}</Label>
            <BuilderSelect
              label=""
              options={Array.from(
                { length: scaleOf(field).max - scaleOf(field).min + 1 },
                (_, index) => {
                  const score = scaleOf(field).min + index;
                  return { value: String(score), label: String(score) };
                },
              )}
              value={String(field.conditionalOption?.defaultValue ?? scaleOf(field).min)}
              onChange={(value) =>
                updateConditionalOption({ defaultValue: Number(value) })
              }
              placeholder={t("conditionValuePlaceholder")}
            />
          </div>
          <p className="text-xs text-muted">{t("classificationScaleConditionalHint")}</p>
        </div>
      )}
      {cond.sameFieldCondition && field.type !== "importancia" && (
        <div className="mt-2">
          <Label className="text-xs">{t("sameFieldPlaceholder")}</Label>
          <Input
            value={cond.sameFieldPlaceholder || ""}
            placeholder={t("sameFieldPlaceholderHint")}
            className="h-9"
            onChange={(e) => patch({ sameFieldPlaceholder: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("sameFieldHint")}
          </p>
        </div>
      )}
      {cond.sameFieldCondition === undefined && (
        <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">{t("conditionOperator")}</Label>
          <BuilderSelect
            label=""
            options={[
              { value: "equals", label: t("opEquals") },
              { value: "not_equals", label: t("opNotEquals") },
              { value: "includes", label: t("opIncludes") },
              { value: "not_includes", label: t("opNotIncludes") },
            ]}
            value={cond.operator || "equals"}
            onChange={(v) => patch({ operator: v })}
            placeholder={t("conditionOperator")}
          />
        </div>
        <div>
          <Label className="text-xs">{t("conditionValue")}</Label>
          {depOptions.length > 0 || yesNoOptions ? (
            <BuilderSelect
              label=""
              options={(yesNoOptions ? ["Sí", "No"] : depOptions).map((opt) => ({
                value: opt,
                label: opt === "Sí" ? t("yes") : opt === "No" ? t("no") : opt,
              }))}
              value={cond.value || ""}
              onChange={(v) => patch({ value: v })}
              placeholder={t("conditionValuePlaceholder")}
            />
          ) : (
            <Input
              value={cond.value || ""}
              placeholder="Sí"
              className="h-9"
              onChange={(e) => patch({ value: e.target.value })}
            />
          )}
        </div>
      </div>
      )}
      <Button variant="ghost" size="sm" onClick={() => set({ visibleIf: null })}>
        <X className="h-3.5 w-3.5" /> {t("removeCondition")}
      </Button>
    </div>
  );
}

/**
 * Editor de la escala de un `rating`.
 *
 * Los dos rótulos de los extremos son lo importante, y por eso van primero y con
 * un aviso al lado: una escala de 1 a 7 sin anclas no dice nada, porque "3" no
 * significa nada por sí solo. Con los anclas puestos, cada número es una
 * posición con sentido y la respuesta se puede comparar entre personas.
 */
function ScaleEditor({ field, set }) {
  const { t, language } = useLanguage();
  const es = language === "es";
  const escala = scaleOf(field);
  const pasos = escala.max - escala.min + 1;

  const cambiar = (parche) => {
    const siguiente = { ...escala, ...parche };
    /* Se recorta aquí y no al pintar: un 1 a 40 se escribiría bien pero produciría
       cuarenta botones, y un max menor que el min dejaría la escala vacía. */
    siguiente.min = Math.max(1, Math.min(99, Number(siguiente.min) || DEFAULT_SCALE.min));
    siguiente.max = Math.max(
      siguiente.min + MIN_SCALE_STEPS - 1,
      Math.min(siguiente.min + MAX_SCALE_STEPS - 1, Number(siguiente.max) || DEFAULT_SCALE.max),
    );
    const conditionalOption = field.conditionalOption;
    const conditionalDefault = Number(conditionalOption?.defaultValue);
    set({
      scale: siguiente,
      ...(conditionalOption
        ? {
            conditionalOption: {
              ...conditionalOption,
              defaultValue: Number.isFinite(conditionalDefault)
                ? Math.min(siguiente.max, Math.max(siguiente.min, Math.round(conditionalDefault)))
                : siguiente.min,
            },
          }
        : {}),
    });
  };

  const sinAnclas = !escala.minLabel && !escala.maxLabel;

  return (
    <div className="rounded-xl border border-default p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label className="mb-0">{t("scale")}</Label>
        <span className="font-mono text-xs text-muted">
          {escala.min}–{escala.max} ({pasos})
        </span>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2">
        <NumberInput
          label={t("scaleFrom")}
          value={escala.min}
          onChange={(v) => cambiar({ min: v })}
        />
        <NumberInput
          label={t("scaleTo")}
          value={escala.max}
          onChange={(v) => cambiar({ max: v })}
        />
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs">{t("scaleMinLabel")}</Label>
          <Input
            value={escala.minLabel}
            placeholder={es ? "Muy en desacuerdo" : "Strongly disagree"}
            onChange={(e) => cambiar({ minLabel: e.target.value })}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">{t("scaleMaxLabel")}</Label>
          <Input
            value={escala.maxLabel}
            placeholder={es ? "Muy de acuerdo" : "Strongly agree"}
            onChange={(e) => cambiar({ maxLabel: e.target.value })}
            className="h-9"
          />
        </div>
      </div>

      {sinAnclas && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          {t("scaleNeedsAnchors")}
        </p>
      )}
    </div>
  );
}
