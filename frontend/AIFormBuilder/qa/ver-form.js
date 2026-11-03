/* Lee un formulario de la cuenta QA y lo resume. Para comprobar lo que ha quedado
 * de verdad guardado, que es distinto de lo que la sonda de regenerar dice que
 * va a guardar: entre una cosa y otra pasa por la base de datos.
 *
 *   node qa/ver-form.js <id>
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API = "https://127.0.0.1:8000";
const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";
const FORM_ID = process.argv[2];

if (!FORM_ID) {
  console.log("uso: node qa/ver-form.js <id>");
  process.exit(1);
}

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

const r = await fetch(`${API}/api/forms/${FORM_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const j = await r.json();
const f = j?.data?.form || j?.data;
if (!f?.questions) {
  console.log(`HTTP ${r.status}:`, JSON.stringify(j).slice(0, 300));
  process.exit(1);
}

const qs = f.questions;
const E = ["section", "heading", "paragraph", "image"];
const respondibles = qs.filter((q) => !E.includes(q.type));
const hist = {};
for (const q of respondibles) hist[q.type] = (hist[q.type] || 0) + 1;
const deLista = respondibles.filter((q) => ["radio", "checkbox", "dropdown", "rank"].includes(q.type));
const escalas = respondibles.filter((q) => q.type === "rating");

console.log(`titulo:       ${JSON.stringify(f.title)}`);
console.log(`descripcion:  ${(f.description || "").length} caracteres`);
console.log(`estado:       ${f.status ?? "(sin estado)"}   publicado: ${f.isPublished ?? f.published ?? "?"}`);
console.log(`bloques:      ${qs.length}`);
console.log(`secciones:    ${qs.filter((q) => q.type === "section").length}`);
console.log(`parrafos:     ${qs.filter((q) => q.type === "paragraph").length}`);
console.log(`preguntas:    ${respondibles.length}   obligatorias: ${respondibles.filter((q) => q.required).length}`);
console.log(`de lista:     ${deLista.filter((q) => (q.options || []).length >= 2).length}/${deLista.length} con opciones`);
console.log(`escalas:      ${escalas.filter((q) => q.scale?.minLabel && q.scale?.maxLabel).length}/${escalas.length} con los dos anclas`);
console.log(`tipos:        ${JSON.stringify(hist)}`);

console.log(`\nprimeros bloques:`);
for (const q of qs.slice(0, 6)) {
  const txt = (q.content || q.label || "").slice(0, 66);
  console.log(`  ${(q.type || "?").padEnd(11)} ${txt}`);
}

console.log(`\nsecciones:`);
for (const q of qs.filter((x) => x.type === "section")) console.log(`  · ${q.label}`);