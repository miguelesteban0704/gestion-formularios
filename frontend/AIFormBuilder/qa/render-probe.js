/* Comprobación de lo que se PINTA de verdad en el formulario, no de lo que hay
 * en el json. Se mira el texto que acaba viendo el entrevistado.
 *
 * Por qué tiene que mirar el DOM y no los datos: los fallos que se buscan aquí
 * son justo los casos en que el dato está bien guardado y no se ve. Un `json`
 * con "Sección 0: Datos Sociodemográficos" y un `description` con los anclajes
 * de la escala dice que todo va bien; lo que importa es si eso aparece en
 * pantalla.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { builderPath, homePath, panelBase } from "../src/lib/routes.js";

const WS = "http://127.0.0.1:9222";
const APP = "https://127.0.0.1:5173";
const API = "https://127.0.0.1:8000";
const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";

/* Las rutas se componen con los mismos constructores que usa la app, en un idioma
   fijo. Escribirlas a mano fue un error: cuando la URL pasó a llevar los segmentos
   traducidos, esta navegación se quedó vieja y la sonda midió la redirección en
   vez del constructor. */
const IDIOMA = "es";

const envText = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"), "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const api = (method, url, body) =>
  fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

let fallos = 0;
const avisar = (m) => { console.log(`  FALLO   ${m}`); fallos++; };
const ok = (m) => console.log(`  OK      ${m}`);

/* Un formulario de quita y pon con todo lo que hay que ver: bloques de
 * maquetación, una descripción con los anclajes de la escala, una escala de 7
 * puntos, y una pregunta de clasificación. */
const TITULO = "Sonda de render [se borra al terminar]";
const CAMPOS = [
  { id: "p-intro", type: "paragraph", label: "Encuesta anonima sobre la gestion.", content: "", required: false, options: [] },
  /* El caso inverso al de arriba, y el que mas ha costado. El generador escribe
     la prosa en `content` y soltaba un `label` de relleno al lado; si el renderer
     leyera `label` primero —o solo— se pintaba "Pregunta 1" en lugar de la
     introducción. Va con las dos cosas puestas a propósito: el texto bueno en
     `content` y un relleno reconocible en `label`. Si alguno de los dos aparece en
     pantalla, el orden de lectura es el que no debe. */
  { id: "p-instr", type: "paragraph", label: "Pregunta 1", content: "Responda cada pregunta segun su opinion real.", required: false, options: [] },
  { id: "p-sec1", type: "section", label: "Seccion 1: Conocimiento", content: "", required: false, options: [] },
  { id: "q-likert", type: "radio", label: "¿Considera efectiva la reforma?", description: "1 = Muy en desacuerdo, 7 = Muy de acuerdo", required: false, options: [] },
  { id: "q-likert7", type: "rating", label: "Nivel de confianza en las medidas", description: "1 = Nada, 7 = Muchisima", scale: { min: 1, max: 7, minLabel: "Nada", maxLabel: "Muchisima" }, required: false, options: [] },
  { id: "q-help", type: "short_text", label: "Comentario", helpText: "Es opcional y no se publica.", required: false, options: [] },
  { id: "p-sec2", type: "section", label: "Seccion 2: Prioridades", content: "", required: false, options: [] },
  { id: "q-rank", type: "rank", label: "Ordena estas medidas de mayor a menor impacto", required: false, options: [
      { id: "o1", label: "Salario minimo", value: "" },
      { id: "o2", label: "Autonomia empresarial", value: "" },
      { id: "o3", label: "Descentralizacion municipal", value: "" },
    ] },
];

/* `questions`, no `fields`: createForm no normaliza el cuerpo (solo lo hace la
   ruta de IA), así que la clave del payload es la que se guarda tal cual. Con
   `fields` el formulario se creaba con cero preguntas y esta sonda midiendo una
   página vacia daría verde en falso. */
