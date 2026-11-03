/* ¿El título y la descripción de la card de formularios se ven ENTEROS?
 *
 * No basta con mirar las clases: quitar `line-clamp-1` del HTML es fácil, lo
 * difícil es demostrar que ahora el texto completo cabe dentro de su caja. Y
 * "cabe" no es lo mismo que "no está recortado": un `truncate`, un `max-h` o
 * un `overflow: hidden` en un ancestro pueden seguir cortando por debajo, y
 * quitar el clamp sin `min-w-0` cambia el fallo de "texto cortado" a "texto
 * que empuja el menú fuera de la tarjeta".
 *
 * Por eso la medición no mira clases sino GEOMETRÍA, que es lo que el ojo ve:
 *
 *   1. `lineClamp` — el valor computado de -webkit-line-clamp. Si no es
 *      "none", hay un recorte declarado y el texto se va a perder por diseño.
 *   2. `desbordePx` — con un Range sobre el nodo de texto se obtienen los
 *      rectángulos de CADA línea pintada. Se compara el borde inferior de la
 *      ÚLTIMA línea con el fondo de la caja. Positivo = la última línea se
 *      sale de su propia caja = hay texto que no se ve. Esto caza el recorte
 *      aunque venga de un ancestro, no solo de la línea que se mira.
 *   3. `scrollSobra` / `scrollAncho` — contenido sin mostrar en vertical y
 *      en horizontal, por si el recorte es de la caja y no de la línea.
 *   4. `lineas` — cuántas líneas ocupa de verdad, para distinguir "no cabe"
 *      de "caba en una línea y por tanto no hay nada raro".
 *
 * Se mide en claro y en oscuro, y a tres anchos (390 / 768 / 1440), porque un
 * recorte que solo aparece en el ancho pequeño sigue siendo un recorte: es
 * justo el que se ven los usuarios de móvil.
 *
 * El pie de la tarjeta también se mide. Al quitar el recorte, dos tarjetas de
 * la misma fila miden distinto, y sin `mt-auto` el botón de estadísticas
 * quedaría a una altura distinta en cada una. Eso no es un recorte de texto
 * pero es el daño visible que provoca el mismo cambio.
 *
 * El formulario de prueba se BORRA al terminar y la cuenta recupera el tema
 * que tenía. Esto no toca el acento ni publica nada.
 *
 * Uso manual (no va en CI): con el dev server en 5173, el API en 8000 y un
 * Chrome con `--remote-debugging-port=9222`:
 *   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node qa/card-text-probe.js
 */
const WS = "http://127.0.0.1:9222";
const APP = "https://127.0.0.1:5173";
const API = "https://127.0.0.1:8000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { builderPath, formsPath, homePath, panelBase } from "../src/lib/routes.js";

/* Las rutas se componen con los mismos constructores que usa la app, en un idioma
   fijo. Escribirlas a mano fue un error: cuando la URL pasó a llevar los
   segmentos traducidos, estas navegaciones se quedaron viejas y la sonda midió
   la redirección en vez de la página. */
const IDIOMA = "es";
const FORMULARIOS = formsPath(IDIOMA);

const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";
const envText = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"), "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

/* Textos largos a propósito: si el recorte está, que se vea con estos y no
 * dependa de un caso borde de tres palabras. El título lleva además una
 * palabra larguísima sin espacios, que es el otro modo de romper una caja
 * (desborde horizontal) y el que un `min-w-0` mal puesto deja pasar. */
const TITULO =
  "Encuesta de diagnostico sobre transformaciones economicas y sociales que se " +
  "extienden a lo largo de varias lineas para comprobar que ninguna parte del " +
  /* Esta palabra suelta es más ancha que la propia tarjeta a cualquier ancho
     de móvil: es la que obliga a que el título tenga `min-w-0` y `break-words`.
     Con una de 33 letras cabía de sobra y la prueba no comprobaba nada. */
  "titulo queda cortada Supercalifragilisticexpialidociousantausagesubmarine";
