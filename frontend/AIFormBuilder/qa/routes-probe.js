/* ¿El panel cuelga de verdad de cubagob.gob.cu/panel-gestion y la URL entera
 * habla el idioma del usuario?
 *
 * Sin red ni navegador esto ya se comprueba en qa/routes.js; aquí se mide lo
 * que de verdad importa: que el navegador, con la app montada, caiga donde debe
 * y que ni el título ni la dirección se queden en el otro idioma.
 *
 * Los fallos que se buscan son los silenciosos: un enlace que se queda en la
 * raíz, un cambio de idioma que devuelve a la portada en vez de conservar la
 * página, un segmento en inglés debajo del alias español, o un título que nunca
 * se reescribe porque la app no llegó a pintar.
 *
 * Trabaja en una pestaña PROPIA y la cierra al terminar, para no fight con la
 * que esté usando el usuario, y todas las llamadas tienen plazo: una sonda que
 * se cuelga no informa de nada y encima roba el navegador.
 *
 * Requiere el dev server en 5173, el API en 8000 y Chrome de depuracion en
 * 9222. Firma un JWT de la cuenta de QA para que las paginas protegidas se
 * abran (mismo patron que qa/render-probe.js).
 *
 *   npm run qa:nav
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const WS = "http://127.0.0.1:9222";
const APP = "https://127.0.0.1:5173";
const API = "https://127.0.0.1:8000";
const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";

const envText = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"), "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const conPlazo = (p, ms, que) =>
  Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(`se pasó el plazo: ${que}`)), ms))]);
const api = (method, url) =>
  fetch(API + url, { method, headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(8000) });

let fallos = 0;
const ok = (m) => console.log(`  OK      ${m}`);
const avisar = (m) => { console.log(`  FALLO   ${m}`); fallos++; };
const eq = (real, esperado, nombre) => {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) ok(`${nombre} (${a})`);
  else avisar(`${nombre}\n            esperado ${b}\n            real     ${a}`);
};

/* El título estático: lo que se ve antes de que la app arranque. Sin esto, un
   `document.title` correcto puede venir del index.html y no de la app. */
console.log("\n════ 0. el título antes de la app ════");
try {
  const html = await conPlazo(fetch(`${APP}/panel-gestion/formularios`, { signal: AbortSignal.timeout(8000) }).then((r) => r.text()), 9000, "leer index.html");
  const estatico = html.match(/<title>([^<]*)<\/title>/)?.[1] || null;
  eq(estatico, "CubaGob - Panel de Gestión", "el index.html ya trae la marca");
} catch (err) {
  avisar(`el dev server no responde en ${APP}: ${err.message}`);
}

const creada = await fetch(`${WS}/json/new?about:blank`, { method: "PUT", signal: AbortSignal.timeout(5000) })
  .then((r) => r.json())
  .catch(() => null);
if (!creada?.webSocketDebuggerUrl) { console.log(`\nno hay ningun Chrome de depuracion en 9222.`); process.exit(1); }