const creado = await api("POST", "/api/forms", { title: TITULO, description: "Formulario temporal de la sonda de render.", questions: CAMPOS });
const cuerpo = await creado.json();
const formId = cuerpo?.data?.form?._id || cuerpo?.data?._id;
if (!formId) { console.log("no se pudo crear el formulario:", JSON.stringify(cuerpo).slice(0, 300)); process.exit(1); }

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
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: APP + homePath(IDIOMA) });
  await wait(3000);
  /* El idioma se fija en localStorage además de en la URL: si la app arranca en
     inglés toma sus rutas del alias inglés y el constructor no está donde esta
     sonda lo busca. */
  await ev(`try {
    localStorage.setItem('formly_token', ${JSON.stringify(TOKEN)});
    localStorage.setItem('formly_language', ${JSON.stringify(IDIOMA)});
  } catch (e) {} 1`);

  /* Se mira en el BUILDER, que es la misma vista previa que elbuilder y el
     formulario publicado (ambos pasan por FieldRenderer), sin necesidad de
     publicar nada. */
  await send("Page.navigate", { url: APP + builderPath(IDIOMA, formId) });
  await wait(6500);
  if (!String(await ev(`location.pathname`)).startsWith(`${panelBase(IDIOMA)}/constructor/`)) {
    console.log("el builder no cargo:", await ev(`location.pathname`));
    process.exit(1);
  }

  const texto = await ev(`document.body.innerText`);
  const html = await ev(`document.body.innerHTML`);

  if (process.env.SONDA_DEBUG) {
    console.log("--- DEPURACION ---");
    console.log("titulo del formulario en pantalla:", (texto || "").includes(TITULO));
    const guardado = await (await api("GET", `/api/forms/${formId}`)).json();
    const f = guardado?.data?.form || guardado?.data;
    console.log("lo que guardo la API:", JSON.stringify((f?.questions || []).map((q) => ({ t: q.type, l: q.label }))));
    console.log("hr en el html:", (html.match(/<hr/g) || []).length);
    console.log("body (900-2600):", (texto || "").slice(900, 2600));
  }

  console.log("\n════ 1. los titulos de seccion se ven ════");
  for (const t of ["Seccion 1: Conocimiento", "Seccion 2: Prioridades"]) {
    if (!texto.includes(t)) avisar(`el titulo de seccion "${t}" NO aparece en pantalla`);
    else ok(`se ve "${t}"`);
  }

  console.log("\n════ 2. la description (anclajes de la escala) se ve ════");
  if (!texto.includes("1 = Muy en desacuerdo, 7 = Muy de acuerdo")) avisar("la description con los anclajes NO aparece en pantalla");
  else ok("se ven los anclajes de la escala de opcion multiple");

  console.log("\n════ 3. el helpText se ve ════");
  if (!texto.includes("Es opcional y no se publica.")) avisar("el helpText NO aparece en pantalla");
  else ok("se ve el helpText");

  console.log("\n════ 4. los parrafos de cabecera se ven ════");
  if (!texto.includes("Encuesta anonima sobre la gestion.")) avisar("el paragraph de introduccion NO aparece");
  else ok("se ve el parrafo de introduccion");

  /* Que el texto de `content` gane al `label` de relleno que va al lado.
     Se mira el elemento renderizado y no el `innerText` del body entero, porque
     el builder rotula cada bloque con su nombre interno en la cabecera de su
     tarjeta, y ahí el `label` sí tiene que verse: es lo que el autor reconoce
     para encontrarlo. La asercion anterior miraba el body entero y daba un fallo
     que no existía, mientras el renderer leía `content` correctamente. */
  const parrafos = await ev(`[...document.querySelectorAll('p')].map(p => (p.textContent||'').trim())`);
  console.log(`  parrafos renderizados: ${JSON.stringify(parrafos.filter((t) => /opinion real|anonima/.test(t)))}`);
  if (!parrafos.includes("Responda cada pregunta segun su opinion real."))
    avisar("el paragraph con texto en `content` NO se renderiza: el renderer esta leyendo el `label` de relleno");
  else ok("el paragraph con `content` real gana al `label` de relleno");
  if (parrafos.includes("Pregunta 1"))
    avisar("el `label` de relleno se esta pintando como texto del parrafo");
  else ok("el `label` de relleno no se pinta como texto del parrafo");

  console.log("\n════ 5. la escala de 7 puntos con sus extremos ════");
  /* Cuenta SOLO los botones con aria-label de la escala. Antes esta comprobación
     subía hasta la tarjeta del builder y contaba sus botones de arrastrar,
     duplicar y eliminar: daba verde con las cinco estrellas de siempre. */
  const escala = await ev(`(() => {
    const grupo = document.querySelector('[role="radiogroup"]');
    if (!grupo) return { n: 0, hayGrupo: false };
    const propios = [...grupo.querySelectorAll('button[role="radio"]')];
    const esEstrellas = propios.length > 0 && propios.every(b => b.querySelector('svg'));
    return {
      hayGrupo: true, n: propios.length, esEstrellas,
      numeros: propios.map(b => (b.textContent||'').trim()),
      nombres: propios.map(b => b.getAttribute('aria-label')),
      /* Los rotulos de los extremos tienen que estar DENTRO del grupo: fuera, un
         lector de pantalla no los anuncia al elegir un numero. */
      rotulosDentro: grupo.innerText.includes('Nada') && grupo.innerText.includes('Muchisima'),
    };
  })()`);
  console.log(`  ${JSON.stringify(escala)}`);
  if (!escala.hayGrupo) avisar("no hay ningun grupo de escala: el rating se sigue pintando como cinco estrellas sueltas");
  else if (escala.esEstrellas) avisar("la escala se sigue pintando con ESTRELLAS: una Likert de 7 puntos no son cinco estrellas");
  else if (escala.n !== 7) avisar(`la escala de 7 puntos pinta ${escala.n} pasos, no 7`);
  else ok(`la escala pinta ${escala.n} pasos: ${escala.numeros.join(" ")}`);
  if (escala.hayGrupo && !escala.rotulosDentro) avisar("los rotulos de los extremos quedan FUERA del grupo: no se anuncian al elegir un numero");
  else if (escala.hayGrupo) ok("los dos rotulos de los extremos estan dentro del grupo");
  if (escala.hayGrupo && escala.nombres?.some((x) => !x || /^\d+$/.test(x))) avisar("algún boton de la escala no tiene nombre accesible util");

  console.log("\n════ 6. la pregunta de clasificacion se puede ordenar ════");
  const rank = await ev(`(() => {
    const eti = [...document.querySelectorAll('button[aria-label*="position"], button[aria-label*="puesto"]')];
    const grupos = new Set(eti.map(b => b.getAttribute('aria-label')));
    return { botones: eti.length, grupos: [...grupos] };
  })()`);
  console.log(`  ${JSON.stringify(rank)}`);
  if (rank.botones === 0) avisar("la pregunta de clasificacion NO pinta sus opciones ordenables");
  else if (rank.grupos.length !== 3) avisar(`hay ${rank.grupos.length} filas ordenables y deberian ser 3`);
  else ok(`${rank.botones} botones de puesto repartidos en ${rank.grupos.length} filas`);

  console.log("\n════ 7. el html de la seccion lleva titulo + hr ════");
  if (!/<hr[^>]*class="[^"]*border-current\/15/.test(html)) avisar("no hay hr de seccion en el html");
  else ok("la seccion pinta regla y titulo");

  console.log(`\n${fallos === 0 ? "TODO CORRECTO" : `${fallos} FALLO(S)`}`);
} finally {
  const del = await api("DELETE", `/api/forms/${formId}`);
  console.log(`Formulario de la sonda borrado (HTTP ${del.status}).`);
}
process.exit(fallos === 0 ? 0 : 1);
