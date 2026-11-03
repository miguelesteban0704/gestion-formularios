export const GENDER_OPTIONS = [
  { es: "Mujer", en: "Woman" },
  { es: "Hombre", en: "Man" },
  { es: "Persona no binaria", en: "Non-binary person" },
  { es: "Persona trans", en: "Trans person" },
  { es: "Mujer trans", en: "Trans woman" },
  { es: "Hombre trans", en: "Trans man" },
  { es: "Persona de género fluido", en: "Gender-fluid person" },
  { es: "Persona agénero", en: "Agender person" },
  { es: "Persona de género diverso", en: "Gender-diverse person" },
  { es: "Otra identidad de género", en: "Another gender identity" },
  { es: "Prefiero autodescribir mi identidad", en: "I prefer to self-describe my identity" },
  { es: "Prefiero no responder", en: "Prefer not to say" },
];

export const CUBA_EDUCATION_OPTIONS = [
  { es: "Sin escolaridad", en: "No formal education" },
  { es: "Primaria", en: "Primary education" },
  { es: "Secundaria básica", en: "Lower secondary education" },
  { es: "Preuniversitario", en: "Pre-university education" },
  { es: "Técnico medio", en: "Middle-level technical education" },
  { es: "Obrero calificado", en: "Qualified worker training" },
  { es: "Educación superior no universitaria", en: "Non-university higher education" },
  { es: "Universitario", en: "University degree" },
  { es: "Postgrado", en: "Postgraduate education" },
  { es: "Prefiero no responder", en: "Prefer not to say" },
];

export function localizedOptions(options, language) {
  const key = language === "es" ? "es" : "en";
  return options.map((option) => option[key]);
}
