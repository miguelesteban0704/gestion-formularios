import { useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Plus, X, Wand2, GripVertical, AlertTriangle, ArrowDown, ArrowUp, Globe } from "lucide-react";
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

const LANGUAGES = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

// Helper to get localized value from an i18n object or plain string
function getI18nValue(obj, lang, fallback = "") {
  if (obj == null) return fallback;
  if (typeof obj === "string") return obj;
  if (typeof obj === "object") return obj[lang] ?? obj.es ?? obj.en ?? fallback;
  return fallback;
}

// Helper to set localized value in an i18n object
function setI18nValue(obj, lang, value) {
  const base = obj && typeof obj === "object" ? obj : {};
  return { ...base, [lang]: value };
}

/** Editor panel for a single field's properties. */
export function FieldSettings({ field, onChange, allQuestions = [], fieldIndex = 0, accent }) {
  const def = FIELD_DEFS[field.type];
  const [aiBusy, setAiBusy] = useState(false);
  const [improving, setImproving] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const { t, language, changeLanguage } = useLanguage();
  const [activeLang, setActiveLang] = useState(language);
  const optionSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const set = (patch) => onChange({ ...field, ...patch });
  const setValidation = (patch) => set({ validation: { ...field.validation, ...patch } });

  const updateOption = (id, updates) =>
    set({
      options: field.options.map((o) =>
        o.id === id
          ? { ...o, ...updates }
          : o
      ),
    });
  const addOption = () =>
    set({
      options: [
        ...field.options,
        {
          id: uid("opt"),
          label: { [activeLang]: `Option ${field.options.length + 1}` },
          value: "",
        },
      ],
    });
  const addOtherOption = (afterId) => {
    const afterIndex = field.options.findIndex((o) => o.id === afterId);
    if (afterIndex === -1) return;
    const newOption = {
      id: uid("opt"),
      label: {
        [activeLang]: `${t("classificationScaleOtherDefaultLabel") || "Otro"} ${field.options.filter(o => o.isOther).length + 1}`,
      },
      value: "",
      isOther: true,
    };
    const newOptions = [
      ...field.options.slice(0, afterIndex + 1),
      newOption,
      ...field.options.slice(afterIndex + 1),
    ];
    set({ options: newOptions });
  };
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
      if (option.id === id) {
        const rest = { ...option };
        delete rest.isOther;
        return enabled ? { ...rest, isOther: true } : rest;
      }
      return option;
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
            <Label>{t("imageBlock")}</Label>
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
          hints={{ dragDrop: t("fileDrop"), remove: t("fileRemove"), formatHint: t("fileAccepted") }}
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
      {/* Language Selector for editing translations */}
      <div className="mb-4 p-3 rounded-xl border border-brand-500/20 bg-brand-50/50 dark:bg-brand-900/10">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-brand-500" />
          <Label className="text-sm font-medium text-fg">{t("editingLanguage") || "Editing language"}</Label>
        </div>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              variant={activeLang === lang.code ? "primary" : "ghost"}
              size="sm"
              className="flex items-center gap-1.5"
              onClick={() => setActiveLang(lang.code)}
            >
              <span aria-hidden="true">{lang.flag}</span>
              <span className="text-xs font-medium">{lang.label}</span>
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {t("editingLanguageHint") || "Edit translations for each language. Changes are saved per language."}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>{t("questionLabel")}</Label>
        </div>
        <Input
          value={getI18nValue(field.label_i18n, activeLang, field.label)}
          onChange={(e) => {
            const val = e.target.value;
            const newLabelI18n = setI18nValue(field.label_i18n, activeLang, val);
            const patch = { label_i18n: newLabelI18n };
            // keep base label in sync for backward compat (prefer current UI language)
            if (activeLang === language || !field.label) patch.label = val;
            set(patch);
          }}
        />
      </div>

      {/* AI feature hidden - retained in code: the "AI improve" button used to
          live here (Wand2 → improve()). The `improve` handler is still defined
          below, but nothing in the UI can call it anymore. */}

      {!["yes_no", "rating", "quality_rating", "score_rating", "importancia", "file", "date", "time", "rank"].includes(field.type) && (
        <div>
          <Label>{t("placeholder")}</Label>
          <Input
            value={getI18nValue(field.placeholder_i18n, activeLang, field.placeholder)}
            onChange={(e) => {
              const val = e.target.value;
              const newPlaceholderI18n = setI18nValue(field.placeholder_i18n, activeLang, val);
              const patch = { placeholder_i18n: newPlaceholderI18n };
              if (activeLang === language || !field.placeholder) patch.placeholder = val;
              set(patch);
            }}
          />
        </div>
      )}

      <div>
        <Label>{t("description")}</Label>
        <Input
          value={getI18nValue(field.description_i18n, activeLang, field.description)}
          placeholder={t("optionalHelperText")}
          onChange={(e) => {
            const val = e.target.value;
            const newDescI18n = setI18nValue(field.description_i18n, activeLang, val);
            const patch = { description_i18n: newDescI18n };
            if (activeLang === language || !field.description) patch.description = val;
            set(patch);
          }}
        />
      </div>

      {def.hasScale && <ScaleEditor field={field} set={set} activeLang={activeLang} setActiveLang={setActiveLang} />}

      {OPTION_TYPES.includes(field.type) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>{t("options")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{t("editingLanguage")}: </span>
              <BuilderSelect
                value={activeLang}
                onChange={(lng) => setActiveLang(lng)}
                options={[
                  { value: "es", label: "Español" },
                  { value: "en", label: "English" },
                ]}
                className="w-auto"
              />
            </div>
          </div>
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
                      activeLang={activeLang}
                      setActiveLang={setActiveLang}
                      onChange={(updates) => updateOption(option.id, updates)}
                      onRemove={() => removeOption(option.id)}
                      onMove={(direction) => moveOption(option.id, direction)}
                      onToggleOther={(enabled) => toggleOtherOption(option.id, enabled)}
                      onAddOther={option.isOther === true ? () => addOtherOption(option.id) : undefined}
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
                    value={getI18nValue(o.label_i18n, activeLang, o.label)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const label_i18n = setI18nValue(o.label_i18n, activeLang, val);
                      const patch = { label_i18n };
                      if (activeLang === language || !o.label) patch.label = val;
                      updateOption(o.id, patch);
                    }}
                    className="h-9"
                    placeholder={t("optionLabelPlaceholder", { language: activeLang === "es" ? "Español" : "English" })}
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
          value={getI18nValue(field.helpText_i18n, activeLang, field.helpText)}
          placeholder={t("shownBelowField")}
          onChange={(e) => {
            const val = e.target.value;
            const newHelpI18n = setI18nValue(field.helpText_i18n, activeLang, val);
            const patch = { helpText_i18n: newHelpI18n };
            if (activeLang === language || !field.helpText) patch.helpText = val;
            set(patch);
          }}
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
              activeLang={activeLang}
              setActiveLang={setActiveLang}
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
        language={activeLang}
      />
    </div>
  );
}