const ws = new WebSocket(creada.webSocketDebuggerUrl);
await conPlazo(new Promise((r) => ws.addEventListener("open", r)), 6000, "conectar al navegador");
let id = 0;
const pend = new Map();
const send = (m, p = {}) => conPlazo(new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })); }), 10000, m);
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const ev = async (x) => {
  const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("expr rota: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result?.value;
};
const ir = async (ruta) => { await send("Page.navigate", { url: APP + ruta }); await wait(2200); };
const estado = () => ev(`({
  ruta: location.pathname + location.search,
  titulo: document.title,
  idioma: document.documentElement.lang,
  cuatro: /no encontrada|not found/i.test(document.body.innerText),
  menu: [...new Set([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h && h.includes('panel')))].sort(),
})`);
/* La URL se reescribe en la MISMA actualización que el idioma: 400 ms tienen que
   bastar. Si hay que esperar más, es que la dirección va un paso por detrás de
   lo que dice la pantalla, que es justo el fallo que se busca aquí. */
const pulsarIdioma = async (etiqueta) => {
  let pulsado = false;
  /* Se espera a que el botón exista: hay páginas cuyos datos tardan en llegar y
     el selector se queda con las manos vacías si se pregunta demasiado pronto. */
  for (let intento = 0; intento < 8 && !pulsado; intento++) {
    pulsado = await ev(`(() => {
      const b = [...document.querySelectorAll('button[aria-label]')].find((x) => (x.getAttribute('aria-label')||'').toLowerCase() === ${JSON.stringify(etiqueta.toLowerCase())} && x.offsetParent !== null);
      if (b) { b.click(); return true; }
      return false;
    })()`);
    if (!pulsado) await wait(500);
  }
  if (!pulsado) avisar(`no se encontró el botón «${etiqueta}»`);
  await wait(400);
};

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });

  await ir("/panel-gestion");
  await ev(`try {
    localStorage.setItem('formly_token', ${JSON.stringify(TOKEN)});
    localStorage.setItem('formly_language', 'es');
  } catch (e) {} 1`);

  /* Un formulario real de la cuenta, para el constructor: entrar en
     `/builder/new` crearía un borrador, y esta sonda no deja basura. */
  const listado = await api("GET", "/api/forms?limit=1").then((r) => r.json()).catch(() => null);
  const formId = listado?.data?.forms?.[0]?._id || null;
  if (!formId) avisar("no se encontró ningún formulario en la cuenta de QA: se repiten las comprobaciones sin el constructor");

  console.log("\n════ 1. la portada es el panel, en español ════");
  await ir("/panel-gestion");
  let e = await estado();
  eq(e.ruta, "/panel-gestion", "la raíz del panel se queda en el alias español");
  eq(e.titulo, "CubaGob - Panel de Gestión", "el título lleva la marca y la página");
  eq(e.idioma, "es", "el español es el idioma de la cuenta de QA");
  if (e.cuatro) avisar("la portada del panel cae en la pantalla de 404");

  console.log("\n════ 2. con el español puesto, la URL no dice nada en inglés ════");
  eq(
    e.menu,
    ["/panel-gestion", "/panel-gestion/bandeja-de-entrada", "/panel-gestion/configuracion", "/panel-gestion/estadisticas", "/panel-gestion/formularios", "/panel-gestion/plantillas"],
    "el menú apunta a páginas en español"
  );
  if (e.menu.some((h) => /\/forms$|\/settings$|\/insights$|\/inbox$|\/templates$/.test(h))) {
    avisar(`quedan enlaces en inglés: ${JSON.stringify(e.menu)}`);
  }

  console.log("\n════ 3. cada página cuelga del alias, en español ════");
  const PAGINAS = [
    ["/panel-gestion/formularios", "CubaGob - Mis formularios"],
    ["/panel-gestion/configuracion", "CubaGob - Configuración"],
    ["/panel-gestion/estadisticas", "CubaGob - Estadísticas"],
    ["/panel-gestion/bandeja-de-entrada", "CubaGob - Bandeja de entrada"],
    ["/panel-gestion/plantillas", "CubaGob - Plantillas"],
    ["/panel-gestion/diseno", "CubaGob - Sistema de diseño"],
    ...(formId ? [[`/panel-gestion/constructor/${formId}`, "CubaGob - Construir"]] : []),
  ];
  for (const [ruta, titulo] of PAGINAS) {
    await ir(ruta);
    e = await estado();
    eq(e.ruta, ruta, `se queda en ${ruta}`);
    eq(e.titulo, titulo, `el título de ${ruta}`);
    if (e.cuatro) avisar(`${ruta} cae en la pantalla de 404`);
  }

  console.log("\n════ 4. cambiar de idioma reescribe la URL ENTERA ════");
  /* El enlace del menú marcado como activo es la forma de preguntar al
     enrutado dónde cree que está. Si la URL y el menú no coinciden, es que la
     URL se corrigió a la carrera y el enrutado se quedó atrás. Hay dos menús
     (raíl y lateral) y los dos marcan, así que se mira el conjunto. */
  const activos = () => ev(`[...document.querySelectorAll('a[aria-current="page"]')].map(a => a.getAttribute('href'))`);
  const marcaLaActual = async (donde) => {
    const marcados = await activos();
    if (!marcados.includes(donde)) avisar(`nadie en el menú marca ${donde}; marcan ${JSON.stringify(marcados)}`);
  };
  await ir("/panel-gestion/formularios");
  await pulsarIdioma("English");
  e = await estado();
  eq(e.ruta, "/en/panel-management/forms", "de español a inglés conservando la página");
  eq(e.idioma, "en", "el documento pasa a inglés");
  eq(e.titulo, "CubaGob - My Forms", "el título sigue al idioma");
  if (e.cuatro) avisar("la misma página en inglés cae en 404");
  await wait(2500);
  await marcaLaActual("/en/panel-management/forms");

  await pulsarIdioma("Español");
  e = await estado();
  eq(e.ruta, "/panel-gestion/formularios", "y de vuelta al español sin perder la página");
  eq(e.idioma, "es", "el documento vuelve a español");
  eq(e.titulo, "CubaGob - Mis formularios", "y el título también");
  await wait(2500);
  await marcaLaActual("/panel-gestion/formularios");

  console.log("\n════ 5. cambiar de idioma en una página honda ════");
  if (formId) {
    await ir(`/panel-gestion/formularios/${formId}/respuestas`);
    e = await estado();
    eq(e.ruta, `/panel-gestion/formularios/${formId}/respuestas`, "las respuestas en español");
    await pulsarIdioma("English");
    e = await estado();
    eq(e.ruta, `/en/panel-management/forms/${formId}/responses`, "y en inglés conserva el formulario, no la portada");
    await pulsarIdioma("Español");
    e = await estado();
    eq(e.ruta, `/panel-gestion/formularios/${formId}/respuestas`, "y de vuelta");
  }

  console.log("\n════ 6. el idioma elegido manda sobre el enlace ════");
  /* El orden de autoridad es: lo que el usuario eligió > el alias del enlace. Un
     enlace no puede deshacer una elección, y con la cuenta de QA en español eso
     significa que un enlace inglés se abre en español. */
  await ir("/en/panel-management/configuracion");
  e = await estado();
  eq(e.ruta, "/panel-gestion/configuracion", "un enlace inglés con el español elegido se lleva a español");
  eq(e.idioma, "es", "y el documento se queda en español");
  eq(e.titulo, "CubaGob - Configuración", "con el título en español");

  console.log("\n════ 7. un segmento del otro idioma se corrige solo ════");
  /* `/panel-gestion/forms` es la URL que dejó el diseño anterior: con el
     español puesto tiene que llevar a Mis formularios, no a un 404. */
  await ir("/panel-gestion/forms");
  e = await estado();
  eq(e.ruta, "/panel-gestion/formularios", "un segmento en inglés debajo del alias español se traduce");
  eq(e.titulo, "CubaGob - Mis formularios", "y el título es el de la página, no el de un 404");
  if (e.cuatro) avisar("el enlace con el segmento viejo cae en 404 en vez de redirigirse");

  console.log("\n════ 8. las rutas viejas siguen llegando ════");
  const VIEJAS = [
    ["/", "/panel-gestion"],
    ["/dashboard", "/panel-gestion"],
    ["/forms", "/panel-gestion/formularios"],
    ["/settings", "/panel-gestion/configuracion"],
    ["/insights", "/panel-gestion/estadisticas"],
    ["/inbox", "/panel-gestion/bandeja-de-entrada"],
    ["/templates", "/panel-gestion/plantillas"],
    ["/design", "/panel-gestion/diseno"],
    ...(formId ? [[`/builder/${formId}`, `/panel-gestion/constructor/${formId}`]] : []),
  ];
  for (const [vieja, nueva] of VIEJAS) {
    await ir(vieja);
    e = await estado();
    eq(e.ruta, nueva, `${vieja} lleva a ${nueva}`);
  }
  if (formId) {
    await ir(`/builder/${formId}?ai=1`);
    e = await estado();
    eq(e.ruta, `/panel-gestion/constructor/${formId}?ai=1`, "una ruta vieja con query conserva la query");
    eq(e.titulo, "CubaGob - Construir", "y con el generador abierto sigue siendo el constructor");
  }

  console.log("\n════ 9. la preferencia guardada decide el idioma de la raíz ════");
  /* Se escriben las DOS copias del idioma, la local y la de la cuenta, porque
     eso es lo que hace el botón del selector. Escribiendo solo la local la
     comprobación pasaba por casualidad: la app arranca en inglés, la raíz salta
     al alias inglés, y un instante después `PreferencesSync` hidrataba desde la
     cuenta (que seguía en español) y devolvía la URL al alias español. Con la
     cuenta en español, ganaba quien llegara antes, y antes ganaba porque con 92
     formularios en la cuenta el perfil tardaba más que el salto. Al vaciar la
     cuenta, la hidratación llegó antes y la comprobación —que era una carrera
     que se ganaba por suerte— empezó a fallar sola. */
  /* El idioma vive en la cuenta dentro de la apariencia, y `PATCH
     /appearance` es de campos sueltos: hay que mandar también el tema y el
     acento, o se guardan vacíos y la sonda se lleva por delante la preferencia
     de tema de la cuenta. Se leen primero. */
  const ponerIdiomaGuardado = async (idioma) => {
    const actual = await (await api("GET", "/api/settings")).json();
    const d = actual?.data || {};
    const r = await fetch(`${API}/api/settings/appearance`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: d.theme ?? "system",
        accentColor: d.accentColor ?? "#00D2FF",
        language: idioma,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) avisar(`no se pudo guardar el idioma ${idioma} en la cuenta (HTTP ${r.status})`);
    await ev(`try { localStorage.setItem('formly_language', ${JSON.stringify(idioma)}); } catch (e) {} 1`);
  };

  await ponerIdiomaGuardado("en");
  await ir("/");
  e = await estado();
  eq(e.ruta, "/en/panel-management", "con inglés guardado, la raíz lleva al alias inglés");
  eq(e.idioma, "en", "y el documento está en inglés");

  /* Y la regla que no estaba comprobada, que es la que de verdad decidía lo de
     arriba: la cuenta manda sobre una preferencia local escrita a mano. Está en
     `PreferencesSync`, en la hidratación, y es lo correcto: el idioma elegido se
     guarda en la cuenta para viajar entre dispositivos, así que un `localStorage`
     tocado por fuera no puede ganarle. */
  await ev(`try { localStorage.setItem('formly_language', 'es'); } catch (e) {} 1`);
  await ir("/");
  e = await estado();
  eq(e.ruta, "/en/panel-management", "un localStorage en español no le gana a la cuenta en inglés");

  await ponerIdiomaGuardado("es");
  await ir("/");
  e = await estado();
  eq(e.ruta, "/panel-gestion", "y volviendo a guardar español, la raíz vuelve al alias español");

  console.log("\n════ 10. las páginas públicas no se mueven ════");
  await ir("/f/formulario-que-no-existe");
  e = await estado();
  eq(e.ruta, "/f/formulario-que-no-existe", "el enlace público se queda en la raíz");
  if (!["es", "en"].includes(e.idioma)) avisar(`el documento no declara idioma: ${e.idioma}`);
  await pulsarIdioma("English");
  e = await estado();
  eq(e.ruta, "/f/formulario-que-no-existe", "cambiar de idioma no mete un alias en un enlace compartido");
  eq(e.idioma, "en", "pero sí cambia el texto");
  await pulsarIdioma("Español");
  e = await estado();
  eq(e.idioma, "es", "y se vuelve al español");

  console.log("\n════ 11. una ruta desconocida lo dice ════");
  await ir("/panel-gestion/inventada");
  e = await estado();
  eq(e.ruta, "/panel-gestion/inventada", "no se expulsa de la ruta");
  eq(e.titulo, "CubaGob - Página no encontrada", "el título lo dice");
  if (!e.cuatro) avisar("una ruta inventada dentro del panel no muestra el 404");

  console.log(`\n${fallos === 0 ? "TODO CORRECTO" : `${fallos} FALLO(S)`}`);
  process.exitCode = fallos === 0 ? 0 : 1;
} catch (err) {
  avisar(`la sonda se cortó: ${err.message}`);
  process.exitCode = 1;
} finally {
  ws.close();
  await fetch(`${WS}/json/close/${creada.id}`).catch(() => {});
  process.exit(process.exitCode);
}
