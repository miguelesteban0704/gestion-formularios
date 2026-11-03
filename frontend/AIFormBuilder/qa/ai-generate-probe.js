/* El generador de verdad, con el prompt de verdad de las 176 TES.
 *
 * Esta es la comprobación que decide si el arreglo sirve: todo lo demás (la
 * auditoría, el normalizador, el renderer) se puede comprobar sin red, pero lo
 * que falló — que el generador devolviera un esqueleto — solo se mide llamando
 * al modelo con el prompt que escribió el usuario.
 *
 * El prompt de la sonda es el original, sin recortar. Se usa entero a propósito:
 * un prompt corto genera un formulario corto y daría un verde falso, que es
 * justo el error que se intenta arreglar.
 *
 * No guarda nada. `generateForm` normaliza y devuelve; el formulario lo crea
 * después el frontend en el builder. Así que esta sonda no deja formularios
 * tirados en la cuenta de QA.
 *
 *   npm run qa:generate
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API = "https://127.0.0.1:8000";
const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";
const PROMPT_ORIGINAL = path.join(
  process.env.TEMP || "C:/Users/migue/AppData/Local/Temp",
  "opencode",
  "prompt-original.txt",
);

const envText = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"), "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

if (!fs.existsSync(PROMPT_ORIGINAL)) {
  console.log(`No esta el prompt original en ${PROMPT_ORIGINAL}`);
  process.exit(1);
}
const prompt = fs.readFileSync(PROMPT_ORIGINAL, "utf8");

/* Que se vea en el log de este archivo: el prompt es largo, pero es la mitad de
   lo que hay que ver cuando algo va mal. */
console.log(`Prompt de ${prompt.length} caracteres, ${prompt.split(/\r?\n/).filter((l) => l.trim()).length} lineas con texto.`);
console.log("Llamando al proveedor real. Esto puede tardar un par de minutos...\n");

const t0 = Date.now();
const res = await fetch(`${API}/api/ai/generate-form`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "Accept-Language": "es",
  },
  body: JSON.stringify({ prompt }),
});
const segundos = ((Date.now() - t0) / 1000).toFixed(1);

const cuerpo = await res.json();
if (!res.ok) {
  console.log(`FALLO  el backend respondio ${res.status} en ${segundos}s`);
  console.log(JSON.stringify(cuerpo).slice(0, 800));
  process.exit(1);
}

const form = cuerpo?.data?.form;
if (!form) {
  console.log("FALLO  la respuesta no trae data.form");
  console.log(JSON.stringify(cuerpo).slice(0, 800));
  process.exit(1);
}

const SALIDA = path.join(import.meta.dirname, ".generado.json");
fs.writeFileSync(SALIDA, JSON.stringify(form, null, 2));

const preguntas = form.questions || [];
const secciones = preguntas.filter((q) => q.type === "section");
const ESTATICOS = ["section", "heading", "paragraph", "image"];
const respondibles = preguntas.filter((q) => !ESTATICOS.includes(q.type));
const deLista = respondibles.filter((q) => ["radio", "checkbox", "dropdown", "rank"].includes(q.type));
const conOpciones = deLista.filter((q) => (q.options || []).length >= 2);
const likerts = respondibles.filter((q) => q.type === "rating");
const likertsConAnclas = likerts.filter(
  (q) => q.scale?.minLabel || q.scale?.maxLabel,
);
const likertEnProse = respondibles.filter(
  (q) => q.type === "rating" && !q.scale?.minLabel && /\d\s*=\s*[^,]{3,}/.test(q.description || ""),
);
const rankings = respondibles.filter((q) => q.type === "rank");
const textos = ["short_text", "long_text", "email", "phone", "number", "url", "address", "password"];

const histograma = {};
for (const q of respondibles) histograma[q.type] = (histograma[q.type] || 0) + 1;

