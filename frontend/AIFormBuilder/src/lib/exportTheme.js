/**
 * Marca y contraste para los documentos exportados (Excel, Word, PDF).
 *
 * Los tres formatos piden el MISMO color en tres dialectos distintos: Excel
 * quiere ARGB sin almohadilla (`FF00D2FF`), `docx` quiere RGB sin almohadilla
 * (`00D2FF`) y jsPDF quiere una tripleta `[0, 210, 255]`. Este modulo resuelve
 * el color una sola vez y entrega las tres formas, de modo que la marca se
 * decide en un unico sitio y los tres documentos no pueden divergir entre si.
 *
 * De donde sale el color: de las variables `--color-brand-*` que la aplicacion
 * ya tiene resueltas en el documento. `lib/accent.js` las redefine en vivo al
 * cambiar el acento de la cuenta, asi que leerlas del DOM garantiza que el PDF
 * lleva exactamente el mismo cyan que el boton que el usuario tiene delante, en
 * lugar de recalcular una aproximacion que podria divergir.
 *
 * El contraste del texto NO se decide aqui con una regla nueva: se reutiliza
 * `checkOnAccent` de `lib/accent.js`, que ya es la regla del proyecto (y la que
 * miden las sondas de QA). Un acento claro como el Lima pide texto oscuro y uno
 * oscuro como el Slate pide blanco, sin que ningun llamante tenga que saberlo.
 */

import { checkOnAccent, DEFAULT_ACCENT } from "./accent.js";

/* Tinta neutra. El documento se imprime sobre papel blanco sea cual sea el
   tema de la aplicacion, asi que la paleta no sigue al modo oscuro: los
   acentos son los unicos que viajan desde la cuenta. */
export const PAPER = "#ffffff";
export const INK = "#0f172a";
export const INK_MUTED = "#64748b";
export const RULE = "#e2e8f0";

/* Tinta que se pone sobre un color claro. Es el mismo azul pizarra que usa
   `checkOnAccent` en la aplicacion, para que documento y pantalla compartan
   la misma tinta y no haya dos azules "de texto sobre claro" distintos. */
const INK_ON_LIGHT = "#1e293b";

/* AA para texto normal. Es el minimo que el usuario puede leer sin forzar la
   vista, y la cifra que decide cuando un tono de marca deja de servir como
   relleno de cabecera. */
const AA = 4.5;

const HEX3 = /^#?([0-9a-f]{3})$/i;
const HEX6 = /^#?([0-9a-f]{6})$/i;

/**
 * Normaliza a `#rrggbb` en minusculas. Admite `#abc`, `abc`, `#aabbcc` y
 * `AABBCC`. Devuelve el `fallback` ante cualquier otra cosa, para que un valor
 * sucio coming del perfil no rompa el generador.
 */
export function normalizeHex(value, fallback = null) {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  const short = HEX3.exec(raw);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const long = HEX6.exec(raw);
  return long ? `#${long[1].toLowerCase()}` : fallback;
}

