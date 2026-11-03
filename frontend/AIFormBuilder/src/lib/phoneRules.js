/*
 * Reglas de teléfono por país para el constructor y el render público.
 *
 * No hay catálogo de países en el proyecto (el campo `phone` solo es un input
 * `type="tel"` sin validación), así que aquí viven los países relevantes para la
 * instancia y, de cada uno, cuántos dígitos tiene el número nacional.
 *
 * La validación se guarda en `field.validation.pattern` (regex) —la aplican por
 * igual `lib/validate.js` (front) y `services/response.service.js` (back)— y la
 * intención del autor (`field.validation.phone = { mode, country }`) permite al
 * render público ofrecer un selector de país con banderas:
 *   - `mode: "fixed"`    → el autor fijó un país; la respuesta solo acepta ese.
 *   - `mode: "any"`      → «Cualquier país»: el respondiente elige y se valida
 *                          la longitud de SU país.
 *
 * `digits` puede ser un número (longitud exacta) o un array (varias longitudes
 * válidas, p. ej. un país con líneas fijas y móviles de distinto largo).
 */

export const PHONE_COUNTRIES = [
  { code: "CU", label: "Cuba", dial: "53", digits: 8, flag: "🇨🇺" },
  { code: "US", label: "Estados Unidos / Canadá", dial: "1", digits: 10, flag: "🇺🇸" },
  { code: "MX", label: "México", dial: "52", digits: 10, flag: "🇲🇽" },
  { code: "ES", label: "España", dial: "34", digits: 9, flag: "🇪🇸" },
  { code: "CO", label: "Colombia", dial: "57", digits: 10, flag: "🇨🇴" },
  { code: "AR", label: "Argentina", dial: "54", digits: 10, flag: "🇦🇷" },
  { code: "CL", label: "Chile", dial: "56", digits: 9, flag: "🇨🇱" },
  { code: "PE", label: "Perú", dial: "51", digits: 9, flag: "🇵🇪" },
  { code: "VE", label: "Venezuela", dial: "58", digits: 10, flag: "🇻🇪" },
  { code: "DO", label: "República Dominicana", dial: "1", digits: 10, flag: "🇩🇴" },
  { code: "BR", label: "Brasil", dial: "55", digits: [10, 11], flag: "🇧🇷" },
  { code: "FR", label: "Francia", dial: "33", digits: 9, flag: "🇫🇷" },
  { code: "DE", label: "Alemania", dial: "49", digits: [10, 11], flag: "🇩🇪" },
  { code: "GB", label: "Reino Unido", dial: "44", digits: 10, flag: "🇬🇧" },
  { code: "RU", label: "Rusia", dial: "7", digits: 10, flag: "🇷🇺" },
  { code: "CN", label: "China", dial: "86", digits: 11, flag: "🇨🇳" },
];

/** Cuántos dígitos exige el país (o lista de longitudes válidas). */
export function digitsFor(code) {
  return PHONE_COUNTRIES.find((c) => c.code === code)?.digits ?? null;
}

/** País por código ISO (o `null`). */
export function countryFor(code) {
  return PHONE_COUNTRIES.find((c) => c.code === code) || null;
}

/** Etiqueta de un país en el idioma dado (`es` o `en`). */
export function countryLabel(code, language) {
  const country = PHONE_COUNTRIES.find((c) => c.code === code);
  if (!country) return "";
  const labels = COUNTRY_LABELS[code];
  if (labels) return language === "en" ? labels.en : labels.es;
  return country.label;
}

/** Diccionario de etiquetas de país por código ISO (es / en). */
export const COUNTRY_LABELS = {
  CU: { es: "Cuba", en: "Cuba" },
  US: { es: "Estados Unidos / Canadá", en: "United States / Canada" },
  MX: { es: "México", en: "Mexico" },
  ES: { es: "España", en: "Spain" },
  CO: { es: "Colombia", en: "Colombia" },
  AR: { es: "Argentina", en: "Argentina" },
  CL: { es: "Chile", en: "Chile" },
  PE: { es: "Perú", en: "Peru" },
  VE: { es: "Venezuela", en: "Venezuela" },
  DO: { es: "República Dominicana", en: "Dominican Republic" },
  BR: { es: "Brasil", en: "Brazil" },
  FR: { es: "Francia", en: "France" },
  DE: { es: "Alemania", en: "Germany" },
  GB: { es: "Reino Unido", en: "United Kingdom" },
  RU: { es: "Rusia", en: "Russia" },
  CN: { es: "China", en: "China" },
};

/** Texto legible de la longitud esperada ("8 dígitos" / "10 o 11 dígitos"). */
export function digitsLabel(digits) {
  if (digits == null) return "";
  if (Array.isArray(digits)) return digits.join(" o ");
  return String(digits);
}

