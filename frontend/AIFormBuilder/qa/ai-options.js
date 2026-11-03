/**
 * Check de QA: las opciones de un campo de elección nunca pueden perderse.
 *
 * Uso:  node qa/ai-options.js      (sale distinto de 0 si algún caso falla)
 *
 * El caso que da nombre a todo esto está en CASOS[1] y es literal: es la
 * respuesta cruda del proveedor (qwen-coder-plus, DashScope) al prompt de
 * generateForm con la pregunta "Eje Temático de Interés". Devolvió las
 * opciones como un string CSV en vez del array pedido, el normalizador solo
 * aceptaba Array.isArray, y el select se guardó vacío sin decir nada.
 *
 * Los dos módulos bajo prueba viven en el backend y no dependen de la red, así
 * que esto corre sin proveedor, sin API y sin base de datos.
 */

import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BACKEND = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..", "backend");

const { coerceOptionLabels, parseFlatOptionGroups } = await import(
  pathToFileURL(path.join(BACKEND, "utils/optionLabels.js")).href
);
const { normalizeQuestion, normalizeForm, choiceFieldsNeedingOptions } = await import(
  pathToFileURL(path.join(BACKEND, "utils/formNormalize.js")).href
);

const CASOS = [
  {
    nombre: "array de strings (lo que se pide)",
    entra: ["Desarrollo Económico", "Desarrollo Social"],
    sale: ["Desarrollo Económico", "Desarrollo Social"],
  },
  {
    nombre: "string CSV — el fallo real del proveedor",
    entra: "Desarrollo Económico, Desarrollo Social, Género",
    sale: ["Desarrollo Económico", "Desarrollo Social", "Género"],
  },
  {
    nombre: "string con saltos de línea",
    entra: "Uno\nDos\nTres",
    sale: ["Uno", "Dos", "Tres"],
  },
  {
    nombre: "string con punto y coma y barras verticales",
    entra: "Uno; Dos | Tres",
    sale: ["Uno", "Dos", "Tres"],
  },
  {
    nombre: "string con una sola opción (no se parte)",
    entra: "Solo una",
    sale: ["Solo una"],
  },
  {
    nombre: "números sueltos",
    entra: [1, 2, 3],
    sale: ["1", "2", "3"],
  },
  {
    nombre: "objetos con clave label",
    entra: [{ label: "A" }, { label: "B" }],
    sale: ["A", "B"],
  },
  {
    nombre: "objetos con clave text / name / title / value",
    entra: [{ text: "A" }, { name: "B" }, { title: "C" }, { value: "D" }],
    sale: ["A", "B", "C", "D"],
  },
  {
    nombre: "lista envuelta en { values: [...] }",
    entra: { values: ["A", "B"] },
    sale: ["A", "B"],
  },
  {
    nombre: "lista envuelta en { items: [...] }",
    entra: { items: ["A", "B"] },
    sale: ["A", "B"],
  },
  {
    nombre: "lista envuelta en { opciones: [...] } (el modelo responde en español)",
    entra: { opciones: ["A", "B"] },
    sale: ["A", "B"],
  },
  {
    nombre: "nada en absoluto",
    entra: undefined,
    sale: [],
  },
  {
    nombre: "null",
    entra: null,
    sale: [],
  },
  {
    nombre: "array vacío",
    entra: [],
    sale: [],
  },
  {
    nombre: "objeto sin ninguna clave de lista",
    entra: { foo: "bar" },
    sale: [],
  },
  {
    nombre: "la cadena 'undefined' (lo que salía de un String() mal hecho)",
    entra: ["Sí", undefined, null],
    sale: ["Sí"],
  },
  {
    nombre: "espacios en blanco y duplicados con distinta caja",
    entra: ["  Sí  ", "sí", "NO"],
    sale: ["Sí", "NO"],
  },
  {
    nombre: "objetos de opción sin etiqueta (nunca deben salir como 'undefined')",
    entra: [{ color: "rojo" }, { label: "Sí" }],
    sale: ["Sí"],
  },
];

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let fallos = 0;

console.log("── coerceOptionLabels ──");
for (const c of CASOS) {
  const sale = coerceOptionLabels(c.entra);
  const ok = igual(sale, c.sale);
  if (!ok) fallos += 1;
  const shown = c.entra === undefined ? "undefined" : JSON.stringify(c.entra);
  console.log(`  ${ok ? "OK   " : "FALLA"} ${c.nombre}\n         ${shown}\n      ->  ${JSON.stringify(sale)}`);
}

/* ── normalizeQuestion: el contrato entero, no solo la lista ── */
console.log("\n── normalizeQuestion ──");

const q = normalizeQuestion(
  { type: "dropdown", label: "Eje Temático de Interés", required: true, options: "A, B, C" },
  0,
  "es",
);
const contractChecks = [
  ["guarda las opciones rescatadas del string", q.options.length === 3],
  ["cada opción trae id y value", q.options.every((o) => typeof o.id === "string" && o.value === "")],
  ["mantiene el tipo dropdown", q.type === "dropdown"],
  ["mantiene required", q.required === true],
];
for (const [nombre, ok] of contractChecks) {
  if (!ok) fallos += 1;
  console.log(`  ${ok ? "OK   " : "FALLA"} ${nombre}`);
}

