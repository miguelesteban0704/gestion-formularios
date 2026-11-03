import React from "react";
import {
  Clock,
  CircleDot,
  CheckSquare,
  ToggleLeft,
  ListOrdered,
} from "lucide-react";
import { PhoneField } from "./PhoneField.jsx";
import { PremiumSelect } from "../ui/PremiumSelect.jsx";
import { PremiumDateField } from "../ui/PremiumDateTime.jsx";
import { FileUploadField } from "../ui/FileUploadField.jsx";
import { PremiumRadio, PremiumCheckbox, PremiumYesNo, PremiumRank } from "../ui/PremiumChoice.jsx";
import { specialOptionsFor } from "../../lib/specialOptions.js";
import { getSpecialFieldType, scaleOf, RATING_TYPES } from "../../lib/fieldTypes.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { ScoreRating, StarRating } from "../ui/Rating.jsx";

const dictionary = {
  es: {
    "image": "Bloque de imagen",
    "short text": "Texto corto",
    "long text": "Texto largo",
    "email": "Correo electrónico",
    "phone": "Teléfono",
    "number": "Número",
    "url": "URL",
    "password": "Contraseña",
    "address": "Dirección",
    "heading": "Encabezado",
    "paragraph": "Párrafo",
    "message": "mensaje",
    "section": "separador",
    "dropdown": "Lista desplegable",
    "radio": "Opción múltiple",
    "checkbox": "Casillas",
    "yes_no": "Sí / No",
    "yes": "Sí",
    "no": "No",
    "yesDesc": "Afirmativo",
    "noDesc": "Negativo",
    "rank": "Clasificación",
    "rankAdd": "Añadir más opciones al orden",
    "rankEmpty": "Arrastra o selecciona para ordenar",
    "rankOrder": "Orden actual",
    "rankAvailable": "Disponibles para añadir",
    "rankMoveUp": "Subir posición",
    "rankMoveDown": "Bajar posición",
    "rankRemove": "Quitar",
    "select": "Seleccionar…",
    "province": "Provincia",
    "municipality": "Municipio",
    "gender": "Género",
    "education_level": "Nivel de escolaridad",
    "date": "Fecha",
    "time": "Hora",
    "rating": "Valoración",
    "quality_rating": "Calidad",
    "score_rating": "Puntuación",
    "selectProvinceFirst": "Selecciona primero una provincia",
    "file": "Subir archivo",
  },
  en: {
    "image": "Image",
    "short text": "Short text",
    "long text": "Long text",
    "email": "Email",
    "phone": "Phone",
    "number": "Number",
    "url": "URL",
    "password": "Password",
    "address": "Address",
    "heading": "Heading",
    "paragraph": "Paragraph",
    "message": "message",
    "section": "section",
    "dropdown": "Dropdown",
    "radio": "Multiple Choice",
    "checkbox": "Checkboxes",
    "yes_no": "Yes / No",
    "yes": "Yes",
    "no": "No",
    "yesDesc": "Affirmative",
    "noDesc": "Negative",
    "rank": "Ranking",
    "rankAdd": "Add more options to the order",
    "rankEmpty": "Drag or select to order",
    "rankOrder": "Current order",
    "rankAvailable": "Available to add",
    "rankMoveUp": "Move up",
    "rankMoveDown": "Move down",
    "rankRemove": "Remove",
    "select": "Select…",
    "province": "Province",
    "municipality": "Municipality",
    "gender": "Gender",
    "education_level": "Education level",
    "rating": "Rating",
    "quality_rating": "Quality",
    "score_rating": "Score",
    "date": "Date",
    "time": "Time",
    "selectProvinceFirst": "Select a province first",
    "file": "File Upload",
  }
};