/** ¿La cantidad de dígitos `n` encaja con la longitud del país? */
export function digitsMatch(n, digits) {
  if (digits == null) return true;
  return Array.isArray(digits) ? digits.includes(n) : n === digits;
}

/**
 * Detecta el país por el `+código` de marcación al principio del número.
 *
 * Los códigos pueden ser prefijo de otros (`+1` vs `+1X`), así que se prueban de
 * más largo a más corto y se devuelve el primero que encaje. Sin `+` explícito
 * no hay detección (devolver el país «equivocado» sería peor que no detectar).
 */
export function detectCountry(value) {
  const text = String(value ?? "").trim();
  if (!text.startsWith("+")) return null;
  const digitsOnly = text.replace(/[^\d]/g, "");
  const byLongestDial = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of byLongestDial) {
    if (digitsOnly.startsWith(c.dial)) return c;
  }
  return null;
}

/**
 * Construye la regex de teléfono para un país fijo.
 *
 * - `digits`: longitud exacta del número nacional (número o array). `null` =
 *   sin comprobación de longitud.
 * - `allowCountryCode`: admite el prefijo del país (`dial`, con `+` opcional) delante.
 *
 * Devuelve una cadena de patrón lista para `field.validation.pattern`.
 */
export function buildPhonePattern({ digits = null, dial = null, allowCountryCode = false } = {}) {
  const quantified = Array.isArray(digits)
    ? `(?:${digits.map((d) => `\\d{${d}}`).join("|")})`
    : digits != null
      ? `\\d{${digits}}`
      : `\\d{6,15}`;
  const prefix = allowCountryCode && dial ? `(?:\\+?${dial}\\s?)?` : "";
  return `^\\s*${prefix}${quantified}\\s*$`;
}

/**
 * Regex «cualquier país»: número nacional de 6-15 dígitos, con un `+código`
 * opcional delante. La comprobación por país concreto la hace `validatePhone`
 * (que sí conoce la tabla) tanto en el front como en el back.
 */
export const ANY_PHONE_PATTERN = "^\\s*(?:\\+?\\d{1,4}[\\s.-]?)?\\d{6,15}\\s*$";

/**
 * Valida un teléfono con la tabla de países. Es la fuente única que comparten
 * `lib/validate.js` (front) y `services/response.service.js` (back).
 *
 * Devuelve `{ ok, expected, country }`:
 *   - `ok`: el número es válido.
 *   - `expected`: longitudes válidas del país (para el mensaje).
 *   - `country`: país detectado (por `+código`) o el fijo, si lo hay.
 *
 * Reglas, en orden:
 *   1. `+código` reconocido → se comprueban los dígitos de ESE país.
 *   2. Sin `+` → se usan los del país fijo (`fixedCountry`), si lo hay.
 *   3. Sin país reconocible → se exige un rango humano (6-15 dígitos).
 */
export function validatePhone(value, { fixedCountry = null, mode = "any" } = {}) {
  const raw = String(value ?? "").trim();
  const dialed = detectCountry(raw);

  if (dialed) {
    const n = raw.replace(/[^\d]/g, "").slice(dialed.dial.length).length;
    return { ok: digitsMatch(n, dialed.digits), expected: dialed.digits, country: dialed };
  }

  const fixed = mode === "fixed" ? countryFor(fixedCountry) : null;
  if (fixed) {
    const n = raw.replace(/[^\d]/g, "").length;
    return { ok: digitsMatch(n, fixed.digits), expected: fixed.digits, country: fixed };
  }

  const n = raw.replace(/[^\d]/g, "").length;
  return { ok: n >= 6 && n <= 15, expected: null, country: null };
}

/** Descripción humana de lo que hará la regla (para la ayuda del panel). */
export function describePhoneRule({ digits = null, digitsOnly = true }) {
  const parts = [];
  if (digitsOnly) parts.push("solo números");
  if (digits != null) parts.push(`${digitsLabel(digits)} dígitos`);
  return parts.join(" · ");
}

/**
 * Deduce el país a partir de un `pattern` guardado (formularios anteriores a la
 * clave `validation.phone`). Compara con el patrón canónico de cada país
 * (`buildPhonePattern` con el código opcional). Devuelve el país o `null`.
 *
 * Sirve para que un formulario viejo —que solo tiene `pattern`— siga validando
 * por país al responderlo, sin migrar los datos guardados.
 */
export function countryFromPattern(pattern) {
  if (!pattern) return null;
  return (
    PHONE_COUNTRIES.find(
      (c) => buildPhonePattern({ digits: c.digits, dial: c.dial, allowCountryCode: true }) === pattern,
    ) || null
  );
}
