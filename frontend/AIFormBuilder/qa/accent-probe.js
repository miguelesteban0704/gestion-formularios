/* ¿El acento del sitio llega a las superficies, y SOLO a las que debe?
 *
 * No es "cambia de color y ya". Hay dos categorías y confundirlas sería un fallo
 * de diseño, no una muestra incompleta:
 *
 *   DEBE SEGUIR AL ACENTO — el color del sitio tiene que estar presente en la
 *     card, el modal, el drawer, los botones de cristal, los campos, el fondo. Si
 *     esto no se mueve, el acento es decorativo.
 *
 *   DEBE QUEDARSE FIJO — lo que significa algo. El botón de borrar es rojo, el de
 *     confirmar es verde, un toast de error es rojo. Si estos se movieran, con un
 *     acento ámbar el botón de borrar se volvería naranja: eso no es
 *     personalizable, es perder el significado.
 *
 * El acento se cambia POR LA UI (swatch + botón de guardar), no escribiendo
 * localStorage a mano. Motivo: PreferencesSync.jsx sincroniza el acento desde el
 * perfil del servidor en cada carga, así que lo que se escriba a mano antes de
 * recargar se pierde. Pisar además --color-brand-* por inline es peor: en
 * cuanto algo re-renderiza, ThemeContext reaplica su acento y la sonda mide una
 * mezcla de dos colores en lugar de uno.
 *
 * Se recorre en claro y en oscuro, porque un tinte de marca que se apaga sobre
 * fondo oscuro es justo el fallo que hay que cazar.
 *
 * Al terminar devuelve el acento de la cuenta a Electric Cyan, su valor original.
 *
 * Uso manual (no va en CI): con el dev server en 5173, el API en 8000 y un
 * Chrome con `--remote-debugging-port=9222`:
 *   $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; node qa/accent-probe.js
 * Tarda unos 8 minutos: cambia el acento de la cuenta de QA por la UI,
 * recorre 6 escenarios en claro y oscuro, y la devuelve a Cyan/claro.
 */
const WS = "http://127.0.0.1:9222";
const APP = "https://127.0.0.1:5173";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { builderPath, designPath, homePath, panelBase, settingsPath } from "../src/lib/routes.js";

/* Las rutas se componen con los mismos constructores que usa la app, en un idioma
   fijo. Escribirlas a mano aquí fue un error: cuando la URL pasó a llevar los
   segmentos traducidos, las cuatro rutas de este fichero se quedaron viejas y las
   escenas se navigatearon a la redirección en vez de a la página. Peor: la sonda
   habría seguido midiendo, porque la redirección también carga el armazón. */
const IDIOMA = "es";

const QA_USER = "a6254c13-6b1c-4ed5-8695-742ce0f31db8";
const envText = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "..", "backend", ".env"), "utf8");
const secret = envText.match(/^JWT_SECRET=(.+)$/m)[1].trim();
const b64u = (b) => Buffer.from(b).toString("base64url");
const hh = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const now = Math.floor(Date.now() / 1000);
const pp = b64u(JSON.stringify({ id: QA_USER, iat: now, exp: now + 7200 }));
const TOKEN = `${hh}.${pp}.${crypto.createHmac("sha256", secret).update(`${hh}.${pp}`).digest("base64url")}`;

/* Cian (por defecto) contra Fucsia: los dos extremos de la paleta. Si algo no
   cambia entre ellos es que no está leyendo la marca. */
const ACENTOS = [
  { nombre: "Electric Cyan", hex: "#00D2FF" },
  { nombre: "Fuchsia", hex: "#FF007F" },
];

const SIN_TINTE = (sel, varTint) => `
  const cands = [...document.querySelectorAll('${sel}')].filter(e => {
    if (e.style.getPropertyValue('${varTint}').trim()) return false;
    return !/cr-tone-|cr-btn-(red|green|blue)/.test(e.className);
  });
  if (!cands.length) return 'AUSENTE';
  const cs = getComputedStyle(cands[0]);
  return [cs.backgroundImage, cs.backgroundColor, cs.borderTopColor, cs.color].join(' ~ ').slice(0, 300);
`;