console.log(`Respuesta en ${segundos}s.`);
console.log(`\n── que ha salido ──`);
console.log(`  bloques:     ${preguntas.length}`);
console.log(`  secciones:   ${secciones.length}`);
console.log(`  preguntas:   ${respondibles.length}`);
console.log(`  tipos:       ${JSON.stringify(histograma)}`);
console.log(`  de lista:    ${deLista.length} (con opciones: ${conOpciones.length})`);
console.log(`  likert:      ${likerts.length} (con anclas en la escala: ${likertsConAnclas.length}, anclas en la descripción: ${likertEnProse.length})`);
console.log(`  ranking:     ${rankings.length}`);
console.log(`  texto libre: ${respondibles.filter((q) => textos.includes(q.type)).length}`);
console.log(`\n  título: "${form.title}"`);
console.log(`  tema:   ${form.theme}`);
console.log(`  json guardado en ${SALIDA}`);

console.log(`\n── secciones y cuantas preguntas hay debajo ──`);
let n = 0;
for (const q of preguntas) {
  if (q.type === "section") {
    if (n > 0) console.log(`      -> ${n} pregunta(s)`);
    console.log(`  ${(q.label || "(sin titulo)").slice(0, 72)}`);
    n = 0;
  } else if (!ESTATICOS.includes(q.type)) n++;
}
if (n > 0) console.log(`      -> ${n} pregunta(s)`);

console.log(`\n── la auditoria que vera el usuario ──`);
const notas = form.aiNotes;
if (!notas) {
  console.log("  FALLO  el backend no adjunto aiNotes: el modal no tendra nada que contar");
} else {
  console.log(`  ${notas.preguntas} preguntas, ${notas.secciones} secciones`);
  if (!notas.avisos?.length) console.log("  sin avisos");
  for (const a of notas.avisos || []) {
    console.log(`  [${a.code}] ${a.total}${a.de ? ` de ${a.de}` : ""} — ${a.campos.slice(0, 3).join(" | ")}`);
  }
}

console.log(`\n── lecturas que importan ──`);

/* El prompt pide 23 ejes con 2-3 preguntas cada uno. No hay forma honesta de
   compararlo con una cuenta, pero un numero asi de bajo en un prompt que
   enumera 23 temas es la senal de que el tope sigue mandando. */
let fallos = 0;
const avisar = (m) => { console.log(`  FALLO   ${m}`); fallos++; };
const bien = (m) => console.log(`  OK      ${m}`);

if (respondibles.length >= 40) bien(`${respondibles.length} preguntas: da la cobertura que pedia el prompt`);
else avisar(`solo ${respondibles.length} preguntas para un prompt de 23 ejes x 2-3 preguntas: el esqueleto sigue ahi`);

if (secciones.length >= 8) bien(`${secciones.length} secciones, no 5`);
else avisar(`${secciones.length} secciones: el prompt nombra cinco y pide subsecciones`);

if (deLista.length === 0 || conOpciones.length === deLista.length) bien(`${conOpciones.length}/${deLista.length} preguntas de lista con opciones`);
else avisar(`${deLista.length - conOpciones.length} de ${deLista.length} preguntas de lista salieron sin opciones`);

if (likerts.length === 0) avisar("no salio ninguna escala Likert, y el prompt es de medir opiniones");
else if (likertsConAnclas.length === 0 && likertEnProse.length === 0) avisar(`${likerts.length} escalas Likert, ninguna con anclas en la escala ni en la descripción: son cinco estrellas y ya`);
else bien(`${likerts.length} escalas, ${likertsConAnclas.length} con anclas ya en la escala y ${likertEnProse.length} con los anclas recuperables de la descripción`);

/* Los párrafos van en `questions` pero no son respondibles, así que se buscan
   fuera de `respondibles`: el `else` daba un falso aviso tres veces seguidas
   porque el filtro los dejaba fuera antes de mirarlos. */
const paragrafos = preguntas.filter((q) => q.type === "paragraph" && (q.content || "").trim());
if (paragrafos.length >= 2) bien(`${paragrafos.length} párrafos de cabecera: introducción e instrucciones`);
else if (paragrafos.length === 1) avisar("un solo párrafo de cabecera: falta la introducción o las instrucciones");
else avisar("no hay ningún bloque paragraph: ni introducción ni instrucciones");

if (rankings.length === 0) console.log("  (ningún ranking: el prompt no los pedía, no es un fallo)");
else bien(`${rankings.length} preguntas de clasificación`);

console.log(`\n${fallos === 0 ? "TODO CORRECTO" : `${fallos} FALLO(S)`}`);
process.exit(fallos === 0 ? 0 : 1);
