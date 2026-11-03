/*
 * Opciones para los campos especiales de elección (province, municipality,
 * gender, education_level). Las opciones llegan ya localizadas según el
 * idioma activo (`es` / `en`) y se consumen desde `PremiumSelect` tanto en
 * el constructor (vista previa) como en el formulario público.
 *
 * Provincia y municipio vienen del catálogo cubano (`cubaLocations.js`);
 * género y nivel de escolaridad, del catálogo inclusivo
 * (`inclusiveOptions.js`).
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
 * Devuelve las opciones de un campo especial según su tipo. Útil para no
 * repetir el `switch` en cada consumidor.
 */
export function specialOptionsFor(type, { province, language } = {}) {
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