export function FieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
  language,
  answers,
  questions,
}) {
  const { t } = useLanguage();

  if (!field) return null;

  const lang = language || field.language || "en";
  const translate = (key) => dictionary[lang]?.[key] || dictionary.en[key] || key;

  // La etiqueta propia del campo (la que escribió el autor) tiene prioridad
  // sobre el nombre genérico del tipo; se traduce si hay entrada para ella.
  // Los tipos especiales traen una etiqueta genérica en inglés desde
  // fieldTypes.js ("Province", "Municipality", "Gender"…). Si el campo aún
  // lleva esa etiqueta por defecto, usamos el nombre del tipo traducido al
  // idioma activo en vez de dejarla en inglés.
  const DEFAULT_SPECIAL_LABELS = {
    province: "Province",
    municipality: "Municipality",
    gender: "Gender",
    education_level: "Education level",
    rating: "Rating",
    quality_rating: "Quality",
    score_rating: "Score",
    rank: "Ranking",
    email: "Email",
    phone: "Phone",
    number: "Number",
    url: "URL",
    password: "Password",
    dropdown: "Dropdown",
    radio: "Multiple Choice",
    checkbox: "Checkboxes",
    yes_no: "Yes / No",
    date: "Date Picker",
    time: "Time Picker",
    file: "File Upload",
    section: "Section Divider",
    heading: "Heading",
    paragraph: "Paragraph",
  };
  const isSpecialDefault =
    [
      "province",
      "municipality",
      "gender",
      "education_level",
      "rating",
      "quality_rating",
      "score_rating",
      "rank",
      "email",
      "phone",
      "number",
      "url",
      "password",
      "dropdown",
      "radio",
      "checkbox",
      "yes_no",
      "date",
      "time",
      "file",
      "section",
      "heading",
      "paragraph",
    ].includes(field.type) &&
    field.label === DEFAULT_SPECIAL_LABELS[field.type];
  const fieldLabel = isSpecialDefault
    ? translate(field.type)
    : field.label || translate(field.type === "textarea" ? "long text" : field.type);
  const fieldValue = value !== undefined ? value : field.content || "";
  const isDisabled = disabled === true;

  const inputClass = (err) => `
    w-full rounded-xl border bg-background px-3 py-2.5 text-sm transition-all duration-200
    ${err ? "border-red-500" : "border-slate-300 dark:border-slate-700"}
    ${isDisabled ? "cursor-not-allowed bg-slate-100/50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 opacity-60" : "hover:border-brand-400/60 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/12"}
  `.trim();

  const handleChange = (val) => {
    if (isDisabled) return;
    if (onChange) onChange(val);
    else field.content = val;
  };

  /* ── Campos especiales de elección con opciones dinámicas ── */

  if (field.type === "province") {
    const options = specialOptionsFor("province", { language: lang });
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumSelect
          label=""
          icon={null}
          options={options}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          placeholder={translate("select")}
          error={!!error}
          required={field.required}
          searchable
          language={lang}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "municipality") {
    /* El municipio depende de una provincia. Si ninguna provincia tiene
       respuesta, el select se deshabilita y muestra un tooltip elegante
       encima pidiendo elegir primero la provincia. */
    let provinceAnswer = "";
    if (questions && answers) {
      for (const q of questions) {
        if (getSpecialFieldType(q) === "province" && answers[q.id]) {
          provinceAnswer = answers[q.id];
          break;
        }
      }
    }
    const waitingForProvince = !provinceAnswer;
    const options = waitingForProvince
      ? []
      : specialOptionsFor("municipality", { province: provinceAnswer, language: lang });

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumSelect
          label=""
          icon={null}
          options={options}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled || waitingForProvince}
          placeholder={waitingForProvince ? translate("selectProvinceFirst") : translate("select")}
          error={!!error}
          required={field.required}
          searchable
          tooltip={waitingForProvince ? translate("selectProvinceFirst") : undefined}
          tooltipSide="top"
          language={lang}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        {waitingForProvince && !error && (
          <p className="mt-1 text-xs text-muted/70 dark:text-slate-400/70">
            {translate("selectProvinceFirst")}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "gender") {
    const options = specialOptionsFor("gender", { language: lang });
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumSelect
          label=""
          icon={null}
          options={options}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          placeholder={translate("select")}
          error={!!error}
          required={field.required}
          searchable
          language={lang}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "education_level") {
    const options = specialOptionsFor("education_level", { language: lang });
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumSelect
          label=""
          icon={null}
          options={options}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          placeholder={translate("select")}
          error={!!error}
          required={field.required}
          searchable
          language={lang}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "dropdown") {
    const options = (field.options || []).map((o) => ({ value: o.value ?? "", label: o.label ?? "" }));
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumSelect
          label=""
          icon={null}
          options={options}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          placeholder={translate("select")}
          error={!!error}
          required={field.required}
          searchable={options.length > 8}
          language={lang}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  /* ── Campos de entrada de texto ── */
  if (field.type === "short_text" || field.type === "text") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <input
          type="text"
          placeholder={field.placeholder || ""}
          value={fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "long_text" || field.type === "textarea") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <textarea
          placeholder={field.placeholder || ""}
          value={fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
          rows={4}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "email") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <input
          type="email"
          placeholder={field.placeholder || "correo@ejemplo.com"}
          value={fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "phone") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PhoneField
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          error={error}
          phone={field.validation?.phone || null}
          pattern={field.validation?.pattern || null}
          language={lang}
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <input
          type="number"
          placeholder={field.placeholder || "0"}
          value={fieldValue === "" ? "" : fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "url") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <input
          type="url"
          placeholder={field.placeholder || "https://"}
          value={fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "password") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <input
          type="password"
          placeholder={field.placeholder || "••••••••"}
          value={fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "address") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <input
          type="text"
          placeholder={field.placeholder || "Dirección completa"}
          value={fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  /* ── Campos de elección premium (radio, checkbox, yes_no, rank) ── */
  if (field.type === "radio") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumRadio
          label=""
          icon={CircleDot}
          options={(field.options || []).map((o, i) => ({
            id: o.id,
            label: o.label ?? "",
            value: o.value ?? o.id ?? o.label ?? String(i),
            description: o.description ?? "",
          }))}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          error={!!error}
          required={field.required}
          language={lang}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "checkbox") {
    const values = Array.isArray(fieldValue) ? fieldValue : fieldValue ? [fieldValue] : [];
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumCheckbox
          label=""
          icon={CheckSquare}
          options={(field.options || []).map((o, i) => ({
            id: o.id,
            label: o.label ?? "",
            value: o.value ?? o.id ?? o.label ?? String(i),
            description: o.description ?? "",
          }))}
          value={values}
          onChange={handleChange}
          disabled={isDisabled}
          error={!!error}
          required={field.required}
          language={lang}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "yes_no") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumYesNo
          label=""
          value={fieldValue === "yes" ? "yes" : fieldValue === "no" ? "no" : undefined}
          onChange={handleChange}
          disabled={isDisabled}
          error={!!error}
          required={field.required}
          language={lang}
          t={t}
          yesLabel={translate("yes")}
          noLabel={translate("no")}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "rank") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumRank
          label=""
          icon={ListOrdered}
          options={(field.options || []).map((o) => ({
            id: o.id,
            label: o.label ?? "",
            value: o.value ?? "",
            description: o.description ?? "",
          }))}
          value={Array.isArray(fieldValue) ? fieldValue : fieldValue ? [fieldValue] : []}
          onChange={handleChange}
          disabled={isDisabled}
          error={!!error}
          required={field.required}
          language={lang}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  /* ── Campos avanzados (fecha y hora premium) ── */
  if (field.type === "date") {
    return (
      <PremiumDateField
        label={fieldLabel}
        value={fieldValue}
        onChange={handleChange}
        disabled={isDisabled}
        error={!!error}
        required={field.required}
        type="date"
        language={lang}
      />
    );
  }

  if (field.type === "time") {
    return (
      <PremiumDateField
        label={fieldLabel}
        value={fieldValue}
        onChange={handleChange}
        disabled={isDisabled}
        error={!!error}
        required={field.required}
        icon={Clock}
        type="time"
        language={lang}
      />
    );
  }

  if (field.type === "file") {
    return (
      <FileUploadField
        label={t ? t("field_file") : "Subir archivo"}
        value={fieldValue}
        onChange={(file) => handleChange(file ? file.name : null)}
        disabled={isDisabled}
        error={!!error}
        required={field.required}
        language={lang}
        t={t}
      />
    );
  }

  /* ── Campos de valoración premium (rating / estrellas) ──
     `rating`, `quality_rating` y `score_rating` caían al
     <input type="text"> fallback; ahora renderizan el widget
     premium con glassmorphism, color por rango, tooltips y a11y. */
  if (RATING_TYPES.includes(field.type)) {
    const scale = scaleOf(field);
    const Rating = field.type === "quality_rating" ? StarRating : ScoreRating;
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <Rating
          label=""
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          error={!!error}
          min={scale.min}
          max={scale.max}
          language={lang}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  /* ── Bloques de diseño (estáticos) ── */
  if (field.type === "heading") {
    return (
      <div>
        <h2 className="text-xl font-bold text-fg dark:text-slate-100">{fieldLabel}</h2>
        {field.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{field.description}</p>}
      </div>
    );
  }

  if (field.type === "paragraph") {
    return (
      <div>
        <p className="text-fg dark:text-slate-100 whitespace-pre-line">{field.content || fieldLabel}</p>
      </div>
    );
  }

  if (field.type === "section") {
    return (
      <div className="pt-8 first:pt-0">
        {fieldLabel && (
          <h3 className="text-xs font-semibold uppercase tracking-widest text-current/55">{fieldLabel}</h3>
        )}
        <hr className="mt-2 border-t border-current/15" />
      </div>
    );
  }

  if (field.type === "message") {
    return (
      <div>
        <p className="text-fg dark:text-slate-100 whitespace-pre-line">{field.content || fieldLabel}</p>
      </div>
    );
  }

  /* Fallback para cualquier tipo no reconocido */
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
      <input
        type="text"
        placeholder={field.placeholder || ""}
        value={fieldValue}
        onChange={(e) => handleChange(e.target.value)}
        className={inputClass(!!error)}
        disabled={isDisabled}
        id={`q-${field.id}`}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
