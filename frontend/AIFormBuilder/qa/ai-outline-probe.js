/* Ver el índice que se le pide al modelo, sin generar el formulario entero.
 *
 *   node qa/ai-outline-probe.js
 *
 * Esto es una llamada de texto, no de JSON: dura unos segundos y deja ver si el
 * índice sale completo o si el modelo se queda en cinco líneas. Si el índice va
 * corto, la llamada de JSON no tiene con qué trabajar, por mucho que el prompt
 * principal le diga que cubra todo.
 *
 * Importa `planOutline` del servicio en vez de copiar su prompt aquí. La primera
 * versión de esta sonda lo llevaba duplicado y por eso medía el prompt viejo: dos
 * copias del mismo texto se desincronizan solas, y entonces la sonda miente con
 * la mayor soltura del mundo.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BACKEND = path.resolve(import.meta.dirname, "..", "..", "..", "backend");
const PROMPT_ORIGINAL = path.join(
  process.env.TEMP || "C:/Users/migue/AppData/Local/Temp",
  "opencode",
  "prompt-original.txt",
);

/* `env.js` hace `dotenv.config()` sin ruta, o sea que busca el `.env` en el
   directorio desde donde se arrancó node — que aquí es el frontend, donde no
   está. Sin clave, el proveedor responde 404 de modelo, un error desconcertante
   que parece "no tienes acceso" cuando en realidad es "no te presentaste". */
const dotenv = (await import(
  pathToFileURL(path.join(BACKEND, "node_modules/dotenv/lib/main.js")).href
)).default;
dotenv.config({ path: path.join(BACKEND, ".env") });

const { planOutline, planStems, planPreliminares } = await import(
  pathToFileURL(path.join(BACKEND, "services/ai.service.js")).href
);

const prompt = fs.readFileSync(PROMPT_ORIGINAL, "utf8");

/* Las dos cabeceras van en paralelo, igual que en el servicio: no dependen del
   índice y encadenarlas sería esperar un viaje entero por nada. */
const [indice, preliminares] = await Promise.all([
  planOutline(prompt, "es"),
  planPreliminares(prompt, "es"),
]);
const enunciados = await planStems(indice, prompt, "es");

const porNivel = (num) => num.split(".").length;
const niveles = new Map();
for (const s of indice) niveles.set(porNivel(s.num), (niveles.get(porNivel(s.num)) || 0) + 1);

console.log(`\n── ${indice.length} lineas, ${indice.length ? "las que se inyectan en el prompt de JSON" : "SIN INDICE: se genera sin estructura obligatoria"} ──`);
for (const s of indice) console.log(`  ${"  ".repeat(porNivel(s.num) - 1)}${s.num} ${s.titulo}`);

console.log(`\npor nivel: ${[...niveles].map(([n, c]) => `${n} -> ${c}`).join(", ")}`);
console.log(
  `secciones de primer nivel: ${indice.filter((s) => porNivel(s.num) === 1).length}`,
);
console.log(
  `  a 3-5 preguntas por linea son ${indice.length * 3}-${indice.length * 5} preguntas, que es el techo que tiene el prompt`,
);

console.log("\n── los dos textos de cabecera ──");
if (!preliminares) {
  console.log("  NO SALIERON: el formulario abriría sin introducción ni instrucciones");
} else {
  for (const [k, v] of Object.entries(preliminares)) {
    console.log(`  ${k} (${v.length} car.):`);
    console.log(`    ${v}`);
  }
}

console.log(`\n── ${enunciados.length} enunciados para meter en el json ──`);
const porSeccion = new Map();
for (const e of enunciados) {
  /* Mismo criterio que assembleForm: coincidencia exacta y, si no la hay, el
     prefijo más largo del índice. */
  let seccion = indice.some((s) => s.num === e.seccion) ? e.seccion : null;
  if (!seccion) {
    const partes = e.seccion.split(".");
    for (let n = partes.length - 1; n > 0 && !seccion; n--) {
      const cand = partes.slice(0, n).join(".");
      if (indice.some((s) => s.num === cand)) seccion = cand;
    }
  }
  if (!seccion) { console.log(`  SIN SECCION  ${e.seccion} ${e.texto}`); continue; }
  porSeccion.set(seccion, (porSeccion.get(seccion) || 0) + 1);
}
for (const s of indice) {
  const n = porSeccion.get(s.num) || 0;
  const marca = n >= 3 ? "  " : "  <--";
  console.log(`${marca} ${String(n).padStart(2)} en ${s.num} ${s.titulo}`);
}
const huerfanos = enunciados.length - [...porSeccion.values()].reduce((a, b) => a + b, 0);
console.log(`\nenunciados sin sección reconocible: ${huerfanos}`);

/* Lo que decide si esto sirve: que no se quede corto, que no haya enunciados
   huérfanos y que el json no reciba una lista imposible. */
const fallos = [];
if (indice.length < 8) fallos.push(`indice corto: ${indice.length} secciones`);
if (enunciados.length < indice.length * 3) fallos.push(`enunciados cortos: ${enunciados.length} < ${indice.length * 3}`);
if (huerfanos > 0) fallos.push(`${huerfanos} enunciados sin sección`);
if (!preliminares) fallos.push("sin textos de cabecera");

/* Una sección sin enunciados es una promesa incumplida: sale con título y sin nada
   debajo. Salvo que tenga subsecciones, porque entonces es una cabecera de grupo
   y se sostiene sobre ellas. */
const vacias = indice.filter(
  (s) => !porSeccion.get(s.num) && !indice.some((o) => o.num.startsWith(`${s.num}.`)),
);
if (vacias.length) fallos.push(`${vacias.length} sección(es) sin enunciados: ${vacias.map((s) => s.num).join(", ")}`);

if (fallos.length) {
  console.log(`\nFALLO: ${fallos.join("; ")}`);
  process.exit(1);
}
console.log(`\nTODO CORRECTO: ${enunciados.length} preguntas de ${indice.length} secciones`);
