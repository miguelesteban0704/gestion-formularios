/* Escala de Likert, alias de clasificacion y `required` como cadena.
 *
 * Sin red ni navegador: esto es el contrato que el generador de IA y el builder
 * comparten, y se puede agotar con el caso exacto que fallo — una escala
 * Likert escrita en prosa dentro de la `description`, que es como las devuelve
 * el modelo cuando no le da la gana emitir la escala con su `scale`.
 *
 *   node qa/ai-scale.js
 */

import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BACKEND = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..", "backend");

const { normalizeQuestion, normalizeScale } = await import(
  pathToFileURL(path.join(BACKEND, "utils/formNormalize.js")).href
);

let fallos = 0;
const eq = (real, esperado, nombre) => {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) console.log(`  OK    ${nombre}`);
  else {
    console.log(`  FALLO ${nombre}`);
    console.log(`          esperado ${b}`);
    console.log(`          real     ${a}`);
    fallos++;
  }
};

console.log("\n── escala explícita ──");
eq(normalizeScale({ min: 1, max: 7, minLabel: "Nada", maxLabel: "Muchisimo" }),
   { min: 1, max: 7, minLabel: "Nada", maxLabel: "Muchisimo" }, "escala explicita de 7 puntos");
eq(normalizeScale(undefined),
   { min: 1, max: 5, minLabel: "", maxLabel: "" }, "sin escala: 1 a 5 por defecto");
eq(normalizeScale({ min: 3, max: 3 }),
   { min: 1, max: 5, minLabel: "", maxLabel: "" }, "escala de un solo paso cae al defecto");
eq(normalizeScale({ min: 7, max: 1 }),
   { min: 1, max: 5, minLabel: "", maxLabel: "" }, "escala invertida cae al defecto");
eq(normalizeScale({ min: 1, max: 40 }),
   { min: 1, max: 11, minLabel: "", maxLabel: "" }, "una escala de 40 puntos se recorta a 10 pasos");

console.log("\n── anclajes deducidos de la descripcion ──");
const enProsa = (d) => normalizeScale(undefined, d);
eq(enProsa("1 = Muy en desacuerdo, 5 = Muy de acuerdo"),
   { min: 1, max: 5, minLabel: "Muy en desacuerdo", maxLabel: "Muy de acuerdo" }, "anclajes con coma");
eq(enProsa("1 = Muy en desacuerdo a 7 = Muy de acuerdo"),
   { min: 1, max: 7, minLabel: "Muy en desacuerdo", maxLabel: "Muy de acuerdo" }, "anclajes con 'a'");
eq(enProsa("1 = Muy poco informado, 5 = Muy bien informado"),
   { min: 1, max: 5, minLabel: "Muy poco informado", maxLabel: "Muy bien informado" },
   "anclajes del formulario que fallo de verdad");
eq(enProsa("1=Regular, 4=Excelente"),
   { min: 1, max: 4, minLabel: "Regular", maxLabel: "Excelente" }, "anclajes sin espacios");
eq(enProsa("Escala del 1 al 5"), { min: 1, max: 5, minLabel: "", maxLabel: "" },
   "frase suelta: no inventa una escala");
eq(enProsa("Ver documentacion 2024 = 5"), { min: 1, max: 5, minLabel: "", maxLabel: "" },
   "no confunde un anio con una escala");

console.log("\n── la Likert escrita como opcion unica ──");
const likert = normalizeQuestion(
  {
    type: "radio",
    label: "¿Cree que las empresas estatales seran mas eficientes?",
    description: "1 = Muy en desacuerdo, 5 = Muy de acuerdo",
    options: [],
  },
  0,
  "es",
);
eq(likert.type, "score_rating", "se convierte en numero con escala");
eq(likert.scale,
   { min: 1, max: 5, minLabel: "Muy en desacuerdo", maxLabel: "Muy de acuerdo" },
   "los anclajes pasan a la escala");
eq(likert.options, [], "y se queda sin opciones sueltas");

console.log("\n── required como cadena ──");
eq(normalizeQuestion({ type: "short_text", label: "A", required: "false" }, 0).required, false, '"false"');
eq(normalizeQuestion({ type: "short_text", label: "A", required: "true" }, 0).required, true, '"true"');
eq(normalizeQuestion({ type: "short_text", label: "A", required: "No" }, 0).required, false, '"No"');
eq(normalizeQuestion({ type: "short_text", label: "A", required: true }, 0).required, true, "booleano true");
eq(normalizeQuestion({ type: "short_text", label: "A" }, 0).required, false, "ausente");

console.log("\n── alias de clasificacion ──");
for (const t of ["rank", "ranking", "order", "ordering", "clasificacion", "prioridad"])
  eq(normalizeQuestion({ type: t, label: "A" }, 0).type, "rank", `"${t}" -> rank`);
eq(normalizeQuestion({ type: "rank", label: "Ordena", options: ["A", "B", "C"] }, 0).options.map((o) => o.label),
   ["A", "B", "C"], "rank conserva sus opciones");
eq(normalizeQuestion({ type: "likert", label: "A" }, 0).type, "score_rating", '"likert" -> numero');

console.log("\n── la escala solo viaja donde tiene sentido ──");
eq(normalizeQuestion({ type: "short_text", label: "A", scale: { min: 1, max: 9 } }, 0).scale, null,
   "un short_text no lleva escala");
eq(normalizeQuestion({ type: "rating", label: "A" }, 0).scale,
   { min: 1, max: 5, minLabel: "", maxLabel: "" }, "un rating si la lleva, con defecto");

console.log(fallos === 0 ? "\nTODO CORRECTO" : `\n${fallos} FALLO(S)`);
process.exit(fallos === 0 ? 0 : 1);
