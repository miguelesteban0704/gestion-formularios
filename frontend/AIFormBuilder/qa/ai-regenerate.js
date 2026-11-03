/* Regenera un formulario existente con el generador arreglado, y compara.
 *
 *   node qa/ai-regenerate.js                     solo mide y guarda la copia
 *   node qa/ai-regenerate.js --aplicar            ademas lo guarda en la base
 *   node qa/ai-regenerate.js --aplicar-desde-json aplica lo ya generado antes
 *
 * Por qué en pasos separados: el formulario es del usuario y esta sonda lo pisa entero.
 * Lo primero es ver el antes y el después y que el antes quede a salvo en disco,
 * y solo después escribir. La copia va al directorio temporal de la sesion y no
 * al repo: es un documento de una cuenta real, no un fichero de pruebas.
 *
 * `--aplicar-desde-json` existe porque cada generación son casi tres minutos de
 * proveedor. Si el resultado ya está en disco, escribirlo no debería costar otro
 * viaje entero solo para volver a pedir lo mismo y decidir por segunda vez.
 *
 * La comparación es lo que hace falta para decidir: no si "ha salido algo", sino
 * si lo que se perdió por el camino era algo que el autor había escrito a mano.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API = "https://127.0.0.1:8000";
const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";
const FORM_ID = process.env.FORM_ID || "0e8a4126-1501-4c50-b0ec-e5c6c5a5b53e";

const envText = fs.readFileSync(
  path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"),
  "utf8",
);
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

const TMP = path.join(process.env.TEMP || "C:/Users/migue/AppData/Local/Temp", "opencode");
const promptPath = path.join(TMP, "prompt-original.txt");
const antesPath = path.join(TMP, `form-${FORM_ID}-antes.json`);
const despuesPath = path.join(TMP, `form-${FORM_ID}-despues.json`);

const api = (method, url, body) =>
  fetch(API + url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "Accept-Language": "es",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

const ESTATICOS = ["section", "heading", "paragraph", "image"];
const DE_LISTA = ["radio", "checkbox", "dropdown", "rank"];

function medir(f) {
  const qs = f.questions || [];
  const respondibles = qs.filter((q) => !ESTATICOS.includes(q.type));
  const tipos = {};
  for (const q of respondibles) tipos[q.type] = (tipos[q.type] || 0) + 1;
  const deLista = respondibles.filter((q) => DE_LISTA.includes(q.type));
  return {
    bloques: qs.length,
    secciones: qs.filter((q) => q.type === "section").length,
    parrafos: qs.filter((q) => q.type === "paragraph").length,
    preguntas: respondibles.length,
    deLista: deLista.length,
    deListaConOpciones: deLista.filter((q) => (q.options || []).length >= 2).length,
    escalas: respondibles.filter((q) => q.type === "rating").length,
    escalasConAnclas: respondibles.filter((q) => q.scale?.minLabel && q.scale?.maxLabel).length,
    required: respondibles.filter((q) => q.required).length,
    titulo: f.title || "",
    descripcion: (f.description || "").length,
    tipos,
  };
}

console.log(`Formulario ${FORM_ID}\n`);

const guardado = await (await api("GET", `/api/forms/${FORM_ID}`)).json();
const antes = guardado?.data?.form || guardado?.data;
if (!antes?.questions) {
  console.log("no se pudo leer el formulario:", JSON.stringify(guardado).slice(0, 400));
  process.exit(1);
}

fs.writeFileSync(antesPath, JSON.stringify(antes, null, 2), "utf8");
console.log(`Copia del antes: ${antesPath}\n`);

const m0 = medir(antes);
console.log("── como esta ahora ──");
console.log(JSON.stringify(m0, null, 2));

/* El título y la descripción son del autor: si ya estaban escritos, se quedan.
   El generador pone los suyos solo cuando no hay ninguno. Sin esta regla, una
   regeneración cambiaba "Encuesta sobre las Transformaciones Económicas en Cuba"
   por "Encuesta sobre Transformaciones Económicas y Sociales", que es el mismo
   tipo de pérdida que se vino a arreglar: algo escrito a mano que el pipeline se
   come sin avisar. El tema también se conserva, por la misma razón. */
const conservarLoDelAutor = (n) => {
  if (antes.title?.trim()) n.title = antes.title;
  if (antes.description?.trim()) n.description = antes.description;
  if (antes.theme) n.theme = antes.theme;
  return n;
};

let nuevo;
let t0 = Date.now();

