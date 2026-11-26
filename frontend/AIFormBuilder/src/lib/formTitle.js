const UNTITLED_FORM_VALUES = new Set([
  "Formulario sin título",
  "Untitled form",
]);

function pickLocalized(value, language, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") return value || fallback;
  if (typeof value === "object") {
    return value[language] ?? value.es ?? value.en ?? fallback;
  }
  return fallback;
}

export function resolveFormTitle(form, language, untitledLabel) {
  const title = pickLocalized(form?.title_i18n, language, form?.title);
  const normalizedTitle = typeof title === "string" ? title.trim() : "";

  if (!normalizedTitle || UNTITLED_FORM_VALUES.has(normalizedTitle)) {
    return untitledLabel;
  }

  return title;
}