const DESCRIPCION =
  "Este formulario recoge opiniones sobre un proceso de transformacion que afecta a " +
  "varios sectores a la vez, y por eso su descripcion es larga a proposito: ocupa con " +
  "holgura mas de las dos lineas que antes se mostraban, de modo que si el recorte sigue " +
  "presente se va a notar aqui y no solo en un caso limite. Se sigue con la comprobacion " +
  "de que todo el texto queda dentro de la caja y de que el pie de la tarjeta sigue " +
  "alineado con el de sus vecinas.";
const CAMPOS = [{ id: "campo-1", type: "text", label: "Campo de texto", required: false, options: [] }];

const api = (method, url, body) =>
  fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

/* La apariencia de la cuenta se lee del API, no del DOM. La clase `dark` del
   documento solo dice cómo está RESUELTO el tema ahora mismo: si la cuenta
   guarda "system" y el navegador va en claro, partir de ahí y "restaurar" en
   claro writing "light" convierte una preferencia en otra distinta. La
   preferencia guardada es lo que hay que devolver intacto. */
const leerApariencia = async () => {
  const r = await api("GET", "/api/settings");
  const j = await r.json();
  return j?.data ?? j;
};

/* La geometría de un elemento. Recibe una EXPRESIÓN que devuelve el elemento
 * o null, no un selector: aquí el elemento se localiza por su texto y un
 * `querySelector` de etiqueta no llegaría. Devuelve null si no está, que no es
 * un fallo sino que la escena no cargó y hay que decirlo por separado. */
const MEDIR = (expresion) => `(() => {
  const e = ${expresion};
  if (!e || e.nodeType !== 1) return null;
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  const rango = document.createRange();
  rango.selectNodeContents(e);
  const rects = [...rango.getClientRects()].filter(x => x.width > 0 && x.height > 0);
  /* El fondo de la CAJA DE TEXTO, no el borde exterior: el padding daría unos
     píxeles de aire falso y un recorte de 2px pasaría por bueno. */
  const fondo = r.bottom - parseFloat(cs.paddingBottom || '0');
  const ultima = rects.length ? rects[rects.length - 1] : null;
  return {
    texto: (e.textContent || '').trim(),
    lineClamp: cs.webkitLineClamp || 'none',
    textOverflow: cs.textOverflow,
    overflowY: cs.overflowY,
    lineas: rects.length,
    /* Positivo = la última línea se sale de su caja = texto cortado. */
    desbordePx: ultima ? Math.round(ultima.bottom - fondo) : null,
    alto: Math.round(r.height),
    ancho: Math.round(r.width),
    scrollVertical: e.scrollHeight - e.clientHeight,
    scrollHorizontal: e.scrollWidth - e.clientWidth,
  };
})()`;

/* Los dos textos se localizan por su contenido y no por un índice de la
 * rejilla: el orden depende de la fecha de cada formulario, así que "la
 * tarjeta 0" puede ser otra cosa en otra ejecución, y medir la equivocada
 * daría verde en falso. */
const BUSCAR_TITULO = `[...document.querySelectorAll('button')].find(e => (e.textContent || '').trim() === ${JSON.stringify(TITULO)}) || null`;
const BUSCAR_DESCRIPCION = `[...document.querySelectorAll('p')].find(e => (e.textContent || '').trim() === ${JSON.stringify(DESCRIPCION)}) || null`;

/* En el builder los dos textos son campos EDITABLES, no texto pintado: viven
   en el `value` de un <textarea>, no en su `textContent` (que viene vacío).
   Un Range sobre el value no existe, así que aquí la medida no puede ser la
   geometría de las líneas: se mide si el campo CRECIÓ para acomodar a su
 *   contenido, que es justo lo que hace el autogrow, y si queda scroll por dentro.
 *   `scrollHeight > clientHeight` en un textarea autoajustado es la prueba de
 *   que el texto no cabe en la caja: es el mismo fallo que en la tarjeta, con
 *   otra forma. */
