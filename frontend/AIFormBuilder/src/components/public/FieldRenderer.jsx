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

function pickI18n(value, lng, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") return value || fallback;
  if (typeof value === "object") {
    return value[lng] ?? value.es ?? value.en ?? fallback;
  }
  return fallback;
}

function resolveQuestionLabel(field, formI18n, language) {
  const lng = language || "es";
  const qI18n = formI18n?.[field.id];
  return pickI18n(qI18n?.label, lng, pickI18n(field.label_i18n, lng, field.label));
}

function resolveQuestionDescription(field, formI18n, language) {
  const lng = language || "es";
  const qI18n = formI18n?.[field.id];
  return pickI18n(qI18n?.description, lng, pickI18n(field.description_i18n, lng, field.description || ""));
}

function resolveQuestionPlaceholder(field, formI18n, language) {
  const lng = language || "es";
  const qI18n = formI18n?.[field.id];
  return pickI18n(qI18n?.placeholder, lng, pickI18n(field.placeholder_i18n, lng, field.placeholder || ""));
}

function resolveQuestionHelpText(field, formI18n, language) {
  const lng = language || "es";
  const qI18n = formI18n?.[field.id];
  return pickI18n(qI18n?.helpText, lng, pickI18n(field.helpText_i18n, lng, field.helpText || ""));
}

function resolveOptionLabel(field, option, formI18n, language) {
  const lng = language || "es";
  const optId = typeof option === "string" ? option : option?.id;
  const optObj = typeof option === "string" ? field.options?.find((o) => o.id === option) : option;
  const fallback = optObj?.label ?? optObj?.value ?? optId ?? "";
  const qI18n = formI18n?.[field.id];
  const byId = optId ? qI18n?.options?.[optId]?.label : null;
  if (byId) return pickI18n(byId, lng, pickI18n(optObj?.label_i18n, lng, fallback));
  // also try matching by option value/index key in some i18n structures
  return pickI18n(optObj?.label_i18n, lng, fallback);
}

function resolveScaleLabels(field, formI18n, language) {
  const lng = language || "es";
  const scale = scaleOf(field);
  const qI18n = formI18n?.[field.id];
  return {
    ...scale,
    minLabel: pickI18n(qI18n?.scale?.minLabel, lng, pickI18n(field.scale_i18n?.minLabel, lng, scale.minLabel || "")),
    maxLabel: pickI18n(qI18n?.scale?.maxLabel, lng, pickI18n(field.scale_i18n?.maxLabel, lng, scale.maxLabel || "")),
  };
}