/* Un tipo sin opciones no debe arrastrarlas: se guardan vacías y punto. */
const sinOpciones = normalizeQuestion({ type: "short_text", label: "Comentario", options: "A, B" }, 1, "es");
if (sinOpciones.options.length !== 0) {
  fallos += 1;
  console.log("  FALLA un short_text no debe guardar opciones");
} else {
  console.log("  OK   un short_text no guarda opciones aunque el modelo las mande");
}

/* Sinónimos: el modelo los usa cuando ignora la lista de tipos. */
console.log("\n── sinónimos de tipo ──");
for (const [entra, esperado] of [
  ["select", "dropdown"],
  ["multiple_choice", "radio"],
  ["Select", "dropdown"],
  ["text", "short_text"],
  ["textarea", "long_text"],
  ["date-picker", "date"],
  ["inventado", "short_text"],
]) {
  const r = normalizeQuestion({ type: entra, label: "x" }, 0, "es").type;
  const ok = r === esperado;
  if (!ok) fallos += 1;
  console.log(`  ${ok ? "OK   " : "FALLA"} "${entra}" -> ${r}`);
}

/* Cosas raras que el modelo puede devolver y antes rompían o se perdían. */
console.log("\n── basura que no debe romper nada ──");
for (const [nombre, entra] of [
  ["null", null],
  ["string suelto", "pregunta sin objeto"],
  ["array", []],
]) {
  let ok = true;
  try {
    normalizeQuestion(entra, 3, "es");
  } catch {
    ok = false;
  }
  if (!ok) fallos += 1;
  console.log(`  ${ok ? "OK   " : "FALLA"} pregunta ${nombre}`);
}

const vacio = normalizeForm({});
if (!Array.isArray(vacio.questions)) {
  fallos += 1;
  console.log("  FALLA normalizeForm sin questions");
} else {
  console.log("  OK   normalizeForm sin questions devuelve una lista vacía");
}

/* Un desplegable con una sola opción tampoco se puede responder. Contra el
   proveedor real llegó "options": "Muy Bueno" para una pregunta de valoración:
   bien parseado, y tan inútil como vacío. */
console.log("\n── campos de lista inservibles (menos de 2 opciones) ──");
const conHueco = normalizeForm({
  questions: [
    { type: "dropdown", label: "Eje Temático de Interés", options: "A, B" },
    { type: "radio", label: "Frecuencia de uso" },
    { type: "radio", label: "Valoración", options: "Muy Bueno" },
    { type: "checkbox", label: "Canales", options: ["Web", "App"] },
    { type: "long_text", label: "Comentarios" },
  ],
});
const huecos = choiceFieldsNeedingOptions(conHueco.questions);
const nombres = huecos.map((q) => q.label).join(" / ");
const huecoOk = huecos.length === 2 && nombres.includes("Frecuencia de uso") && nombres.includes("Valoración");
if (!huecoOk) {
  fallos += 1;
  console.log(`  FALLA se esperaban 2 huecos (Frecuencia de uso y Valoración), salieron ${huecos.length}: ${nombres}`);
} else {
  console.log("  OK   marca los 2 inservibles (0 opciones y 1 opción) y deja los 2 que sí valen");
}
console.log(`        detectados: ${nombres}`);

/* ── El parser del formato plano: la parte que sí se puede prometer ── */
console.log("\n── parseFlatOptionGroups (formato plano que sí devuelve listas) ──");
const PLANOS = [
  {
    nombre: "una línea por pregunta con barras",
    entra: "1 | Muy bueno | Bueno | Regular\n2 | Salud | Educación | Cultura",
    sale: { 1: ["Muy bueno", "Bueno", "Regular"], 2: ["Salud", "Educación", "Cultura"] },
  },
  {
    nombre: "numeración reiniciada por bloque sin barras: se rechaza en vez de mezclar",
    entra: "1. Muy bueno\n2. Bueno\n3. Regular\n\n1. Salud\n2. Educación",
    sale: {},
  },
  {
    nombre: "paréntesis en vez de barra",
    entra: "1) Salud | Educación\n2) Sí | No",
    sale: { 1: ["Salud", "Educación"], 2: ["Sí", "No"] },
  },
  {
    nombre: "espacios sobrantes y duplicados",
    entra: "  1 |  Salud  |  Salud | Educación  ",
    sale: { 1: ["Salud", "Educación"] },
  },
  {
    nombre: "líneas de relleno sin numerar (se ignoran)",
    entra: "Aquí van las opciones:\n1 | Sí | No\nEspero que sirva",
    sale: { 1: ["Sí", "No"] },
  },
  {
    nombre: "texto que no es lista",
    entra: "No hay nada aqui",
    sale: {},
  },
  {
    nombre: "no es texto",
    entra: undefined,
    sale: {},
  },
];
for (const c of PLANOS) {
  const sale = parseFlatOptionGroups(c.entra);
  const ok = igual(sale, c.sale);
  if (!ok) fallos += 1;
  console.log(`  ${ok ? "OK   " : "FALLA"} ${c.nombre}\n      ->  ${JSON.stringify(sale)}`);
}

console.log(
  `\n${fallos === 0 ? "TODO CORRECTO" : `${fallos} FALLO(S)`}` + ` · ${CASOS.length} casos de opciones`,
);
process.exit(fallos === 0 ? 0 : 1);