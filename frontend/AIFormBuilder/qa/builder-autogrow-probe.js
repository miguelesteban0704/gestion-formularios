/* Prueba de escritura en vivo: escribir, borrar todo y rotar.
 * La sonda principal mide con un texto YA guardado, y eso no alcanza para un
 * autogrow: el fallo típico de "crece con el contenido" no es no crecer con un
 * texto largo, es no ENCOGER cuando el texto se borra, o quedarse con el alto
 * del ancho anterior al girar el móvil. Aquí se comprueban las tres cosas.
 */
const WS = "http://127.0.0.1:9222";
const APP = "https://127.0.0.1:5173";
const API = "https://127.0.0.1:8000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { builderPath, homePath, panelBase } from "../src/lib/routes.js";

/* Las rutas se componen con los mismos constructores que usa la app, en un idioma
   fijo. Escribirlas a mano fue un error: cuando la URL pasó a llevar los segmentos
   traducidos, esta navegación se quedó vieja y la sonda midió la redirección en
   vez del constructor. */
const IDIOMA = "es";

const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";
const envText = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"), "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

const api = (method, url, body) =>
  fetch(API + url, { method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

const LARGO = "Encuesta de diagnostico sobre transformaciones economicas y sociales que se extienden a lo largo de varias lineas para comprobar que ninguna parte del titulo queda cortada";

const creado = await api("POST", "/api/forms", { title: "Temporal", description: "Temporal", fields: [{ id: "c1", type: "text", label: "L", required: false, options: [] }] });
const cuerpo = await creado.json();
const formId = cuerpo?.data?.form?._id;
if (!formId) { console.log("no se pudo crear el formulario:", JSON.stringify(cuerpo).slice(0, 300)); process.exit(1); }

let fallos = 0;
const avisar = (m) => { console.log(`  FALLO   ${m}`); fallos++; };
const ok = (m) => console.log(`  OK      ${m}`);

try {
  const list = await (await fetch(`${WS}/json/list`)).json();
  const page = list.find((x) => x.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })); });
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
  const ev = async (x) => {
    const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("expresión rota: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  };
  await send("Page.enable"); await send("Runtime.enable");

  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: APP + homePath(IDIOMA) });
  await wait(3500);
  /* El idioma se fija en localStorage además de en la URL: si la app arranca en
     inglés toma sus rutas del alias inglés y el constructor no está donde esta
     sonda lo busca. */
  await ev(`try {
    localStorage.setItem('formly_token', ${JSON.stringify(TOKEN)});
    localStorage.setItem('formly_language', ${JSON.stringify(IDIOMA)});
  } catch (e) {} 1`);
  await send("Page.navigate", { url: APP + builderPath(IDIOMA, formId) });
  await wait(5000);
  if (!String(await ev(`location.pathname`)).startsWith(`${panelBase(IDIOMA)}/constructor/`)) { console.log("el builder no cargó:", await ev(`location.pathname`)); process.exit(1); }

  /* Escribe como lo haría una persona: pone el valor y dispara `input`, que es
     lo que React escucha. Poner `.value` a pelo no cambiaría el estado. */
  const escribir = (selector, texto) => ev(`(() => {
    const e = document.querySelector(${JSON.stringify(selector)});
    if (!e) return 0;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(e, ${JSON.stringify(texto)});
    e.dispatchEvent(new Event('input', { bubbles: true }));
    return 1;
  })()`);

  const MEDIR = (sel) => `(() => {
    const e = document.querySelector(${JSON.stringify(sel)});
    if (!e) return null;
    const cs = getComputedStyle(e);
    const lh = parseFloat(cs.lineHeight) || 20;
    return { alto: Math.round(e.getBoundingClientRect().height), lineas: Math.round((e.getBoundingClientRect().height - parseFloat(cs.paddingTop||'0') - parseFloat(cs.paddingBottom||'0')) / lh), scrollV: e.scrollHeight - e.clientHeight, len: (e.value||'').length };
  })()`;

  const SEL = "textarea";
  const desc = "textarea + textarea";

  console.log("\n════ 1. escribir un texto largo ════");
  await escribir(SEL, LARGO);
  await wait(700);
  const largo = await ev(MEDIR(SEL));
  console.log(`  titulo escrito: ${largo.lineas} linea(s), ${largo.alto}px, ${largo.len} caracteres`);
  if (largo.scrollV > 1) avisar(`tras escribir, el titulo tiene ${largo.scrollV}px sin mostrar`);
  if (largo.lineas < 2) avisar(`tras escribir un texto largo, el titulo sigue en una linea (${largo.alto}px): no crece`);
  else ok(`el titulo crece al escribir: ${largo.lineas} lineas, ${largo.alto}px`);

  console.log("\n════ 2. BORRAR todo (debe encoger, no quedarse alto) ════");
  await escribir(SEL, "");
  await wait(700);
  const vacio = await ev(MEDIR(SEL));
  console.log(`  titulo vacio: ${vacio.lineas} linea(s), ${vacio.alto}px`);
  if (vacio.alto >= largo.alto) avisar(`tras borrar, el titulo sigue midiendo ${vacio.alto}px (antes ${largo.alto}px): no encoge`);
  else if (vacio.lineas !== 1) avisar(`tras borrar, el titulo mide ${vacio.lineas} lineas, deberia ser 1`);
  else ok(`el titulo encoge a una linea al borrar: ${vacio.alto}px`);

  console.log("\n════ 3. un caracter (debe volver a crecer) ════");
  await escribir(SEL, "x");
  await wait(700);
  const uno = await ev(MEDIR(SEL));
  if (uno.lineas !== 1) avisar(`con un solo caracter, el titulo mide ${uno.lineas} lineas (${uno.alto}px)`);
  else ok(`con un caracter, una sola linea: ${uno.alto}px`);

  console.log("\n════ 4. rotar: escribir en horizontal y medir en vertical ════");
  await send("Emulation.setDeviceMetricsOverride", { width: 900, height: 1400, deviceScaleFactor: 1, mobile: false });
  await escribir(SEL, LARGO);
  await wait(900);
  const antesGiro = await ev(MEDIR(SEL));
  await send("Emulation.setDeviceMetricsOverride", { width: 480, height: 900, deviceScaleFactor: 1, mobile: true });
  await wait(1200);
  const despuesGiro = await ev(MEDIR(SEL));
  console.log(`  antes del giro (900px): ${antesGiro.lineas} lineas, ${antesGiro.alto}px`);
  console.log(`  tras el giro (480px):   ${despuesGiro.lineas} lineas, ${despuesGiro.alto}px`);
  if (despuesGiro.lineas <= antesGiro.lineas) avisar(`tras estrechar de 900 a 480px el titulo NO ha crecido (${antesGiro.lineas} -> ${despuesGiro.lineas} lineas): el texto se sale de la caja al rotar`);
  else if (despuesGiro.scrollV > 1) avisar(`tras rotar, el titulo tiene ${despuesGiro.scrollV}px sin mostrar`);
  else ok(`el titulo se reajusta al rotar: ${antesGiro.lineas} -> ${despuesGiro.lineas} lineas, ${despuesGiro.alto}px`);

  console.log("\n════ 5. la descripcion tambien ════");
  await escribir(desc, LARGO);
  await wait(700);
  const d = await ev(MEDIR(desc));
  if (d.lineas < 2) avisar(`la descripcion no crece: ${d.lineas} linea(s) para ${d.len} caracteres`);
  else if (d.scrollV > 1) avisar(`la descripcion tiene ${d.scrollV}px sin mostrar`);
  else ok(`la descripcion crece: ${d.lineas} lineas, ${d.alto}px`);

  console.log("\n════ 6. Enter en el titulo no mete salto ════");
  const enter = await ev(`(() => {
    const e = document.querySelector(${JSON.stringify(SEL)});
    if (!e) return null;
    e.focus();
    const antes = (e.value||'').length;
    const ev2 = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const noCancelado = e.dispatchEvent(ev2);
    return { antes, cancelado: !noCancelado };
  })()`);
  if (!enter) avisar("no se encontró el textarea del titulo para la prueba de Enter");
  else if (!enter.cancelado) avisar("Enter en el titulo NO se ha cancelado: el usuario puede meter un salto de linea en un campo de una linea");
  else ok("Enter en el titulo se cancela (no mete salto de linea)");
} finally {
  const del = await api("DELETE", `/api/forms/${formId}`);
  console.log(`\nFormulario temporal borrado (HTTP ${del.status}).`);
}

console.log(`\n${fallos === 0 ? "TODO CORRECTO" : `${fallos} FALLO(S)`}`);
process.exit(fallos === 0 ? 0 : 1);
