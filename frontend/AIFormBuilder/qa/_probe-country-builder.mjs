/* Sonda temporal: reproducir el problema del selector de países del constructor
 * para el rol `form_creator`. Crea un formulario con un campo teléfono, entra al
 * constructor, expande la tarjeta, abre el CountrySelect y mide qué elemento
 * queda encima del panel (document.elementFromPoint) + captura. Se borra al
 * terminar. */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { builderPath } from "../src/lib/routes.js";

const WS = "http://127.0.0.1:9222";
const APP = "https://localhost:5173";
const API = "https://127.0.0.1:8000";
const QA_USER = "19754912-914b-4963-b93e-b6ea42658bfb";
const ENTITY = "ministerio-de-justicia";
const IDIOMA = "es";

const envText = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"), "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const api = (method, url, body) =>
  fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

const TITULO = "Sonda dropdown builder [borrar]";
const CAMPOS = [{ id: "q-tel", type: "phone", label: "Telefono", required: false, options: [] }];
const creado = await api("POST", "/api/forms", { title: TITULO, description: "temporal", questions: CAMPOS });
const cuerpo = await creado.json();
const formId = cuerpo?.data?.form?._id || cuerpo?.data?._id;
if (!formId) { console.log("no se creo el form:", JSON.stringify(cuerpo).slice(0, 300)); process.exit(1); }

const shots = "C:\\Users\\migue\\AppData\\Local\\Temp\\opencode\\country-builder-shots";
fs.mkdirSync(shots, { recursive: true });

try {
  const list = await (await fetch(`${WS}/json/list`)).json();
  const page = list.find((x) => x.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pend = new Map();
  const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })); });
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
  const ev = async (x) => {
    const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("expr rota: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: APP + "/" });
  await wait(2500);
  await ev(`try {
    localStorage.setItem('formly_token', ${JSON.stringify(TOKEN)});
    localStorage.setItem('formly_language', ${JSON.stringify(IDIOMA)});
  } catch (e) {} 1`);

  await send("Page.navigate", { url: APP + builderPath(IDIOMA, formId, {}, ENTITY) });
  await wait(7000);
  console.log("ruta:", await ev(`location.pathname`));

  // Expande la tarjeta del campo (botón con aria-label "Mostrar u ocultar configuración").
  await ev(`(() => {
    const b = [...document.querySelectorAll('button[aria-label]')].find(x => /configuraci/i.test(x.getAttribute('aria-label')));
    b && b.click();
  })()`);
  await wait(1200);

  const capturar = async (nombre) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(shots, nombre + ".png"), Buffer.from(data, "base64"));
    console.log("captura:", nombre);
  };
  await capturar("01-expandida");

  // Localiza el disparador del CountrySelect.
  const trigger = await ev(`(() => {
    const b = [...document.querySelectorAll('button[aria-haspopup="listbox"]')].find(x => /pa[ií]s/i.test(x.getAttribute('aria-label') || ''));
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, label: b.getAttribute('aria-label') };
  })()`);
  console.log("trigger:", JSON.stringify(trigger));

  // Abre con clic real.
  if (trigger) {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: trigger.x, y: trigger.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: trigger.x, y: trigger.y, button: "left", clickCount: 1 });
  }
  await wait(700);
  await capturar("02-abierto");

  // ¿Qué hay encima del panel? Mide el centro del listbox.
  const probe = await ev(`(() => {
    const list = document.querySelector('[role="listbox"]');
    if (!list) return { abierto: false };
    const r = list.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    const cs = getComputedStyle(list);
    // ancestros que crean contexto de apilado
    const stacking = [];
    let el = list.parentElement;
    while (el && el !== document.body) {
      const s = getComputedStyle(el);
      if (s.transform !== 'none' || s.filter !== 'none' || s.contain !== 'none' || Number(s.opacity) < 1) {
        stacking.push({ tag: el.tagName + '.' + (el.className||'').toString().slice(0,40), transform: s.transform, filter: s.filter, opacity: s.opacity, contain: s.contain });
      }
      el = el.parentElement;
    }
    const bodyCS = getComputedStyle(document.body);
    const rootCS = getComputedStyle(document.documentElement);
    return {
      abierto: true,
      opciones: list.querySelectorAll('[role="option"]').length,
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      zIndex: cs.zIndex,
      position: cs.position,
      visibility: cs.visibility,
      topElTag: topEl ? topEl.tagName + '.' + (topEl.className||'').toString().slice(0,60) : null,
      topElIsPanel: topEl ? (list.contains(topEl) || topEl === list) : null,
      stackingAncestors: stacking,
      bodyTransform: bodyCS.transform,
      rootTransform: rootCS.transform,
    };
  })()`);
  console.log("probe:", JSON.stringify(probe, null, 1));

  // ¿El panel está por encima de la fila de vista previa?
  const overlap = await ev(`(() => {
    const list = document.querySelector('[role="listbox"]');
    const prev = document.querySelector('.pointer-events-none');
    if (!list || !prev) return null;
    const a = list.getBoundingClientRect(), b = prev.getBoundingClientRect();
    const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const prevCS = getComputedStyle(prev);
    const prevStacking = [];
    let el = prev;
    while (el && el !== document.body) {
      const s = getComputedStyle(el);
      if (s.transform !== 'none' || s.filter !== 'none' || s.contain !== 'none' || Number(s.opacity) < 1) prevStacking.push(el.tagName + '.' + (el.className||'').toString().slice(0,40));
      el = el.parentElement;
    }
    return { overlapArea: Math.round(ix*iy), prevRect: { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }, prevPointerEvents: prevCS.pointerEvents, prevStacking };
  })()`);
  console.log("overlap:", JSON.stringify(overlap));

  console.log("capturas en:", shots);
} finally {
  const del = await api("DELETE", `/api/forms/${formId}`);
  console.log(`Formulario de la sonda borrado (HTTP ${del.status}).`);
}
