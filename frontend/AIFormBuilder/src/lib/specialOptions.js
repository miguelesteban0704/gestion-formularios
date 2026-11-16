/*
 * Opciones para los campos especiales de elección (province, municipality,
 * gender, education_level). Las opciones llegan ya localizadas según el
 * idioma activo (`es` / `en`) y se consumen desde `PremiumSelect` tanto en
 * el constructor (vista previa) como en el formulario público.
 *
 * Provincia y municipio vienen del catálogo cubano (`cubaLocations.js`);
 * género y nivel de escolaridad, del catálogo inclusivo
 * (`inclusiveOptions.js`).
 *
 * Los campos gender y education_level pueden tener opciones personalizadas
 * (nomenclator) definidas por el usuario en el constructor. Si existen,
 * se usan en lugar de las opciones por defecto.
 */
import {
  CUBA_PROVINCES,
  municipalitiesFor,
  translateProvince,
} from "./cubaLocations.js";
import {
  GENDER_OPTIONS,
  CUBA_EDUCATION_OPTIONS,
  localizedOptions,
} from "./inclusiveOptions.js";

export function getProvinceOptions(language) {
  return CUBA_PROVINCES.map((province) => ({
    value: province,
    label: translateProvince(province, language),
  }));
}

export function getMunicipalityOptions(province, language) {
  const munis = municipalitiesFor(province) || [];
  return munis.map((m) => ({
    value: m,
    label: m,
  }));
}

export function getGenderOptions(language) {
  return localizedOptions(GENDER_OPTIONS, language).map((label) => ({
    value: label,
    label,
  }));
}

export function getEducationOptions(language) {
  return localizedOptions(CUBA_EDUCATION_OPTIONS, language).map((label) => ({
    value: label,
    label,
  }));
}

/*
 * Devuelve las opciones de un campo especial según su tipo.
 * Si el campo tiene `customOptions` (nomenclator definido por el usuario),
 * se usan esas opciones en lugar de las por defecto.
 * Útil para no repetir el `switch` en cada consumidor.
 */
export function specialOptionsFor(type, { province, language, field } = {}) {
  // Si el campo tiene opciones personalizadas (nomenclator), usarlas
  if (field?.customOptions && Array.isArray(field.customOptions) && field.customOptions.length > 0) {
    // Las opciones personalizadas ya vienen con value y label en el idioma activo
    return field.customOptions.map((opt) => ({
      value: opt.value ?? opt.label,
      label: opt.label,
    }));
  }

  switch (type) {
    case "province":
      return getProvinceOptions(language);
    case "municipality":
      return getMunicipalityOptions(province, language);
    case "gender":
      return getGenderOptions(language);
    case "education_level":
      return getEducationOptions(language);
    default:
      return [];
  }
}