const MEDIR_CAMPO = (expresion) => `(() => {
  const e = ${expresion};
  if (!e || e.nodeType !== 1) return null;
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  /* La altura de UNA línea, medida de verdad: permite comprobar que la caja
     tiene al menos la altura del texto y no una fija que lo recorte. */
  const lh = parseFloat(cs.lineHeight) || 20;
  return {
    texto: (e.value || '').trim(),
    etiqueta: e.tagName,
    lineClamp: cs.webkitLineClamp || 'none',
    lineas: Math.round((r.height - parseFloat(cs.paddingTop || '0') - parseFloat(cs.paddingBottom || '0')) / lh),
    lineasTexto: Math.ceil((e.value || '').length / Math.max(1, Math.floor(r.width / (lh * 0.5)))),
    alto: Math.round(r.height),
    ancho: Math.round(r.width),
    scrollVertical: e.scrollHeight - e.clientHeight,
    scrollHorizontal: e.scrollWidth - e.clientWidth,
    resize: cs.resize,
  };
})()`;

/* Los dos textarea de la tarjeta del builder, por su valor y por su tamaño de
 * fuente: el título va en text-2xl y la descripción en text-sm, así que el
 * orden en el DOM (y el tamaño) los distinguen sin depender de la posición. */
const CAMPO_TITULO = `[...document.querySelectorAll('textarea')].find(e => (e.value || '').trim() === ${JSON.stringify(TITULO)}) || null`;
const CAMPO_DESCRIPCION = `[...document.querySelectorAll('textarea')].find(e => (e.value || '').trim() === ${JSON.stringify(DESCRIPCION)}) || null`;

const ANCHOS = [
  { nombre: "movil", w: 390, h: 844, mobile: true },
  { nombre: "tablet", w: 768, h: 1024, mobile: false },
  { nombre: "escritorio", w: 1440, h: 900, mobile: false },
];

