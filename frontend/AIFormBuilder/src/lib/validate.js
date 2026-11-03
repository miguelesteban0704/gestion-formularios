import { isStatic } from "./fieldTypes.js";
import { validatePhone, digitsLabel, countryFromPattern } from "./phoneRules.js";
import { translateLabel } from "./fieldTexts.js";

/** Validate a single answer; returns an error string or null. */
export function validateField(field, value, t = (key) => key, language = "en") {
  const v = field.validation || {};
  const isEmpty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  const format = (key, values = {}) => Object.entries(values).reduce((text, [name, replacement]) => text.replace(`{${name}}`, replacement), t(key));

  // Traducir la etiqueta al idioma activo para que el mensaje de error salga en el idioma correcto
  const label = translateLabel(field.label, language);

  if (field.required && isEmpty) return format("requiredError", { label });
  if (isEmpty) return null;

  const str = Array.isArray(value) ? value.join(",") : String(value);

  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
    return v.message || t("validEmailError");
  if (field.type === "url" && !/^https?:\/\/.+/.test(str))
    return v.message || t("validUrlError");

  /* Teléfono: se valida por país (el que el respondiente escriba con `+código`
     manda; si no, el que fijó el autor). `validatePhone` es la misma tabla que
     usa el backend, así que front y back coinciden.

     Los formularios guardados ANTES de la clave `validation.phone` solo tienen
     `pattern`; para no aflojarlos, si no hay `phone` explícito se deduce el país
     del propio patrón (un patrón de país fijo se comporta como `fixed`). */
  if (field.type === "phone" && v.pattern) {
    const phone = v.phone || {};
    const implied = !phone.mode ? countryFromPattern(v.pattern) : null;
    const result = validatePhone(str, {
      fixedCountry: phone.country || implied?.code || null,
      mode: phone.mode || (implied ? "fixed" : "any"),
    });
    if (!result.ok) {
      if (v.message) return v.message;
      return format("phoneInvalidError", { digits: digitsLabel(result.expected) });
    }
  }

  if (v.minLength != null && str.length < v.minLength)
    return v.message || format("minLengthError", { value: v.minLength });
  if (v.maxLength != null && str.length > v.maxLength)
    return v.message || format("maxLengthError", { value: v.maxLength });

  if (field.type === "number") {
    const num = Number(value);
    if (Number.isNaN(num)) return v.message || t("numberError");
    if (v.min != null && num < v.min) return v.message || format("minValueError", { value: v.min });
    if (v.max != null && num > v.max) return v.message || format("maxValueError", { value: v.max });
  }

  if (v.pattern && field.type !== "phone") {
    try {
      if (!new RegExp(v.pattern).test(str)) return v.message || t("invalidFormatError");
    } catch {
      /* ignore malformed regex */
    }
  }
  return null;
}

/** Validate the whole form; returns a map of fieldId → error. */
export function validateForm(questions, answers, t, language = "en") {
  const errors = {};
  for (const q of questions) {
    if (isStatic(q.type)) continue;
    const err = validateField(q, answers[q.id], t, language);
    if (err) errors[q.id] = err;
  }
  return errors;
}
