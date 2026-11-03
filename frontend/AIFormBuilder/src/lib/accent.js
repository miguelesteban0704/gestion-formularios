/**
 * Acento dinámico — recolorea la marca en runtime redefiniendo las CSS vars
 * `--color-brand-*` (Tailwind v4 las lee como variables en vivo).
 */

export const ACCENT_KEY = "formly_accent";
export const DEFAULT_ACCENT = "#00D2FF";

/**
 * Acento impuesto al gestor de entidad y al gestor de formularios
 * (petición del usuario): sus páginas viven en este índigo y, como ya no
 * tienen la pestaña Apariencia, no pueden cambiarlo. El super_admin no se
 * toca: conserva su propio acento.
 */
export const MANAGED_ACCENT = "#473ce2";

/**
 * El ÚNICO formato de acento que existe en el sistema: `#RRGGBB` en minúsculas.
 * No es una preferencia del frontend: `settings.controller` rechaza con 400
 * cualquier otra cosa, así que `localStorage`, el `<input type="color">` y el
 * campo de texto tienen que pasar siempre por aquí antes de escribir.
 *
 * `#rgb` y `#rrggbbaa` no se aceptan a propósito. NORMALIZE los absorbe para
 * que el usuario pueda escribir `#0af` en el campo de texto sin que se le
 * descarte el valor, pero siempre devuelve la forma larga.
 */
export const ACCENT_HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Normaliza lo que el usuario escribe a `#rrggbb`, o `null` si no es un color.
 * Acepta `#rgb` (notación corta), con o sin `#`, y siempre devuelve minúsculas
 * para que comparar contra un preset no dé un falso negativo por mayúscula.
 */
export function normalizeAccentHex(input) {
  const raw = String(input ?? "").trim().replace(/^#/, "");
  if (/^[0-9A-Fa-f]{3}$/.test(raw)) {
    return `#${raw.toLowerCase().split("").map((c) => c + c).join("")}`;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

/** ¿Es este valor un acento guardable? Misma regla que el backend. */
export function isAccentHex(input) {
  return ACCENT_HEX.test(String(input ?? "").trim());
}

export const ACCENTS = [
  { name: "Electric Cyan", value: "#00D2FF" },
  { name: "Neon Violet", value: "#9D4EDD" },
  { name: "Fuchsia", value: "#FF007F" },
  { name: "Lime", value: "#39FF14" },
  { name: "Emerald", value: "#00E676" },
  { name: "Coral", value: "#FF6B00" },
  { name: "Slate", value: "#1E293B" },
  { name: "Electric Blue", value: "#2563EB" },
  { name: "Magenta", value: "#D946EF" },
];

/**
 * Color del check sobre un swatch: el que más contraste da (WCAG), no un
 * blanco fijo. Con un blanco fijo el check desaparece sobre el Lima o el
 * Cian; con esta regla cada preset y el color personalizado eligen solo.
 */
export function checkOnAccent(hex) {
  const lum = (h) => {
    const c = [0, 2, 4].map((i) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const clean = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "#ffffff";
  const l = lum(clean);
  const darkLum = lum("1e293b");
  const vsWhite = 1.05 / (l + 0.05);
  const vsDark = (l + 0.05) / (darkLum + 0.05);
  return vsDark > vsWhite ? "#1e293b" : "#ffffff";
}

const SHADE_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

/** Peso de mezcla de cada tono hacia blanco (claros) o negro (oscuros). */
const SCALE = {
  50: { with: "#ffffff", weight: 0.92 },
  100: { with: "#ffffff", weight: 0.8 },
  200: { with: "#ffffff", weight: 0.58 },
  300: { with: "#ffffff", weight: 0.38 },
  400: { with: "#ffffff", weight: 0.18 },
  500: { with: "#000000", weight: 0 },
  600: { with: "#000000", weight: 0.14 },
  700: { with: "#000000", weight: 0.28 },
  800: { with: "#000000", weight: 0.42 },
  900: { with: "#000000", weight: 0.56 },
  950: { with: "#000000", weight: 0.72 },
};

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

function toRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function fromRgb([r, g, b]) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function mixColor(hex, mixWith, weight) {
  const a = toRgb(hex);
  const b = toRgb(mixWith);
  return fromRgb(a.map((v, i) => clamp(v + (b[i] - v) * weight)));
}

/** Construye la escala 50–950 a partir del color base. */
export function buildAccentScale(hex) {
  const out = {};
  for (const [step, { with: mixWith, weight }] of Object.entries(SCALE)) {
    out[step] = weight === 0 ? hex : mixColor(hex, mixWith, weight);
  }
  return out;
}

export function getStoredAccent() {
  try {
    const saved = normalizeAccentHex(localStorage.getItem(ACCENT_KEY));
    if (saved) return saved;
  } catch {
    /* localStorage no disponible */
  }
  return null;
}

export function persistAccent(hex) {
  try {
    localStorage.setItem(ACCENT_KEY, hex);
  } catch {
    /* localStorage no disponible */
  }
}

/**
 * Aplica el acento en vivo (define las CSS vars de la marca).
 *
 * El `normalizeAccentHex` con reserva al color por defecto no es decorativo:
 * `buildAccentScale` multiplica por pesos, así que un hex roto no falla, se
 * cuela — devuelve `#NaNNaNNaN` y con eso `--color-brand-*` deja de ser un
 * color, la marca desaparece de toda la interfaz y no hay ningún error en
 * consola que lo explique. Aquí el peor caso es que se vea el cian.
 */
export function applyAccent(hex) {
  if (typeof window === "undefined") return;
  const scale = buildAccentScale(normalizeAccentHex(hex) || DEFAULT_ACCENT);
  const root = document.documentElement;
  for (const [step, color] of Object.entries(scale)) {
    root.style.setProperty(`--color-brand-${step}`, color);
  }
}

/** Devuelve la marca al valor por defecto del tema (quita las vars inline). */
export function resetAccent() {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  for (const step of SHADE_STEPS) {
    root.style.removeProperty(`--color-brand-${step}`);
  }
}