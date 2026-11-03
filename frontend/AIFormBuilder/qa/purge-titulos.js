/* Recuento (y borrado) de los formularios que dejaron las sondas.
 *
 * NO borra nada si se llama sin `--borrar`: el recuento va primero, para decidir
 * con los números delante. Con `--borrar` borra SOLO lo que cumple las tres
 * condiciones de golpe, que es lo que se pidió:
 *
 *   1. el título es exactamente "Formulario sin título". Sin aplicar un
 *      `trim` que ensanche el criterio: los títulos con espacios de más se
 *      quedan, porque en cuanto se ensancha este criterio deja de decir lo que
 *      dice y empieza a decir "parecido a";
 *   2. no tiene ni una respuesta (un formulario con datos de alguien no se
 *      borra aunque se llame así);
 *   3. su id no aparece en la lista de "protegidos" de abajo.
 *
 * El criterio 3 está porque hay un formulario con ese mismo título que sí se
 * está usando: el de las sondas de la IA, al que apuntan sus URL. Borrarlo
 * rompería `qa:ai` sin que nadie lo viera venir.
 *
 *   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node qa/purge-titulos.js
 *   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node qa/purge-titulos.js --borrar
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const API = "https://127.0.0.1:8000";
const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";
const TITULO = "Formulario sin título";

const envText = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"), "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

const api = async (method, url) => {
  const r = await fetch(API + url, { method, headers: { Authorization: `Bearer ${TOKEN}` } });
  let cuerpo = null;
  try { cuerpo = await r.json(); } catch { cuerpo = null; }
  return { status: r.status, cuerpo };
};

/* Ids que se dejan aunque cumplan 1 y 2. Van aquí a mano porque son pocos; si
  alguna vez hay que meter más, es señal de que el criterio 1 es demasiado
  anchO y hay que subirlo. */
const PROTEGIDOS = new Set([
  /* el que usan qa/ai-generate-probe.js, qa/ai-outline-probe.js y qa/ai-regenerate.js */
  "fa96f093-4b12-4a91-a358-e64a96426ea2",
]);

const BORRAR = process.argv.includes("--borrar");

/* Sin `?limit=`: `listFormsByOwner` no lo mira, devuelve todos los no archivados.
   Ponerlo daría la impresión de que la lista está recortada cuando no lo está,
   que es la forma de no fiarse después del recuento. Los archivados tampoco
   salen, y es lo correcto: un archivado se archivó a propósito. */
const { status, cuerpo } = await api("GET", "/api/forms");
if (status !== 200) {
  console.log(`no se pudo leer la lista de formularios (HTTP ${status}):`, JSON.stringify(cuerpo).slice(0, 300));
  process.exit(1);
}
const lista = cuerpo?.data?.forms || cuerpo?.data || [];
if (!Array.isArray(lista)) {
  console.log("la respuesta no trae una lista de formularios:", JSON.stringify(cuerpo).slice(0, 300));
  process.exit(1);
}

/* Los que quedan fuera, con el motivo. Se cuentan aunque no se borre nada: el
   recuento completo es lo que permite entender de dónde salen los 78. */
const candidatos = [];
const fuera = { otroTitulo: 0, conRespuestas: 0, protegido: 0 };
for (const f of lista) {
  const titulo = typeof f?.title === "string" ? f.title : "";
  if (titulo !== TITULO) { fuera.otroTitulo++; continue; }
  const respuestas = f.responseCount ?? f.responsesCount ?? f.respuestas ?? 0;
  if (Number(respuestas) > 0) { fuera.conRespuestas++; continue; }
  if (PROTEGIDOS.has(f._id)) { fuera.protegido++; continue; }
  candidatos.push(f);
}

const porDia = new Map();
for (const f of candidatos) {
  const dia = String(f.createdAt || f.created_at || "?").slice(0, 10);
  porDia.set(dia, (porDia.get(dia) || 0) + 1);
}

console.log(`\nFormularios de la cuenta: ${lista.length}`);
console.log(`  con otro título (no se tocan): ${fuera.otroTitulo}`);
console.log(`  "${TITULO}" pero con respuestas (no se tocan): ${fuera.conRespuestas}`);
console.log(`  "${TITULO}", sin respuestas, pero protegidos (no se tocan): ${fuera.protegido}`);
console.log(`\nCandidatos a borrar: ${candidatos.length}`);
console.log("  por día de creación:");
for (const [dia, n] of [...porDia.entries()].sort()) console.log(`    ${dia}  ${n}`);

if (!candidatos.length) {
  console.log("\nNo hay nada que borrar.");
  process.exit(0);
}

if (!BORRAR) {
  console.log("\nRecuento solamente. Para borrar, repetir con --borrar.");
  process.exit(0);
}

console.log(`\nBorrando ${candidatos.length}...`);
let ok = 0, mal = 0;
for (const f of candidatos) {
  const r = await api("DELETE", `/api/forms/${f._id}`);
  if (r.status >= 200 && r.status < 300) ok++;
  else { mal++; console.log(`  FALLO ${f._id} (HTTP ${r.status})`); }
}
console.log(`\nBorrados ${ok} · sin borrar ${mal}`);
process.exitCode = mal ? 1 : 0;