function SortableOption({ option, index, count, t, activeLang, onChange, onRemove, onMove, onToggleOther, onAddOther }) {
  const { listeners, setNodeRef, transform, isDragging } = useSortable({ id: option.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 1 : undefined,
  };
  const labelText = getI18nValue(option.label_i18n, activeLang, option.label);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-1.5 rounded-lg border p-2 transition-colors ${isDragging ? "opacity-70" : "hover:bg-surface-2"} ${option.isOther === true ? "border-brand-500/30 bg-brand-500/5" : "border-transparent"}`}
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
      <div className="flex-1 min-w-[8rem] flex items-center gap-2">
        <Input
          aria-label={`${t("options")} ${index + 1}`}
          value={labelText}
          onChange={(event) => {
            const val = event.target.value;
            const label_i18n = setI18nValue(option.label_i18n, activeLang, val);
            const patch = { label_i18n };
            // sync base label for backward compat
            if (!option.label || activeLang === "es") patch.label = val;
            onChange(patch);
          }}
          className="h-9 flex-1"
        />
        {option.isOther === true && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            {t("classificationScaleOtherBadge") || "Otros"}
          </span>
        )}
      </div>
      <Switch
        checked={option.isOther === true}
        onChange={onToggleOther}
        label={option.isOther === true ? t("classificationScaleUnmarkOther") || "Desmarcar como Otros" : t("classificationScaleMarkOther") || "Marcar como Otros"}
        className="w-full sm:w-auto"
      />
      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${t("classificationScaleMoveUp")} ${labelText}`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${t("classificationScaleMoveDown")} ${labelText}`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${t("removeOption")} ${labelText}`}
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

function ScaleEditor({ field, set, activeLang, setActiveLang }) {
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
              defaultValue: Math.min(siguiente.max, Math.max(siguiente.min, conditionalDefault)),
            },
          }
        : {}),
    });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium mb-1">{t("scale")}</Label>
      <p className="text-xs text-muted mb-2">{t("scaleNeedsAnchors")}</p>
      <div className="grid grid-cols-4 gap-2">
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
        <div className="col-span-2">
          <Label className="text-xs">{t("scaleMinLabel")}</Label>
          <Input
            value={escala.minLabel || ""}
            onChange={(e) => cambiar({ minLabel: e.target.value })}
            placeholder={escala.min}
            className="h-9"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">{t("scaleMaxLabel")}</Label>
          <Input
            value={escala.maxLabel || ""}
            onChange={(e) => cambiar({ maxLabel: e.target.value })}
            placeholder={escala.max}
            className="h-9"
          />
        </div>
      </div>
      <p className="text-xs text-muted">{t("scaleNeedsAnchors")}</p>
    </div>
  );
}

function ConditionEditor({ field, set, allQuestions, fieldIndex, t, activeLang, setActiveLang }) {
  const { language } = useLanguage();
  const prev = (allQuestions || [])
    .slice(0, Math.max(0, fieldIndex))
    .filter((q) => q && !isStatic(q.type) && q.id !== field.id);
  const cond = field.visibleIf || {};
  // Pregunta de la que depende la condición (la seleccionada en `questionId`).
  // `depOptions`/`yesNoOptions` derivan de aquí; sin esta línea el editor lanzaba
  // `ReferenceError: dep is not defined` y dejaba la pantalla del constructor en
  // blanco al abrir la configuración de un campo con condición (p. ej. la
  // Clasificación por escala).
  const dep = prev.find((q) => q.id === cond.questionId) || null;

  const defaultValueFor = (q) => {
    if (!q) return "";
    if (q.type === "yes_no") return "Sí";
    if (Array.isArray(q.options) && q.options.length) return q.options[0].label || "";
    return "";
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

function isTextField(type) {
  return ["short_text", "long_text", "email", "phone", "number", "url", "password", "address"].includes(type);
}

export { LANGUAGES };