export function FieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
  language,
  answers,
  questions,
  formI18n,
}) {
  const { t } = useLanguage();

  if (!field) return null;

  const lang = language || field.language || "en";
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
    ? t(`field_${field.type}`)
    : resolveQuestionLabel(field, formI18n, lang);
  const fieldValue = value !== undefined ? value : field.content || "";
  const isDisabled = disabled === true;
  const fieldPlaceholder = resolveQuestionPlaceholder(field, formI18n, lang);
  const fieldDescription = resolveQuestionDescription(field, formI18n, lang);
  const fieldHelpText = resolveQuestionHelpText(field, formI18n, lang);
  const fieldScale = resolveScaleLabels(field, formI18n, lang);

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

  const checkSameFieldCondition = (field, answers) => {
    if (!field.visibleIf?.sameFieldCondition) return false;
    const conditionValue = field.visibleIf.sameFieldCondition;
    const conditionScale = field.visibleIf?.sameFieldScale;
    const answer = answers?.[field.id];

    if (answer == null || answer === "") return false;

    const sameValue = (a, b) => {
      if (a === b) return true;
      if (field.type === "gender" && typeof a === "string" && typeof b === "string") {
        return GENDER_OPTIONS.some(
          (opt) => (opt.es === a || opt.en === a) && (opt.es === b || opt.en === b),
        );
      }
      return false;
    };

    if (field.type === "importancia" && typeof answer === "object" && !Array.isArray(answer)) {
      const entry = answer[conditionValue];
      if (entry == null || entry === "") return false;

      if (conditionScale) {
        const scaleVal = typeof entry === "object" ? (entry.value ?? entry.priority ?? "") : entry;
        return String(scaleVal) === String(conditionScale);
      }

      return true;
    }

    if (Array.isArray(answer)) {
      return answer.some((v) => sameValue(v, conditionValue));
    }

    return sameValue(answer, conditionValue);
  };

  const getSameFieldPlaceholder = (field) => {
    if (field.visibleIf?.sameFieldPlaceholder) return field.visibleIf.sameFieldPlaceholder;
    return t("sameFieldPlaceholder") || "Especifique...";
  };

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
          placeholder={t("select")}
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
          placeholder={waitingForProvince ? t("selectProvinceFirst") : t("select")}
          error={!!error}
          required={field.required}
          language={lang}
          t={t}
          searchable
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        {waitingForProvince && !error && (
          <p className="mt-1 text-xs text-muted/70 dark:text-slate-400/70">
            {t("selectProvinceFirst")}
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
          placeholder={t("select")}
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
          placeholder={t("select")}
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
      label: resolveOptionLabel(field, o, formI18n, lang),
    }));
    const showAdditionalText = checkSameFieldCondition(field, answers);

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        {fieldDescription && <p className="mt-0.5 mb-1 text-xs text-muted">{fieldDescription}</p>}
        <ChronoSelect
          label=""
          icon={null}
          options={options}
          value={fieldValue}
          onChange={handleChange}
          disabled={isDisabled}
          placeholder={fieldPlaceholder || t("select")}
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

  if (field.type === "short_text" || field.type === "text") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        {fieldDescription ? <p className="mb-1 text-xs text-muted">{fieldDescription}</p> : null}
        <input
          type="text"
          placeholder={fieldPlaceholder}
          value={fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
        />
        {fieldHelpText && !error ? <p className="mt-1 text-xs text-muted">{fieldHelpText}</p> : null}
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "long_text" || field.type === "textarea") {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        {fieldDescription ? <p className="mb-1 text-xs text-muted">{fieldDescription}</p> : null}
        <textarea
          placeholder={fieldPlaceholder}
          value={fieldValue}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass(!!error)}
          disabled={isDisabled}
          id={`q-${field.id}`}
          rows={4}
        />
        {fieldHelpText && !error ? <p className="mt-1 text-xs text-muted">{fieldHelpText}</p> : null}
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
          placeholder={fieldPlaceholder || t("emailPlaceholder") || "correo@ejemplo.com"}
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
          placeholder={fieldPlaceholder || "0"}
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
          placeholder={fieldPlaceholder || "https://"}
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
          placeholder={fieldPlaceholder || "••••••••"}
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
          placeholder={fieldPlaceholder || t("addressPlaceholder") || "Dirección completa"}
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

  if (field.type === "radio") {
    const showAdditionalText = checkSameFieldCondition(field, answers);

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumRadio
          label=""
          options={(field.options || []).map((o, i) => ({
            id: o.id,
            label: resolveOptionLabel(field, o.id, formI18n, lang),
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
    const showAdditionalText = checkSameFieldCondition(field, answers);

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        <PremiumCheckbox
          label=""
          options={(field.options || []).map((o, i) => ({
            id: o.id,
            label: resolveOptionLabel(field, o.id, formI18n, lang),
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
          yesLabel={t("yes")}
          noLabel={t("no")}
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
            label: resolveOptionLabel(field, o.id, formI18n, lang),
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

  if (field.type === "date") {
    return (
      <PremiumDateField
        label={fieldLabel}
        value={fieldValue}
        onChange={handleChange}
        disabled={isDisabled}
        placeholder={fieldPlaceholder || t("chooseDate")}
        error={!!error}
        required={field.required}
        icon={Clock}
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
        placeholder={fieldPlaceholder || t("chooseTime")}
        error={!!error}
        required={field.required}
        icon={Clock}
        type="time"
        language={lang}
      />
    );
  }

  if (RATING_TYPES.includes(field.type)) {
    const isQuality = field.type === "quality_rating";
    const isScore = field.type === "score_rating";
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
        {field.required && <span className="ml-1 text-red-500">*</span>}
        {isQuality ? (
          <StarRating
            name={`q-${field.id}`}
            value={fieldValue}
            onChange={handleChange}
            disabled={isDisabled}
            error={!!error}
            required={field.required}
            scale={fieldScale}
            t={t}
            language={lang}
          />
        ) : (
          <ScoreRating
            name={`q-${field.id}`}
            value={fieldValue}
            onChange={handleChange}
            disabled={isDisabled}
            error={!!error}
            required={field.required}
            scale={fieldScale}
            t={t}
            language={lang}
          />
        )}
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <FileUploadField
        name={`q-${field.id}`}
        label={fieldLabel}
        value={fieldValue}
        onChange={handleChange}
        disabled={isDisabled}
        error={error}
        required={field.required}
        language={lang}
        t={t}
      />
    );
  }

  if (field.type === "section") {
    return (
      <hr className="border-border my-4" />
    );
  }

  const localizedContent = pickI18n(field.content_i18n, lang, field.content || "");

  if (field.type === "heading") {
    return (
      <h3 className="text-lg font-semibold text-fg dark:text-slate-100 mb-2">{localizedContent || fieldLabel}</h3>
    );
  }

  if (field.type === "paragraph") {
    return (
      <p className="text-sm text-fg/80 dark:text-slate-300">{localizedContent || fieldLabel}</p>
    );
  }

  if (field.type === "message") {
    return (
      <div className="p-4 rounded-xl bg-brand-50/50 dark:bg-brand-900/20 border border-brand-200/50 dark:border-brand-800/50">
        <p className="text-sm text-fg dark:text-slate-200">{localizedContent || fieldLabel}</p>
      </div>
    );
  }

  if (field.type === "image") {
    return (
      <div className="rounded-xl overflow-hidden border border-default bg-surface">
        {field.content ? (
          <img
            src={field.content}
            alt={fieldLabel}
            className="w-full h-auto"
          />
        ) : (
          <div className="w-full aspect-video flex items-center justify-center bg-surface-2/50 text-muted">
            {t("imagePlaceholder") || "Sin imagen"}
          </div>
        )}
        <p className="mt-2 text-xs text-muted text-center">{fieldLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-fg dark:text-slate-100">{fieldLabel}</label>
      <p className="text-sm text-muted">{t("noDataYet")}</p>
    </div>
  );
}