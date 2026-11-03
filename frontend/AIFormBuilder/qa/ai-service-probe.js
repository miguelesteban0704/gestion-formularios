/* Llama a generateForm tal cual, sin pasar por HTTP, para ver los console.warn del
 * servicio.
 *
 *   node qa/ai-service-probe.js
 *
 * Existe porque el backend corre en una consola que esta sesion no ve: si una
 * generacion sale vacia, el 500 del endpoint no dice por que. Importando el
 * servicio, sus avisos salen aqui. La sonda de HTTP (`ai-generate-probe.js`) sigue
 * siendo la que decide si el pipeline entero funciona, porque esa es la ruta que
 * usa la aplicacion; esta es solo para leer el interior cuando algo sale mal.
 *
 * No escribe nada ni llama a la base de datos: `generateForm` solo habla con el
 * proveedor y devuelve un objeto.
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

const dotenv = (await import(
  pathToFileURL(path.join(BACKEND, "node_modules/dotenv/lib/main.js")).href
)).default;
dotenv.config({ path: path.join(BACKEND, ".env") });

const { generateForm } = await import(
  pathToFileURL(path.join(BACKEND, "services/ai.service.js")).href
);

const prompt = fs.readFileSync(PROMPT_ORIGINAL, "utf8");
console.log(`Prompt de ${prompt.length} caracteres. Generando...`);

const t0 = Date.now();
const form = await generateForm(prompt, "es");

const ESTATICOS = ["section", "heading", "paragraph", "image"];
const respondibles = form.questions.filter((q) => !ESTATICOS.includes(q.type));
const histograma = {};
for (const q of respondibles) histograma[q.type] = (histograma[q.type] || 0) + 1;

console.log(`\n── en ${((Date.now() - t0) / 1000).toFixed(1)}s ──`);
console.log(`  título:      ${form.title}`);
console.log(`  bloques:     ${form.questions.length}`);
console.log(`  secciones:   ${form.questions.filter((q) => q.type === "section").length}`);
console.log(`  párrafos:    ${form.questions.filter((q) => q.type === "paragraph").length}`);
console.log(`  preguntas:   ${respondibles.length}`);
console.log(`  tipos:       ${JSON.stringify(histograma)}`);
console.log(`  avisos:      ${(form.aiNotes?.avisos || []).map((a) => a.code).join(", ") || "ninguno"}`);

fs.writeFileSync(
  path.join(import.meta.dirname, ".generado-servicio.json"),
  JSON.stringify(form, null, 2),
);
console.log("\n  json en qa/.generado-servicio.json");
process.exit(respondibles.length > 0 ? 0 : 1);