const SNAP = `(async () => {
  const o = {};
  const cs = (e) => e ? getComputedStyle(e) : null;
  const P = (sel) => document.querySelector(sel);
  const A = (v) => v || 'AUSENTE';
  const root = document.documentElement;

  o.tema = root.classList.contains('dark') ? 'oscuro' : 'claro';
  o.acentoReal = root.style.getPropertyValue('--color-brand-500').trim() || 'AUSENTE';

  o.glassChroma = A(getComputedStyle(root).getPropertyValue('--glass-chroma').trim());
  o.bodyAura    = A(getComputedStyle(document.body).backgroundImage);

  o.cardHero  = (() => { const e = P('.bg-brand-hero'); return e ? A(cs(e).backgroundImage) : 'AUSENTE'; })();
  o.cardFondo = (() => { const e = P('.bg-brand-50.text-brand-700'); return e ? A(cs(e).backgroundColor) : 'AUSENTE'; })();
  o.cardTexto = (() => { const e = P('.bg-brand-50.text-brand-700'); return e ? A(cs(e).color) : 'AUSENTE'; })();
  o.cardBorde = (() => { const e = P('[class~="border-brand-200/60"]'); return e ? A(cs(e).borderTopColor) : 'AUSENTE'; })();

  o.crBtn   = (() => { ${SIN_TINTE('.cr-btn', '--btn-tint')} })();
  o.crChip  = (() => { ${SIN_TINTE('.cr-chip', '--chip-tint')} })();
  o.drawer  = (() => { ${SIN_TINTE('.drawer-shell', '--drawer-tint')} })();

  /* El modal de marca (sin orbe) lleva el token. Se lee el valor RESUELTO, no el
     texto de la variable: comparar "var(--color-brand-500)" consigo mismo siempre
     da igual y escondería justo el fallo que se busca. */
  o.modalAura = (() => { const e = P('.modal-shell'); if (!e) return 'AUSENTE';
    const s = document.createElement('span'); s.style.color = 'var(--modal-aura)'; e.appendChild(s);
    const v = getComputedStyle(s).color; s.remove(); return v; })();
  o.modalFondo= (() => { const e = P('.modal-shell'); return e ? A(cs(e).backgroundImage) : 'AUSENTE'; })();
  o.modalFilo = (() => { const e = P('.modal-shell .cr-hairline'); return e ? A(cs(e).backgroundImage) : 'AUSENTE'; })();

  const toast = () => [...document.querySelectorAll('.cr-toast')].find(x => /Enlace p/i.test(x.textContent));
  o.toastTinte = (() => { const t = toast(); return t ? A(t.style.getPropertyValue('--toast-tint')) : 'AUSENTE'; })();
  o.toastBorde = (() => { const t = toast(); return t ? A(cs(t).borderTopColor) : 'AUSENTE'; })();
  o.toastFilo  = (() => { const t = toast(); const h = t && t.querySelector('.cr-hairline'); return h ? A(cs(h).backgroundImage) : 'AUSENTE'; })();

  /* El input COMPARTIDO, elegido por su clase de foco: en la página hay <input>
     sueltos (el buscador del header) que no son ese componente. */
  const inputMarca = () => [...document.querySelectorAll('input, textarea, select')]
    .find(x => /focus:border-brand-400/.test(x.className));
  o.campoReposo = (() => { const e = inputMarca(); return e ? A(cs(e).borderTopColor) : 'AUSENTE'; })();
  /* El foco se lee DESPUES de la transicion (transition-all 200ms): leerlo en
     el mismo tick devuelve el borde en reposo en los dos arranques y parece
     que el foco no sigue a la marca. Y la sombra se lee ENTERA: el anillo
     vive al final (0px 0px 0px 4px con el color de marca) y cortarla a 110
     caracteres lo decapitaba justo antes del color. */
  o.campoFoco   = await (async () => { const e = inputMarca(); if (!e) return 'AUSENTE';
    try { e.scrollIntoView({ block: 'center' }); } catch (_) {}
    e.focus();
    if (!e.matches(':focus')) return 'SIN-FOCO';
    await new Promise(r => setTimeout(r, 650));
    return cs(e).borderTopColor + ' | ' + cs(e).boxShadow; })();
  o.dtpAcent   = A(getComputedStyle(root).getPropertyValue('--dtp-accent').trim());

  o.semPeligro = (() => { const e = P('.cr-btn-red, .modal-foot--danger'); return e ? A(cs(e).backgroundImage) : 'AUSENTE'; })();
  o.semOk      = (() => { const e = P('.cr-btn-green'); return e ? A(cs(e).backgroundImage) : 'AUSENTE'; })();
  o.semToneEsm = (() => { const e = P('[class*="cr-tone-emerald"]'); return e ? A(cs(e).borderTopColor) : 'AUSENTE'; })();
  o.semError   = (() => { const e = P('[class*="cr-tone-error"]'); return e ? A(cs(e).borderTopColor) : 'AUSENTE'; })();
  return o;
})()`;

