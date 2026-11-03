/*
 * Reglas de teléfono por país (backend).
 *
 * Espejo deliberado de `frontend/AIFormBuilder/src/lib/phoneRules.js`: la misma
 * tabla de países, la misma detección por `+código` y la misma comprobación de
 * dígitos, para que la validación del servidor coincida con la del navegador.
 * Cualquier cambio de longitudes debe hacerse en AMBOS archivos.
 */

export const PHONE_COUNTRIES = [
  { code: "CU", label: "Cuba", dial: "53", digits: 8 },
  { code: "US", label: "Estados Unidos / Canadá", dial: "1", digits: 10 },
  { code: "MX", label: "México", dial: "52", digits: 10 },
  { code: "ES", label: "España", dial: "34", digits: 9 },
  { code: "CO", label: "Colombia", dial: "57", digits: 10 },
  { code: "AR", label: "Argentina", dial: "54", digits: 10 },
  { code: "CL", label: "Chile", dial: "56", digits: 9 },
  { code: "PE", label: "Perú", dial: "51", digits: 9 },
  { code: "VE", label: "Venezuela", dial: "58", digits: 10 },
  { code: "DO", label: "República Dominicana", dial: "1", digits: 10 },
  { code: "BR", label: "Brasil", dial: "55", digits: [10, 11] },
  { code: "FR", label: "Francia", dial: "33", digits: 9 },
  { code: "DE", label: "Alemania", dial: "49", digits: [10, 11] },
  { code: "GB", label: "Reino Unido", dial: "44", digits: 10 },
  { code: "RU", label: "Rusia", dial: "7", digits: 10 },
  { code: "CN", label: "China", dial: "86", digits: 11 },
];

function digitsMatch(n, digits) {
  if (digits == null) return true;
  return Array.isArray(digits) ? digits.includes(n) : n === digits;
}

function buildPhonePattern({ digits = null, dial = null, allowCountryCode = false } = {}) {
  const quantified = Array.isArray(digits)
    ? `(?:${digits.map((d) => `\\d{${d}}`).join("|")})`
    : digits != null
      ? `\\d{${digits}}`
      : `\\d{6,15}`;
  const prefix = allowCountryCode && dial ? `(?:\\+?${dial}\\s?)?` : "";
  return `^\\s*${prefix}${quantified}\\s*$`;
}

/**
 * Deduce el país a partir de un `pattern` guardado (formularios anteriores a la
 * clave `validation.phone`). Espejo de `countryFromPattern` del frontend.
 */
export function countryFromPattern(pattern) {
  if (!pattern) return null;
  return (
    PHONE_COUNTRIES.find(
      (c) => buildPhonePattern({ digits: c.digits, dial: c.dial, allowCountryCode: true }) === pattern,
    ) || null
  );
}

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

export function validatePhone(value, { fixedCountry = null, mode = "any" } = {}) {
  const raw = String(value ?? "").trim();
  const dialed = detectCountry(raw);

  if (dialed) {
    const n = raw.replace(/[^\d]/g, "").slice(dialed.dial.length).length;
    return { ok: digitsMatch(n, dialed.digits), country: dialed };
  }

  const fixed = mode === "fixed" ? PHONE_COUNTRIES.find((c) => c.code === fixedCountry) : null;
  if (fixed) {
    const n = raw.replace(/[^\d]/g, "").length;
    return { ok: digitsMatch(n, fixed.digits), country: fixed };
  }

  const n = raw.replace(/[^\d]/g, "").length;
  return { ok: n >= 6 && n <= 15, country: null };
}