/** `#rrggbb` -> `{ r, g, b }` en 0-255. */
export function hexToRgb(hex) {
  const h = normalizeHex(hex, DEFAULT_ACCENT).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** `#rrggbb` -> `rrggbb`. Es lo que quiere `docx`, que rechaza la almohadilla. */
export function bareHex(hex) {
  return normalizeHex(hex, DEFAULT_ACCENT).slice(1);
}

/** `#rrggbb` -> `FFrrggbb`. Excel paints en ARGB y necesita el alfa opaco. */
export function argbHex(hex) {
  return `FF${bareHex(hex).toUpperCase()}`;
}

/** `#rrggbb` -> `[r, g, b]`. Es lo que quiere jsPDF para rellenos y fuentes. */
export function rgbTriplet(hex) {
  const { r, g, b } = hexToRgb(hex);
  return [r, g, b];
}

/** Mezcla lineal de `from` hacia `to` con un peso 0..1. */
export function mix(from, to, weight) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const w = Math.min(1, Math.max(0, weight));
  const step = (x, y) => Math.round(x + (y - x) * w);
  const parts = [step(a.r, b.r), step(a.g, b.g), step(a.b, b.b)];
  return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Aclara hacia el blanco. Base de las bandas alternas de las tablas. */
export const tint = (hex, weight = 0.9) => mix(hex, "#ffffff", weight);

/** Oscurece hacia el negro. Base de los titulos de seccion. */
export const shade = (hex, weight = 0.3) => mix(hex, "#000000", weight);

/** Texto legible sobre `hex`. Delegado en la regla de contraste del proyecto. */
export const inkOn = (hex) => checkOnAccent(hex);

/* ─── Contraste medido ──────────────────────────────────────────────────────
 * `checkOnAccent` dice QUAL de los dos candidatos gana; no garantiza que el
 * ganador llegue a AA. Y no llega: con el acento por defecto del sitio,
 * `--color-brand-700` es `#0097b8` y con texto blanco sale 4.08:1, por debajo
 * del 4.5 que necesita un cuerpo de texto normal. Aqui se mide de verdad, con
 * la formula de la norma, que es lo que permite garantizarlo en vez de suponerlo. */
function relativeLuminance(hex) {
  const h = normalizeHex(hex, DEFAULT_ACCENT).slice(1);
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Razon de contraste WCAG entre dos colores opacos. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (la > lb ? (la + 0.05) / (lb + 0.05) : (lb + 0.05) / (la + 0.05));
}

/**
 * Elige el texto --claro u oscuro-- que MAS contraste da sobre `bg`.
 *
 * Es la misma decision que `checkOnAccent` pero comparada por la cifra real, y no
 * por una regla fija: para un tono medio como el oro puede ganar el oscuro,
 * mientras que para el cian por defecto gana el blanco. Es lo que hace que el
 * documento se lea con cualquiera de los nueve acentos, no solo con los
 * extremos.
 */
function bestInkOn(bg) {
  return contrastRatio(bg, PAPER) >= contrastRatio(bg, INK_ON_LIGHT) ? PAPER : INK_ON_LIGHT;
}

/** Lee una variable CSS ya resuelta por el navegador, o cadena vacia. */
function readVar(name) {
  if (typeof window === "undefined" || typeof document === "undefined") return "";
  let raw = "";
  try {
    raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  } catch {
    return "";
  }
  return normalizeHex(raw, "") || "";
}

/**
 * Elige el relleno de las cabeceras de tabla: el tono de marca MAS PROFUNDO que
 * todavia admita texto legible con AA.
 *
 * Recorre primero la escala propia del sistema de diseno --700, 800, 900--, que ya
 * son tonos del usuario y existen para justo esto, y despues mezclas hacia el
 * negro equivalentes. Solo si ninguno llega a AA se sigue oscureciendo en pasos
 * cortos.
 *
 * Que empiece por la escala y no por el acento puro importa: si arrancara en el
 * acento, un acento claro --el cian del sitio-- ya cumpliria AA con tinta oscura
 * y `strong` acabaria siendo IGUAL a `primary`, con la cabecera del mismo color
 * que la raya de acento y un documento plano. Empezando en 700 y bajando, la
 * cabecera sale siempre un tono mas profundo que la marca.
 *
 * Devuelve tambien la tinta elegida ya resuelta, para que ningun generador
 * pueda emparejarla mal por su cuenta.
 */
function readableFill(accent, candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const ink = bestInkOn(candidate);
    if (contrastRatio(candidate, ink) >= AA) return { fill: candidate, ink };
  }
  /* Ningun candidato llega a AA: se sigue oscureciendo desde el mas profundo
     que se probo. El bucle termina siempre porque en negro el blanco da 21:1. */
  let mixed = candidates.filter(Boolean).pop() || shade(accent, 0.34);
  for (let i = 0; i < 40; i += 1) {
    const ink = bestInkOn(mixed);
    if (contrastRatio(mixed, ink) >= AA) return { fill: mixed, ink };
    mixed = shade(mixed, 0.06);
  }
  return { fill: "#000000", ink: PAPER };
}

/**
 * Paleta de un documento. Se resuelve una vez por exportacion y se pasa ya
 * resuelta a los tres generadores, para que ninguno tenga que decidir un color
 * por su cuenta.
 *
 * `primary` es el acento puro y no se toca nunca: es lo que el usuario tiene
 * guardado, y en el documento solo aparece como filete y como raya de acento,
 * nunca como fondo de texto. `strong` es su version garantizada legible, y es
 * lo que pintan las cabeceras de tabla y los titulos de seccion.
 */
export function buildPalette(accent) {
  const primary = readVar("--color-brand-500") || normalizeHex(accent, DEFAULT_ACCENT);

  const { fill: strong, ink: onStrong } = readableFill(primary, [
    readVar("--color-brand-700"),
    readVar("--color-brand-800"),
    readVar("--color-brand-900"),
    shade(primary, 0.34),
    shade(primary, 0.5),
    shade(primary, 0.66),
  ]);

  const primaryDark = readVar("--color-brand-800") || shade(primary, 0.18);
  const primaryLight = readVar("--color-brand-100") || tint(primary, 0.8);
  const accentTone = readVar("--color-brand-300") || mix(primary, "#ffffff", 0.35);
  const textOnPrimary = bestInkOn(primary);

  return {
    primary,
    primaryDark,
    primaryLight,
    accent: accentTone,
    strong,
    onStrong,
    textOnPrimary,
    /* El acento puro no se usa como fondo de texto en ningun generador, pero se
       expone su tinta correcta para que tampoco pueda usarse mal por descuido. */
    onPrimary: textOnPrimary,
    soft: primaryLight,
    wash: readVar("--color-brand-50") || tint(primary, 0.93),
    ink: INK,
    muted: INK_MUTED,
    rule: RULE,
    paper: PAPER,
  };
}