/* Sin crChip a proposito: todos los .cr-chip de la app llevan --chip-tint en
   linea, asi que "chip sin tinte" no tiene ninguna instancia medible y el
   check mentiria en verde por ausencia. La receta (el fallback a
   --glass-chroma) la cubre la auditoria estatica + el propio glassChroma. */
const DEBE = ["glassChroma","bodyAura","cardHero","cardFondo","cardTexto","cardBorde","crBtn","drawer","modalAura","modalFondo","modalFilo","campoFoco","dtpAcent"];
const FIJA = ["semPeligro","semOk","semToneEsm","semError","toastTinte","toastBorde","toastFilo"];

const porTexto = (re) => `(() => { const b=[...document.querySelectorAll('button')].find(e=>${re}.test((e.textContent||'').trim())); if(!b) return 0; b.click(); return 1; })()`;
/* Por regex y no por substring: el aria-label es "Menú" (con tilde) en ES y
   "Menu" en EN; buscar "enu" no casa con ninguno y el drawer no se abría. */
const porAriaRe = (re) => `(() => { const b=[...document.querySelectorAll('button[aria-label]')].find(e=>${re}.test(e.getAttribute('aria-label')||'')); if(!b) return 0; b.click(); return 1; })()`;

/* La raiz del contenido de Ajustes: el hermano siguiente al <aside> de
   secciones. Todo lo de abajo busca dentro de ella, no en la pagina entera,
   porque el encabezado tiene un toggle de tema con texto parecido ("Modo
   sistema") y un selector de idioma con los mismos botones Es/En que la
   seccion de apariencia. */
/* Todo devuelve 0/1 numerico. Si /settings no ha cargado (navegacion que no ha
   cuajado, viewport movil heredado de la escena anterior), el aside es null:
   antes eso lanzaba dentro de Runtime.evaluate y abortaba la sonda entera a
   mitad, dejando la cuenta en Fucsia. Ahora es un ATENCION y se sigue. */
const RAIZ_SEGURA = `(document.querySelector('aside[aria-label="Secciones de ajustes"]') || {}).parentElement`;
const enRaiz = (re) => `(() => { const r=${RAIZ_SEGURA}; if(!r || !r.querySelectorAll) return 0; const b=[...r.querySelectorAll('button')].find(e=>${re}.test((e.textContent||'').trim())); if(!b) return 0; b.click(); return 1; })()`;

/* Sin "Sistema" a proposito: si el tema queda en "system" el color depende de
   la preferencia del navegador y la lectura deja de ser comparable. */
const TEMAS = { light: /^(Claro|Light)$/i, dark: /^(Oscuro|Dark)$/i };
const GUARDAR = enRaiz("/Guardar cambios|Save changes/");
const PESTAÑA_APARIENCIA = `(() => {
  const a=document.querySelector('aside[aria-label="Secciones de ajustes"]');
  if(!a) return 0;
  const b=a.querySelectorAll('button')[1];
  if(!b) return 0;
  b.click();
  return 1;
})()`;

const ESCENAS = [
  { ruta: homePath(IDIOMA), etiqueta: "panel · cards", pasos: [] },
  { ruta: settingsPath(IDIOMA), etiqueta: "ajustes", pasos: [PESTAÑA_APARIENCIA] },
  /* El constructor con "new" crea un borrador y salta al borrador con su id:
     exigir el pathname exacto marcaba la escena como "no cargo" cuando sí había
     cargado. (Y sí: cada visita deja un borrador en la cuenta de QA; es
     un borrador, no una publicación.) */
  { ruta: builderPath(IDIOMA, "new"), etiqueta: "builder · campos", pasos: [], carga: `${panelBase(IDIOMA)}/constructor/` },
  { ruta: designPath(IDIOMA), etiqueta: "modal",
    pasos: [porTexto("/^Modal default$/i")] },
  /* Con orbe, y no solo el de arriba a propósito: durante un tiempo el aura del
     diálogo salía de `orb.props.style["--cr-orb"]`, así que un orbe con un hex
     fijo —el de Compartir, el del generador de IA— pintaba el modal entero de
     ese color y la escena "modal" pasaba en verde sin llegar a mirarlo. Esta
     escena mide el shell en el caso que lo provocaba. */
  { ruta: designPath(IDIOMA), etiqueta: "modal con orbe",
    pasos: [porTexto("/^Modal con orbe$/i")] },
  { ruta: designPath(IDIOMA), etiqueta: "toast + splash",
    pasos: [porTexto("/^Info$/"), porTexto("/^Splash/i")] },
  { ruta: homePath(IDIOMA), etiqueta: "drawer móvil", pasos: [porAriaRe("/menú|menu/i")], movil: true },
];

