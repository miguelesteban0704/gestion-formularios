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
import { ChronoSelect } from "../ui/ChronoSelect.jsx";
import { PremiumDateField } from "../ui/PremiumDateTime.jsx";
import { FileUploadField } from "../ui/FileUploadField.jsx";
import { PremiumRadio, PremiumCheckbox, PremiumYesNo, PremiumRank } from "../ui/PremiumChoice.jsx";
import { PremiumImportancia } from "../ui/PremiumImportancia.jsx";

import { specialOptionsFor } from "../../lib/specialOptions.js";
import { getSpecialFieldType, scaleOf, RATING_TYPES, optionAnswerValue, FIELD_DEFS, GENDER_OPTIONS } from "../../lib/fieldTypes.js";
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
    "rankRemove": "Quit",
    "importancia": "Clasificación por Escala",
    "importanciaAdd": "Añadir más elementos",
    "importanciaEmpty": "Selecciona elementos para clasificar",
    "importanciaOrder": "Orden actual",
    "importanciaAvailable": "Elementos disponibles",
    "importanciaMoveUp": "Subir elemento",
    "importanciaMoveDown": "Bajar elemento",
    "importanciaRemove": "Quitar elemento",
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
    "importancia": "Classification by scale",
    "importanciaAdd": "Add more options to the order",
    "importanciaEmpty": "Select priority",
    "importanciaOrder": "Current order",
    "importanciaAvailable": "Available to add",
    "importanciaMoveUp": "Move up",
    "importanciaMoveDown": "Move down",
    "importanciaRemove": "Remove",
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
  const translate = (key) => {
    const value = t ? t(key) : "";
    return value && value !== key ? value : dictionary[lang]?.[key] || key;
  };

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

  // Helper para verificar si se cumple la condición de mismo campo
  // Se define AQUÍ (antes de usarse) para evitar "Cannot access before initialization"
  const checkSameFieldCondition = (field, answers) => {
    if (!field.visibleIf?.sameFieldCondition) return false;
    const conditionValue = field.visibleIf.sameFieldCondition;
    const conditionScale = field.visibleIf?.sameFieldScale;
    const answer = answers?.[field.id];

    if (answer == null || answer === "") return false;

    // Compara dos valores de respuesta. Para Género, las opciones del catálogo
    // se guardan y seleccionan en el idioma activo (es/en), así que la misma
    // opción puede tener un valor distinto según el idioma: se comparan por
    // identidad de opción para que "autodescribir mi identidad" funcione aunque
    // constructor y respondiente usen idiomas distintos. Otros campos comparan
    // por igualdad estricta, sin cambios.
    const sameValue = (a, b) => {
      if (a === b) return true;
      if (field.type === "gender" && typeof a === "string" && typeof b === "string") {
        return GENDER_OPTIONS.some(
          (opt) => (opt.es === a || opt.en === a) && (opt.es === b || opt.en === b),
        );
      }
      return false;
    };

    // Clasificación por escala: respuesta { [optionId]: scaleValue | { value:"other", otherText } }
    if (field.type === "importancia" && typeof answer === "object" && !Array.isArray(answer)) {
      const entry = answer[conditionValue];
      if (entry == null || entry === "") return false;

      if (conditionScale) {
        const scaleVal = typeof entry === "object" ? (entry.value ?? entry.priority ?? "") : entry;
        return String(scaleVal) === String(conditionScale);
      }

      // Sin escala específica: se activa cuando la opción tiene cualquier valor asignado
      return true;
    }

    // Para checkbox/múltiple respuesta
    if (Array.isArray(answer)) {
      return answer.some((v) => sameValue(v, conditionValue));
    }

    // Para respuesta simple
    return sameValue(answer, conditionValue);
  };

  // Helper para obtener el placeholder personalizado del campo extra
  const getSameFieldPlaceholder = (field) => {
    if (field.visibleIf?.sameFieldPlaceholder) return field.visibleIf.sameFieldPlaceholder;
    return "Especifica...";
  };

  /* ── Campos especiales de elección con opciones dinámicas ── */

  if (field.type === "province") {
    const options = specialOptionsFor("province", { language: lang });
    const showAdditionalText = checkSameFieldCondition(field, answers);
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <ChronoSelect
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
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
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
    const showAdditionalText = checkSameFieldCondition(field, answers);

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <ChronoSelect
          label=""
          icon={null}
          options={options}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled || waitingForProvince}
          placeholder={waitingForProvince ? translate("selectProvinceFirst") : translate("select")}
          error={!!error}
          required={field.required}
          language={lang}
          t={t}
          searchable
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        {waitingForProvince && !error && (
          <p className="mt-1 text-xs text-muted/70 dark:text-slate-400/70">
            {translate("selectProvinceFirst")}
          </p>
        )}
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "gender") {
    const options = specialOptionsFor("gender", { language: lang, field });
    const showAdditionalText = checkSameFieldCondition(field, answers);
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <ChronoSelect
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
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "education_level") {
    const options = specialOptionsFor("education_level", { language: lang, field });
    const showAdditionalText = checkSameFieldCondition(field, answers);
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <ChronoSelect
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
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "dropdown") {
    const options = (field.options || []).map((o, i) => ({
      value: optionAnswerValue(o, i),
      label: o.label ?? "",
    }));
    // Verificar si hay una condición de mismo campo que se cumple
    const showAdditionalText = field.visibleIf?.sameFieldCondition &&
      fieldValue === field.visibleIf.sameFieldCondition;

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <ChronoSelect
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
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
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
    // Verificar si hay una condición de mismo campo que se cumple
    const showAdditionalText = field.visibleIf?.sameFieldCondition &&
      answers?.[field.id] === field.visibleIf.sameFieldCondition;

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumRadio
          label=""
          options={(field.options || []).map((o, i) => ({
            id: o.id,
            label: o.label ?? "",
            value: optionAnswerValue(o, i),
            description: o.description ?? "",
          }))}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          error={!!error}
          required={field.required}
          t={t}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "checkbox") {
    const values = Array.isArray(fieldValue) ? fieldValue : fieldValue ? [fieldValue] : [];
    // Verificar si hay una condición de mismo campo que se cumple
    const showAdditionalText = field.visibleIf?.sameFieldCondition &&
      values.includes(field.visibleIf.sameFieldCondition);

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumCheckbox
          label=""
          options={(field.options || []).map((o, i) => ({
            id: o.id,
            label: o.label ?? "",
            value: optionAnswerValue(o, i),
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
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "yes_no") {
    const showAdditionalText = checkSameFieldCondition(field, answers);

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
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === "importancia") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumImportancia
          field={field}
          value={
            fieldValue && typeof fieldValue === "object" && !Array.isArray(fieldValue)
              ? fieldValue
              : {}
          }
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

  if (field.type === "rank") {
    const showAdditionalText = checkSameFieldCondition(field, answers);
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumRank
          label=""
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
        {showAdditionalText && (
          <div className="mt-2">
            <input
              type="text"
              placeholder={getSameFieldPlaceholder(field)}
              value={answers?.[`${field.id}_other`] || ""}
              onChange={(e) => handleChange({ id: `${field.id}_other`, value: e.target.value })}
              className={inputClass(false)}
              disabled={isDisabled}
              id={`q-${field.id}-other`}
            />
          </div>
        )}
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
  if (field.type === "image") {
    return (
      <div>
        {field.content && (
          <img
            src={field.content}
            alt={field.label || "Imagen del bloque"}
            className="aspect-video w-full rounded-xl object-cover shadow-lg ring-1 ring-slate-200/50 dark:ring-slate-700/50"
          />
        )}
        {!field.content && (
          <div className="aspect-video w-full rounded-xl border-2 border-dashed border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
            Sin imagen
          </div>
        )}
      </div>
    );
  }

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