if (process.argv.includes("--aplicar-desde-json")) {
  if (!fs.existsSync(despuesPath)) {
    console.log(`no hay nada guardado en ${despuesPath}. Genera antes sin --aplicar.`);
    process.exit(1);
  }
  nuevo = JSON.parse(fs.readFileSync(despuesPath, "utf8"));
  console.log(`\nUsando lo ya generado en ${despuesPath}. No se vuelve a llamar al proveedor.`);
} else {
  const prompt = fs.readFileSync(promptPath, "utf8");
  console.log(`\nGenerando con el mismo prompt (${prompt.length} caracteres). Esto tarda unos minutos...`);
  const resp = await api("POST", "/api/ai/generate-form", { prompt });
  const cuerpo = await resp.json();
  const generado = cuerpo?.data?.form;
  if (!generado?.questions) {
    console.log(`el backend respondio ${resp.status}:`, JSON.stringify(cuerpo).slice(0, 500));
    process.exit(1);
  }
  nuevo = generado;
  fs.writeFileSync(despuesPath, JSON.stringify(nuevo, null, 2), "utf8");
}

nuevo = conservarLoDelAutor(nuevo);
console.log(
  `\nSe conservan del formulario actual: título, descripción${antes.theme ? ` y tema (${antes.theme})` : ""}.`,
);

const m1 = medir(nuevo);
console.log(`\n── en ${((Date.now() - t0) / 1000).toFixed(1)}s ──`);
console.log(`\n── como sale ──`);
console.log(JSON.stringify(m1, null, 2));

console.log(`\n── antes / despues ──`);
const claves = [
  ["bloques", "bloques"],
  ["secciones", "secciones"],
  ["parrafos", "parrafos"],
  ["preguntas", "preguntas"],
  ["de lista", "deLista"],
  ["de lista con opciones", "deListaConOpciones"],
  ["escalas", "escalas"],
  ["escalas con anclas", "escalasConAnclas"],
  ["obligatorias", "required"],
];
for (const [nombre, k] of claves) {
  const a = m0[k];
  const b = m1[k];
  const flecha = b > a ? "+" : b < a ? "-" : " ";
  console.log(`  ${flecha} ${nombre.padEnd(24)} ${String(a).padStart(4)} -> ${String(b).padStart(4)}`);
}
console.log(`\n  titulo antes: ${JSON.stringify(m0.titulo)}`);
console.log(`  titulo ahora: ${JSON.stringify(m1.titulo)}`);
console.log(`\n  avisos de la auditoria: ${(nuevo.aiNotes?.avisos || []).map((a) => a.code).join(", ") || "ninguno"}`);

/* Lo que hay que mirar no es solo si han salido mas preguntas, sino si el
   formulario nuevo ha perdido algo que el autor habia escrito. Los ids de las
   preguntas son nuevos por construccion (los genera normalizeQuestion), asi que
   la comparacion va por texto de enunciado. */
const textos = (f) =>
  new Set((f.questions || []).map((q) => (q.label || q.content || "").trim()).filter(Boolean));
const antesTxt = textos(antes);
const despuesTxt = textos(nuevo);
const perdidas = [...antesTxt].filter((t) => !despuesTxt.has(t));
console.log(`\n  enunciados del antes que no salen: ${perdidas.length} de ${antesTxt.size}`);
for (const t of perdidas.slice(0, 10)) console.log(`    - ${t.slice(0, 100)}`);

/* Las preguntas perdidas por cambio de redacción son las más de la mitad: el
   generador vuelve a escribir el enunciado. Lo que no se perdona es un CAMPO que
   el autor tenía y el nuevo no tiene, porque eso no es reformular: es quitar una
   pregunta que alguien puede estar contestando ya. */
const tiposAntes = new Set((antes.questions || []).map((q) => q.type));
const tiposDespues = new Set((nuevo.questions || []).map((q) => q.type));
const tiposPerdidos = [...tiposAntes].filter((t) => !tiposDespues.has(t));
console.log(`  tipos que tenia y no tiene: ${tiposPerdidos.join(", ") || "ninguno"}`);
if (tiposPerdidos.includes("municipality")) {
  console.log(`    · el prompt solo pide la provincia, no el municipio: no lo ha pedido nadie.`);
  console.log(`      Se recupera en un clic desde la paleta del builder si lo quiere.`);
}

if (!process.argv.includes("--aplicar") && !process.argv.includes("--aplicar-desde-json")) {
  console.log(`\nSin escribir nada. Con --aplicar se guarda en el formulario ${FORM_ID}.`);
  console.log(`La copia del antes sigue en ${antesPath}.`);
  process.exit(0);
}

console.log(`\nEscribiendo en el formulario ${FORM_ID}...`);
const guardado2 = await api("PUT", `/api/forms/${FORM_ID}`, {
  title: nuevo.title,
  description: nuevo.description,
  theme: nuevo.theme,
  questions: nuevo.questions.map((q, i) => ({ ...q, order: i })),
});
console.log(`  HTTP ${guardado2.status}`);
const conf = await guardado2.json();
console.log(`  ${JSON.stringify(conf).slice(0, 200)}`);