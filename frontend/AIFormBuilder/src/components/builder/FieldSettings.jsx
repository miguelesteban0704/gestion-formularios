import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Wand2, GripVertical, AlertTriangle } from "lucide-react";
import { Input, Textarea, Label } from "../ui/Input.jsx";
import { Switch } from "../ui/Switch.jsx";
import { Button } from "../ui/Button.jsx";
import { ImageUpload } from "./ImageUpload.jsx";
import { BuilderSelect } from "./BuilderSelect.jsx";
import { FIELD_DEFS, OPTION_TYPES, MIN_CHOICE_OPTIONS, uid, scaleOf, DEFAULT_SCALE, MIN_SCALE_STEPS, MAX_SCALE_STEPS, isStatic } from "../../lib/fieldTypes.js";
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

  const set = (patch) => onChange({ ...field, ...patch });
  const setValidation = (patch) => set({ validation: { ...field.validation, ...patch } });

  const updateOption = (id, label) =>
    set({ options: field.options.map((o) => (o.id === id ? { ...o, label } : o)) });
  const addOption = () =>
    set({ options: [...field.options, { id: uid("opt"), label: `Option ${field.options.length + 1}`, value: "" }] });
  const removeOption = (id) => set({ options: field.options.filter((o) => o.id !== id) });

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

      {!["yes_no", "rating", "quality_rating", "score_rating", "file", "date", "time", "rank"].includes(field.type) && (
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

  if (!prev.length) {
    return <p className="text-xs text-muted">{t("noPreviousQuestion")}</p>;
  }

  if (!field.visibleIf) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const first = prev[0];
          set({
            visibleIf: {
              questionId: first.id,
              operator: first.type === "checkbox" ? "includes" : "equals",
              value: defaultValueFor(first),
            },
          });
        }}
      >
        <Plus className="h-3.5 w-3.5" /> {t("showOnlyIf")}
      </Button>
    );
  }

  const patch = (p) => set({ visibleIf: { ...field.visibleIf, ...p } });
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
          options={prev.map((q) => ({
            value: q.id,
            label: String(q.label || q.type).slice(0, 60),
          }))}
          value={cond.questionId}
          onChange={(v) => pickDep(v)}
          placeholder={t("conditionQuestion")}
        />
      </div>
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
              placeholder={t("conditionValue")}
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
    set({ scale: siguiente });
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
