/* Vuelca la consola y los errores de la pagina: para cuando la sonda falla y
 * hay que saber si es codigo roto o una comprobacion mia equivocada.
 *
 *   node qa/console-probe.js <ruta>
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { formsPath } from "../src/lib/routes.js";
const APP = "https://127.0.0.1:5173";
const WS = "http://127.0.0.1:9222";
const ruta = process.argv[2] || formsPath("es");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(`${WS}/json/list`)).json();
const page = list.find((x) => x.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })); });
await new Promise((r) => ws.addEventListener("open", r));
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); return; }
  if (m.method === "Log.entryAdded") console.log(`[${m.params.entry.level}] ${m.params.entry.text}`);
  if (m.method === "Runtime.consoleAPICalled") console.log(`[console.${m.params.type}] ${m.params.args.map((a) => a.value ?? a.description ?? "?").join(" ")}`);
  if (m.method === "Runtime.exceptionThrown") console.log(`[EXCEPCION] ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
});
await send("Log.enable");
await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: APP + ruta });
await wait(4000);
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value;
console.log("ruta:", await ev("location.pathname"));
console.log("titulo:", await ev("document.title"));
process.exit(0);