(async () => {
  const list = await (await fetch(`${WS}/json/list`)).json();
  const page = list.find((x) => x.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  const send = (m, p = {}) => new Promise((r) => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })); });
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
  const ev = async (x) => {
    const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("expresion rota: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  };
  await send("Page.enable"); await send("Runtime.enable");
  /* Sin esto, :focus no casa en headless aunque el elemento sea el
     activeElement (el documento no tiene foco y Chromium no aplica la
     pseudoclase). El campo medía su borde en reposo en los dos arranques y
     parecía que el foco no seguía a la marca, cuando lo que no había era foco. */
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Emulation.clearDeviceMetricsOverride");

  await send("Page.navigate", { url: APP + homePath(IDIOMA) });
  await wait(4000);
  /* El idioma se fija en localStorage, no solo en la URL: si la app arranca en
     inglés (por una preferencia guardada de otra sonda) toma sus rutas del
     alias inglés, y estas escenas pedirían páginas que no existen en es. */
  await ev(`try {
    localStorage.setItem('formly_token', ${JSON.stringify(TOKEN)});
    localStorage.setItem('formly_language', ${JSON.stringify(IDIOMA)});
  } catch (e) {} 1`);

  /* Cambia acento y tema por la UI y los guarda. El orden importa: los ajustes
     abren en la pestaña "identity" y el selector de acento solo se monta en la
     de "appearance", asi que sin abrirla no hay ningun swatch que pulsar.
     Tampoco vale con escribir localStorage: PreferencesSync reimpone tema y
     acento desde el perfil del servidor en cada carga, asi que lo escrito a
     mano se pierde antes de la siguiente medicion. */
  const AJUSTES = settingsPath(IDIOMA);
  const ponerAcento = async (nombre, tema) => {
    /* La escena del drawer deja el viewport en movil; sin resetearlo, Ajustes
       carga su layout estrecho y la sonda mide otra cosa. */
    await send("Emulation.clearDeviceMetricsOverride");
    await send("Page.navigate", { url: APP + AJUSTES });
    await wait(7000);
    const r = { pestana: 0, tema: 0, swatch: 0, guardar: 0 };
    if ((await ev(`location.pathname`)) !== AJUSTES) {
      await send("Page.navigate", { url: APP + AJUSTES });
      await wait(7000);
    }
    if ((await ev(`location.pathname`)) !== AJUSTES) return r;
    r.pestana = await ev(PESTAÑA_APARIENCIA);
    await wait(1400);
    r.tema = await ev(enRaiz(TEMAS[tema]));
    await wait(700);
    r.swatch = await ev(`(() => { const root=(${RAIZ_SEGURA}) || document; const q=(n)=>root.querySelector?root.querySelector(n):null; const b=q('button[title="${nombre}"]') || document.querySelector('button[title="${nombre}"]'); if(!b) return 0; b.click(); return 1; })()`);
    await wait(1200);
    r.guardar = await ev(GUARDAR);
    await wait(3200);
    return r;
  };

  const medir = async ({ ruta, pasos, movil, carga }) => {
    await send("Emulation.setDeviceMetricsOverride",
      { width: movil ? 480 : 1440, height: 900, deviceScaleFactor: 1, mobile: !!movil });
    await send("Page.navigate", { url: APP + ruta });
    await wait(6500);
    /* Las cargas fallan de vez en cuando (la pagina no llega a la ruta: el
       guarda de auth rebota a /login o la navegacion no cuaja). Antes se
       media la pagina equivocada sin avisar: los clics daban 0 y las
       superficies salian "--", que parece "no hay nada que medir" cuando lo
       que hay es "no se cargo". Se reintenta una vez y si ni asi, se marca. */
    const llego = async () => {
      const p = await ev(`location.pathname`);
      return carga ? String(p).startsWith(carga) : p === ruta;
    };
    let ok = await llego();
    if (!ok) {
      await send("Page.navigate", { url: APP + ruta });
      await wait(6500);
      ok = await llego();
    }
    let n = 0;
    for (const p of pasos) { n += (await ev(p)) || 0; await wait(1300); }
    return { n, ok, snap: ok ? ((await ev(SNAP)) || {}) : {} };
  };

  let fallos = 0, medidos = 0, sigs = 0, fijas = 0;

  /* El finally no es opcional: esta sonda deja la cuenta de QA en Fucsia/oscuro
     a mitad, y si algo lanza a la primera de cuatrocientas lecturas la cuenta
     se queda así y parece que el fallo es de la app cuando es de la sonda. */
  try {
  for (const tema of ["light", "dark"]) {
    const porEscena = {};
    for (const { nombre } of ACENTOS) {
      const r = await ponerAcento(nombre, tema);
      if (!r.pestana || !r.tema || !r.swatch || !r.guardar)
        console.log(`  ATENCION  no se pudo aplicar ${nombre}/${tema} (pestana ${r.pestana}, tema ${r.tema}, swatch ${r.swatch}, guardar ${r.guardar})`);
      for (const esc of ESCENAS) {
        const { n, ok, snap } = await medir(esc);
        if (!ok) console.log(`  ATENCION  ${esc.etiqueta}: la pagina no cargo (${esc.ruta}), lo de abajo no vale`);
        porEscena[`${nombre}|${esc.etiqueta}`] = { n, ok, snap };
      }
    }

    for (const esc of ESCENAS) {
      const a = porEscena[`Electric Cyan|${esc.etiqueta}`];
      const b = porEscena[`Fuchsia|${esc.etiqueta}`];
      const antes = a.snap, despues = b.snap;
      console.log(`\n════════ ${tema} · ${esc.etiqueta} (botones ${a.n}/${b.n}) ════════`);

      const err = [];
      if (antes.tema !== despues.tema) err.push(`tema no estable (${antes.tema} -> ${despues.tema})`);
      if (antes.acentoReal === despues.acentoReal) err.push(`el acento NO cambio: ${antes.acentoReal} -> ${despues.acentoReal}`);
      for (const e of err) { console.log(`  ATENCION  ${e}`); fallos++; }

      const valor = (k) => {
        const x = antes[k], y = despues[k];
        if (!x || !y || x === "AUSENTE" || y === "AUSENTE") return null;
        return [x, y];
      };
      for (const k of DEBE) {
        const v = valor(k);
        if (v === null) { console.log(`  --   ${k} (no medida de forma estable)`); continue; }
        /* Las dos lecturas en `none`: la superficie no existe en ese tema (el
           aura del fondo solo vive en oscuro, en claro es fondo plano por
           diseño). Pedirle que "siga" a algo que no esta seria un falso fallo. */
        if (v[0] === "none" && v[1] === "none") { console.log(`  NEUTRA + ${k} (no existe en este tema por diseño)`); continue; }
        if (v[0] === "SIN-FOCO" || v[1] === "SIN-FOCO") { console.log(`  ATENCION  ${k}: el foco no se aplico, la medida no vale`); fallos++; continue; }
        medidos++;
        const ok = v[0] !== v[1];
        if (ok) sigs++; else fallos++;
        console.log(`  ${ok ? "SIGUE  +" : "FRIO  x"} ${k}`);
        if (!ok) console.log(`         ${String(v[0]).slice(0, 115)}`);
      }
      for (const k of FIJA) {
        const v = valor(k);
        if (v === null) continue;
        medidos++;
        const ok = v[0] === v[1];
        if (ok) fijas++; else fallos++;
        console.log(`  ${ok ? "FIJA   +" : "SE MUEVE  x"} ${k}`);
        if (!ok) console.log(`         ${String(v[0]).slice(0, 115)}`);
      }
      const rep = valor("campoReposo");
      if (rep) {
        medidos++;
        const ok = rep[0] === rep[1];
        console.log(`  ${ok ? "NEUTRA +" : "se tiñó  x"} campoReposo (borde en reposo, neutro por diseño)`);
        if (!ok) fallos++;
      }
    }
  }

  } finally {
    await send("Emulation.clearDeviceMetricsOverride");
    console.log("\n── devolviendo el acento de la cuenta a Electric Cyan ──");
    try {
      const res = await ponerAcento("Electric Cyan", "light");
      console.log(`  pestana ${res.pestana}, tema ${res.tema}, swatch ${res.swatch}, guardar ${res.guardar}`);
      const fin = (await ev(`(() => getComputedStyle(document.documentElement).getPropertyValue('--color-brand-500').trim())()`));
      console.log(`  acento final: ${fin}${String(fin).toLowerCase() === "#00d2ff" ? "" : "   <-- NO ha vuelto a Cyan"}`);
    } catch (e) {
      console.log(`  no se pudo devolver: ${e.message}`);
    }
  }

  console.log(`\n-----------------------------------------`);
  console.log(`medidas: ${medidos}  ·  siguen al acento: ${sigs}  ·  se mantienen fijas: ${fijas}`);
  if (medidos === 0) { console.log("FALLO: la sonda no midio ninguna superficie"); ws.close(); process.exit(1); }
  console.log(fallos === 0 ? "TODO CORRECTO" : `${fallos} FALLOS`);
  ws.close(); process.exit(0);
})();