(async () => {
  let fallos = 0, mediciones = 0;
  const avisar = (m) => { console.log(`  FALLO   ${m}`); fallos++; };
  const ok = (m) => console.log(`  OK      ${m}`);

  /* `questions`, no `fields`: createForm pasa el cuerpo a la base tal cual, sin
     normalizar, así que lo que no venga en `questions` no existe. Con `fields`
     el formulario salía con cero preguntas — y esta sonda no se enteraba,
     porque solo mide el título y la descripción de la tarjeta. */
  const creado = await api("POST", "/api/forms", { title: TITULO, description: DESCRIPCION, questions: CAMPOS });
  const cuerpo = await creado.json();
  const formId = cuerpo?.data?.form?._id || cuerpo?.data?._id || cuerpo?.data?.id;
  if (!formId) {
    console.log(`No se pudo crear el formulario de prueba (HTTP ${creado.status}): ${JSON.stringify(cuerpo).slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`Formulario de prueba: ${formId}\n`);

  try {
    const list = await (await fetch(`${WS}/json/list`)).json();
    const page = list.find((x) => x.type === "page");
    if (!page) throw new Error("no hay ninguna pestaña de página en el Chrome de depuración");
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

    await send("Page.navigate", { url: APP + homePath(IDIOMA) });
    await wait(3500);
    /* El idioma se fija en localStorage además de en la URL: si la app arranca en
       inglés toma sus rutas del alias inglés, y estas escenas pedirían páginas
       que en español no existen. */
    await ev(`try {
      localStorage.setItem('formly_token', ${JSON.stringify(TOKEN)});
      localStorage.setItem('formly_language', ${JSON.stringify(IDIOMA)});
    } catch (e) {} 1`);

    const estaOscuro = () => ev(`document.documentElement.classList.contains('dark')`);
    const aparienciaOriginal = await leerApariencia();
    const temaGuardado = aparienciaOriginal?.theme;
    if (!["system", "dark", "light"].includes(temaGuardado))
      throw new Error(`no se pudo leer el tema guardado de la cuenta (venía "${temaGuardado}"); no se mide nada para no dejar la cuenta a oscuras`);

    /* El tema se pone PULSANDO el botón de la cabecera, no escribiendo
     * localStorage: PreferencesSync reimpone el tema desde la cuenta en cada
     * carga, así que lo escrito a mano se pierde antes de medir. Y el ciclo
     * del botón es Sistema → Oscuro → Claro, no un interruptor: hay que
     * pulsarlo hasta que quede en el que se busca, con tope de 3 intentos. */
    const ponerTema = async (querido) => {
      for (let i = 0; i < 3; i++) {
        if (((await estaOscuro()) ? "oscuro" : "claro") === querido) return true;
        await ev(`(() => {
          const b = document.querySelector('button[aria-label="Cambiar tema"], button[aria-label="Toggle theme"]');
          if (!b) return 0; b.click(); return 1;
        })()`);
        await wait(900);
      }
      return ((await estaOscuro()) ? "oscuro" : "claro") === querido;
    };

    for (const tema of ["claro", "oscuro"]) {
      for (const anc of ANCHOS) {
        await send("Emulation.setDeviceMetricsOverride", { width: anc.w, height: anc.h, deviceScaleFactor: 1, mobile: anc.mobile });
        await send("Page.navigate", { url: APP + FORMULARIOS });
        await wait(4000);
        if ((await ev(`location.pathname`)) !== FORMULARIOS) {
          await send("Page.navigate", { url: APP + FORMULARIOS });
          await wait(4000);
        }
        if ((await ev(`location.pathname`)) !== FORMULARIOS) { avisar(`${tema}/${anc.nombre}: ${FORMULARIOS} no cargó`); continue; }
        if (!(await ponerTema(tema))) { avisar(`${tema}/${anc.nombre}: no se pudo poner el tema ${tema}`); continue; }
        await wait(600);

        const [t, d] = await Promise.all([ev(MEDIR(BUSCAR_TITULO)), ev(MEDIR(BUSCAR_DESCRIPCION))]);
        if (!t && !d) { avisar(`${tema}/${anc.nombre}: la card de prueba no está en la rejilla`); continue; }

        console.log(`\n════════ ${tema} · ${anc.nombre} (${anc.w}px) ════════`);

        /* La misma comprobación en el BUILDER, que es donde el texto se
         * escribe. Va en la misma pasada porque comparte viewport y tema: el
         * builder tiene su propia cabecera y sus propios anchos, y medirlo
         * aparte con otro viewport es medir otra escena. */
        await send("Page.navigate", { url: `${APP}${builderPath(IDIOMA, formId)}` });
        await wait(5000);
        if (!String(await ev(`location.pathname`)).startsWith(`${panelBase(IDIOMA)}/constructor/`)) {
          avisar(`${tema}/${anc.nombre}: el builder no cargó (${await ev(`location.pathname`)})`);
        } else {
          const [bt, bd] = await Promise.all([ev(MEDIR_CAMPO(CAMPO_TITULO)), ev(MEDIR_CAMPO(CAMPO_DESCRIPCION))]);
          if (!bt && !bd) avisar(`${tema}/${anc.nombre} · builder: no se encontraron los dos campos de título y descripción`);
          for (const [quien, m] of [["titulo", bt], ["descripcion", bd]]) {
            const antes = fallos;
            if (!m) { avisar(`${tema}/${anc.nombre} · builder: no se encontró el ${quien}`); continue; }
            mediciones++;
            if (m.etiqueta !== "TEXTAREA") avisar(`${tema}/${anc.nombre} · builder: el ${quien} es un <${m.etiqueta}>, que es de una línea y no puede mostrar un texto largo`);
            if (m.texto.length < 60) avisar(`${tema}/${anc.nombre} · builder: el ${quien} no llega entero al campo ("${m.texto.slice(0, 40)}…")`);
            /* El núcleo: si queda scroll por dentro, el texto no cabe entero. */
            if (m.scrollVertical > 1) avisar(`${tema}/${anc.nombre} · builder: el ${quien} tiene ${m.scrollVertical}px de texto sin mostrar`);
            if (m.scrollHorizontal > 1) avisar(`${tema}/${anc.nombre} · builder: el ${quien} desborda ${m.scrollHorizontal}px en horizontal`);
            if (m.lineas < 2) avisar(`${tema}/${anc.nombre} · builder: el ${quien} mide una sola línea de alto (${m.alto}px) para un texto de ${m.texto.length} caracteres: no está creciendo`);
            if (fallos === antes) ok(`builder · ${quien}: ${m.lineas} línea(s) de alto, texto entero (${m.alto}px)`);
            console.log(`           ${m.etiqueta} lineas=${m.lineas} alto=${m.alto}px ancho=${m.ancho}px scrollV=${m.scrollVertical} scrollH=${m.scrollHorizontal}`);
          }
          /* La barra superior del builder: es un <input> de una línea y eso es
             correcto (barra de altura fija), pero su texto tiene que poder
             consultarse entero, y para eso el atributo `title`. */
          const barra = await ev(`(() => {
            const e = document.querySelector('header input[title]');
            if (!e) return null;
            return { valor: e.value || '', title: e.getAttribute('title') || '' };
          })()`);
          if (!barra) avisar(`${tema}/${anc.nombre} · builder: la barra superior no expone el título completo`);
          else if (barra.title !== barra.valor) avisar(`${tema}/${anc.nombre} · builder: el title de la barra no coincide con su valor, el texto largo no se puede consultar`);
          else if (barra.valor !== TITULO) avisar(`${tema}/${anc.nombre} · builder: la barra muestra un título que no es el de prueba`);
          else if (fallos === 0) ok("builder · barra: el título se puede consultar entero con el tooltip");
        }
        /* De vuelta a la rejilla para el resto de la pasada. */
        await send("Page.navigate", { url: APP + FORMULARIOS });
        await wait(3500);

        /* El `antes` de cada bloque cuenta solo SUS fallos: si no se hiciera
         * así, un fallo de la tarjeta de al lado tacharía el OK de esta y el
         * informe mentiría sobre qué está roto. */
        for (const [quien, m] of [["titulo", t], ["descripcion", d]]) {
          const antes = fallos;
          if (!m) { avisar(`${tema}/${anc.nombre}: no se encontró el ${quien} en el DOM`); continue; }
          mediciones++;

          if (m.texto.length < 60) avisar(`${tema}/${anc.nombre}: el ${quien} llega truncado al DOM ("${m.texto.slice(0, 40)}…")`);
          if (m.lineClamp !== "none") avisar(`${tema}/${anc.nombre}: el ${quien} declara line-clamp=${m.lineClamp}`);
          if (m.textOverflow === "ellipsis") avisar(`${tema}/${anc.nombre}: el ${quien} declara text-overflow: ellipsis`);
          /* +1px de tolerancia: al redondear bordes a píxeles enteros aparece
             un desfase fraccionario que no es recorte. */
          if (m.desbordePx !== null && m.desbordePx > 1) avisar(`${tema}/${anc.nombre}: el ${quien} se sale ${m.desbordePx}px de su caja (texto cortado)`);
          if (m.scrollVertical > 1) avisar(`${tema}/${anc.nombre}: el ${quien} tiene ${m.scrollVertical}px de contenido sin mostrar`);
          if (m.scrollHorizontal > 1) avisar(`${tema}/${anc.nombre}: el ${quien} desborda ${m.scrollHorizontal}px en horizontal`);

          if (fallos === antes) ok(`${quien}: ${m.lineas} línea(s) completa(s) en ${m.ancho}px de ancho`);
          console.log(`           clamp=${m.lineClamp} overflowY=${m.overflowY} lineas=${m.lineas} holgura=${-m.desbordePx}px alto=${m.alto}px`);
        }

        /* El pie: la fila de métricas lleva `mt-auto`, así que debe caer a la
         * misma altura en todas las tarjetas de la misma fila de la rejilla.
         * Se agrupa por `top` de la tarjeta, que es lo que define la fila. */
        const filas = await ev(`(() => {
          const cards = [...document.querySelectorAll('.grid > *')]
            .filter(c => c.querySelector('.mt-auto'));
          const agrupadas = {};
          for (const c of cards) {
            const pie = c.querySelector('.mt-auto');
            if (!pie) continue;
            const fila = Math.round(c.getBoundingClientRect().top / 30);
            (agrupadas[fila] = agrupadas[fila] || []).push(Math.round(pie.getBoundingClientRect().top));
          }
          return Object.entries(agrupadas)
            .filter(([, tops]) => tops.length > 1)
            .map(([fila, tops]) => ({ fila, n: tops.length, tops }));
        })()`);

        if (!filas || !filas.length) {
          console.log(`  NEUTRA  ${tema}/${anc.nombre}: no hay dos tarjetas en la misma fila, el pie no se puede comparar`);
        } else {
          const antes = fallos;
          for (const f of filas) {
            const min = Math.min(...f.tops), max = Math.max(...f.tops);
            if (max - min > 2) avisar(`${tema}/${anc.nombre}: el pie de la fila ${f.fila} va de ${min} a ${max}px (${f.n} tarjetas desalineadas)`);
          }
          if (fallos === antes) for (const f of filas) ok(`pie de la fila ${f.fila} alineado en ${f.n} tarjetas (top ${Math.min(...f.tops)}px)`);
        }
      }
    }

    /* Restaurar la preferencia, no el color de esta pantalla. El ciclo del
       botón es Sistema → Oscuro → Claro y la clase `dark` no distingue "system"
       de "light", así que dar pulsaciones hasta "parece" el de antes puede
       dejar "light" donde la cuenta guardaba "system". Se devuelven las dos
       copias de la preferencia —localStorage, que es lo que lee ThemeContext al
       arrancar, y la cuenta, que es lo que reimpone PreferencesSync— y luego
       se RECARGA y se comprueba contra lo que había. */
    await ev(`try { localStorage.setItem('formly_theme_v2', ${JSON.stringify(temaGuardado)}); } catch (e) {} 1`);
    const parche = await api("PATCH", "/api/settings/appearance", { theme: temaGuardado });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: APP + FORMULARIOS });
    await wait(4000);
    const guardadoAhora = (await leerApariencia())?.theme;
    if (guardadoAhora === temaGuardado && parche.ok) {
      console.log(`\nTema de la cuenta devuelto a "${temaGuardado}" (preferencia y cuenta coinciden, verificado tras recargar).`);
    } else {
      console.log(`\n  ATENCION  el tema de la cuenta no se ha restaurado: era "${temaGuardado}", ahora "${guardadoAhora}" (HTTP ${parche.status}). Hay que devolverlo a mano.`);
      fallos++;
    }
  } finally {
    /* Aunque la sonda lance a mitad, el formulario de prueba no se queda en la
     * cuenta: ya hay 79 borradores "Formulario sin título" acumulados así. */
    const del = await api("DELETE", `/api/forms/${formId}`);
    console.log(`Formulario de prueba borrado (HTTP ${del.status}).`);
  }

  console.log(`\n${fallos === 0 ? "TODO CORRECTO" : `${fallos} FALLO(S)`} · ${mediciones} mediciones de texto`);
  process.exit(fallos === 0 ? 0 : 1);
})();
