/**
 * Opciones de un campo de elección: el modelo las devuelve en la forma que
 * quiere, no en la que queremos.
 *
 * El fallo que motivó esto, reproducido contra el proveedor real (qwen-coder-plus
 * vía DashScope) con el prompt de generateForm: ante una pregunta como
 * "Eje Temático de Interés" devolvió
 *
 *   { "type": "dropdown", "options": "Desarrollo Económico, Desarrollo Social, Género" }
 *
 * un único string separado por comas en vez del array que pedía el schema. El
 * normalizador anterior solo aceptaba Array.isArray, así que las opciones se
 * perdían en silencio: el select se guardaba con cero opciones y required:true,
 * y al abrir el formulario se desplegaba una lista vacía.
 *
 * Aquí se acepta cualquier forma razonable y se devuelve siempre string[].
 */

/** Claves con las que un objeto-opción puede traer su etiqueta. */
const LABEL_KEYS = ["label", "text", "name", "title", "value", "option"];

/** Claves con las que un modelo envuelve la lista entera de opciones. */
const LIST_KEYS = ["options", "values", "items", "choices", "opciones", "labels", "opts", "list"];

/** Techo de seguridad: un select con 500 opciones es un prompt roto, no un formulario. */
const MAX_OPTIONS = 60;

/** "undefined"/"null" son lo que sale de un String() sobre algo que no existe. */
const isBlank = (s) => !s || s === "undefined" || s === "null" || s === "NaN";

/** Una opción suelta → texto. String, número o objeto con clave de etiqueta. */
function labelOf(opt) {
  if (typeof opt === "string") return opt.trim();
  if (typeof opt === "number" || typeof opt === "boolean") return String(opt);
  if (opt && typeof opt === "object") {
    for (const key of LABEL_KEYS) {
      const v = opt[key];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (typeof v === "number") return String(v);
    }
  }
  return "";
}

/**
 * "A, B\nC" → ["A", "B", "C"].
 *
 * Se parte por saltos de línea primero, luego por ";" y "|" (a la vez, porque
 * un modelo puede mezclarlos), y por comas solo al final: una opción puede
 * llevar comas dentro ("Trabajo, empleo y pesquería") y una lista de verdad suele
 * venir separada por comas, así que ese separador es el último recurso.
 */
function splitString(text) {
  const trimmed = text.trim();
  const byLine = trimmed
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;
  const byOther = trimmed
    .split(/[;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byOther.length > 1) return byOther;
  const byComma = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return byComma.length > 1 ? byComma : [trimmed];
}

/**
 * Normaliza lo que sea que el modelo haya puesto en `options` a string[].
 * Nunca devuelve null, nunca undefined, y nunca la cadena "undefined".
 */
export function coerceOptionLabels(raw) {
  if (raw === null || raw === undefined) return [];

  /* Desenvuelve { values: [...] } / { items: [...] } / { opciones: "A, B" }. */
  let source = raw;
  if (!Array.isArray(source) && typeof source === "object") {
    const key = LIST_KEYS.find((k) => Array.isArray(source[k]) || typeof source[k] === "string");
    if (key) source = source[key];
  }

  const items = Array.isArray(source)
    ? source
    : typeof source === "string" || typeof source === "number" || typeof source === "boolean"
      ? splitString(String(source))
      : [];

  const out = [];
  const seen = new Set();
  for (const item of items.slice(0, MAX_OPTIONS)) {
    const label = labelOf(item);
    if (isBlank(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/**
 * Lee un bloque de listas en texto plano, indexadas por número de pregunta:
 *
 *   1 | Muy bueno | Bueno | Regular
 *   2 | Salud | Educación
 *
 * Existe porque contra este proveedor los arrays anidados dentro de un JSON no
 * son fiables: pedir `{"fields":[{"options":[...]}]}` devolvió siempre un escalar
 * ("Muy Bueno") con las tres redacciones probadas, mientras que el mismo
 * contenido en texto plano volvió las listas enteras. Ver ai.service.js.
 *
 * Solo se aceptan las líneas que traen barras: si el modelo se equivoca de
 * formato y numera los grupos desde 1 en cada bloque, acumular por índice
 * juntaría dos preguntas distintas en una sola lista de opciones. Sin barra no
 * hay lista que leer, y como una sola opción no sirve para nada (de ahí
 * MIN_CHOICE_OPTIONS), descartarla no se pierde nada.
 */
export function parseFlatOptionGroups(text) {
  const groups = new Map();
  if (typeof text !== "string") return {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = line.match(/^(\d{1,3})\s*[\s)\].:|\-–—]+\s*(.*)$/);
    if (!m) continue;

    const index = Number(m[1]);
    const rest = m[2].trim();
    /* La barra es la señal de "esto es una lista". Sin ella, un "1. Salud" de un
       bloque mal numerado se sumaría al 1 de la pregunta anterior. */
    if (!index || !rest.includes("|")) continue;

    const items = rest
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    groups.set(index, (groups.get(index) || []).concat(items));
  }

  const out = {};
  for (const [index, items] of groups) {
    const labels = coerceOptionLabels(items);
    if (labels.length > 0) out[index] = labels;
  }
  return out;
}