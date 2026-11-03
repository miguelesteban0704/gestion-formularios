/* ¿Queda algún color de marca escrito a fuego donde debería haber un token?
 *
 * El acento vive en --color-brand-*. Si una superficie del sistema lleva un
 * hex, cambiar el acento desde Ajustes no la repinta y el acento pasa a ser
 * decorativo: se puede poner en Rose y el botón se queda teal sin que nada
 * avise.
 *
 * No basta con buscar el hex del acento por defecto. Los freezes que
 * importan son cualquier color de la familia (teal-*, #0f9c88, #0c8b7c,
 * #14b8a6...) y los degradados rgba()/oklch() derivados de ella, porque lo
 * que se busca no es "el mismo teal" sino "un color escrito donde debería
 * haber una escala".
 *
 * Y hay un segundo conjunto, igual de importante: los colores SEMÁNTICOS
 * (rojo de error, verde de éxito, ámbar de aviso) NO deben seguir al acento.
 * Si un archivo pinta un rojo de la familia de marca para decir "error", con
 * acento ámbar el botón de borrar se volvería naranja. Eso no es
 * personalizable, es perder el significado.
 *
 * Se escapan a proposito y se listan: son temas del formulario, no del sitio,
 * o son identidad de serie en un gráfico.
 *
 * Uso: `npm run qa:brand` (sale 1 si hay algo congelado). No necesita
 * servidores: solo lee ficheros.
 */
import fs from "fs";
import path from "path";

const RAIZ = path.join(import.meta.dirname, "..", "src");
const LEGIBLES = new Set([".js", ".jsx", ".css", ".ts", ".tsx"]);

const walked = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (LEGIBLES.has(path.extname(e.name))) walked.push(p);
  }
};
walk(RAIZ);

/* Lo que NO es un fallo, con el motivo. Un escabe sin motivo es una excusa
   para no arreglarlo; estas son decisiones. */
const EXCEPCIONES = [
  { f: "lib/themes.js", r: /teal|brand|accent/i, m: "temas del FORMULARIO que el usuario diseña, no del sitio" },
  { f: "components/settings/SettingsPanel.jsx", r: /teal|brand|accent/i, m: "paleta de acento del FORMULARIO, no del sitio" },
  { f: "lib/charts.js", r: /teal|#[0-9a-f]{6}/i, m: "data-viz: identidad de serie" },
  { f: "components/analytics/PrismTopForms.jsx", r: /teal|#[0-9a-f]{6}/i, m: "data-viz" },
  { f: "components/analytics/FuturisticTooltip.jsx", r: /#[0-9a-f]{6}/i, m: "data-viz" },
  { f: "components/showcase/crystal.css", r: /#[0-9a-f]{6}/i, m: "hoja propia de /design, identidad propia" },
  { f: "components/analytics/InsightKpis.jsx", r: /teal/i, m: "identidad de serie emparejada con CHART.teal (tiles compartidos super_admin + entity_admin)" },
  { f: "components/analytics/Charts.jsx", r: /teal|#0e9384|#2ec4b6/i, m: "NO SE IMPORTA: ningun fichero lo trae. Las app reales usan Prism*.jsx" },
  { f: "components/analytics/KpiCard.jsx", r: /emerald|teal/, m: "solo la variante `green`: tono de serie, el `brand` ya va por token" },
  { f: "components/ui/Card.jsx", r: /emerald|teal/, m: "variantes no-brand de StatCard (tonos de serie)" },
  { f: "components/showcase/CrystalVision.jsx", r: /emerald|teal/, m: "direccion de aspecto del showroom, no el sitio" },
  { f: "components/ui/FormFields.css", r: /./, m: "hoja MUERTA: nadie la importa" },
  { f: "index.css", r: /./, m: "aqui se DEFINE la escala de marca y los tokens semanticos" },
  { f: "lib/accent.js", r: /./, m: "aqui se DEFINE el catalogo de acentos" },
  { f: "lib/templates.js", r: /teal|emerald/, m: "plantillas de formulario, tema propio de cada plantilla" },
  { f: "components/builder/SettingsPanel.jsx", r: /./, m: "paleta de acento del FORMULARIO, no del sitio" },
  { f: "components/public/FieldRenderer.jsx", r: /0c8b7c/, m: "acento POR DEFECTO del form (viene de form.settings, no del sitio)" },
  { f: "components/public/FormArtPanel.jsx", r: /0c8b7c/, m: "idem: el arte del form usa el acento de ESE form" },
];

/* Un archivo que no se importa no puede congelar nada: no llega a pintarse.
   Se comprueba de verdad, no se da por supuesto, porque un archivo muerto que
   el check declara correcto es un archivo que vuelve con el teal dentro. */
/* El alcance anterior solo veia imports estaticos y declaraba muertos a
   ficheros que las rutas cargan con React.lazy(() => import(...)). Un
   archivo muerto que el check declara correcto es un archivo que vuelve con
   el teal dentro, asi que el grafo incluye import() dinamico y re-exports. */
const IMPORTS = [
  /^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm,
  /^\s*import\s+["']([^"']+)["']/gm,
  /export\s+[^;]*?from\s+["']([^"']+)["']/gm,
  /import\(\s*["']([^"']+)["']\s*\)/g,
  /require\(\s*["']([^"']+)["']\s*\)/g,
];
/* Aliases de vite.config: sin ellos el grafo miente. El caso que dolio:
   `sonner` NO es la libreria, es src/components/ui/Toast.jsx, asi que todos
   los `import { toast } from "sonner"` traen el sistema propio. Sin esta
   tabla la auditoria declaraba muerto al sistema de toasts entero. */
const ALIAS = {
  "sonner": "components/ui/Toast.tsx",
};
const resuelto = (imp, desde) => {
  if (imp === "sonner" || imp.startsWith("sonner/")) {
    const f = path.join(RAIZ, ALIAS.sonner);
    return fs.existsSync(f) ? f : undefined;
  }
  if (imp === "@" || imp.startsWith("@/")) {
    const base = path.join(RAIZ, imp.slice(2));
    for (const c of [base, base + ".js", base + ".jsx", base + ".ts", base + ".tsx", base + ".css", path.join(base, "index.js"), path.join(base, "index.jsx")]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
    return undefined;
  }
  if (!imp.startsWith(".")) return null;
  const base = path.resolve(path.dirname(desde), imp);
  for (const c of [base, base + ".js", base + ".jsx", base + ".ts", base + ".tsx", path.join(base, "index.js"), path.join(base, "index.jsx")]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return undefined;
};
/* Alcance TRANSITIVO desde la entrada. Mirar solo quién importa a quién no
   basta: un fichero importado solo por otro fichero muerto tampoco se pinta.
   El grafo se recorre desde main.jsx, que es lo que monta la app. */
const ENTRADA = path.join(RAIZ, "main.jsx");
const deps = new Map();
for (const abs of walked) {
  const src = fs.readFileSync(abs, "utf8");
  const set = new Set();
  for (const re of IMPORTS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const r = resuelto(m[1], abs);
      if (r) set.add(r);
    }
  }
  deps.set(abs, set);
}
const vivos = new Set();
const pila = [ENTRADA];
while (pila.length) {
  const f = pila.pop();
  if (!f || vivos.has(f) || !fs.existsSync(f)) continue;
  vivos.add(f);
  for (const d of deps.get(f) || []) pila.push(d);
}
const muertos = walked.filter((a) => !vivos.has(a));
console.log(`ficheros alcanzables desde main.jsx: ${vivos.size} · sin alcanzar: ${muertos.length}`);
for (const m of muertos) console.log(`  sin alcanzar  ${path.relative(RAIZ, m).replace(/\\/g, "/")}`);
console.log("");

/* Colores de la familia de marca que deben estar solo en lib/accent.js
   (el catálogo, que es donde se define el acento) y en index.css como
   definición de la escala. */
const FAMILIA = /(?:^|[\s"'`:,(])(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|decoration|outline|divide|accent|caret|decoration)-teal-|(?:#(?:0f9c88|0c8b7c|0e9384|14b8a6|2dd4bf|2ec4b6|15a18b|10b981|134e4a|0d9488|14e0b0|5eead4|99f6e4|ccfbf1|f0fdfa)\b)/i;

let fallos = 0, ok = 0;
console.log("── superficies del sistema con color de marca escrito a fuego ──\n");

for (const abs of walked) {
  const rel = path.relative(RAIZ, abs).replace(/\\/g, "/");
  const texto = fs.readFileSync(abs, "utf8");
  const lineas = texto.split(/\r?\n/);

  lineas.forEach((linea, i) => {
    // Se ignoran los comentarios: un --color-brand-400 explicado en un
    // comentario no pinta nada, y marcarlos haria que el check se ignorase
    // entero por ruido.
    const limpio = linea.replace(/\/\/.*$/, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\*.*$/, "");
    if (!FAMILIA.test(limpio)) return;

    const detalle = limpio.trim().slice(0, 96);

    if (!vivos.has(abs)) {
      ok++;
      console.log(`  MUERTO   ${rel}:${i + 1}  (no se pinta; no puede congelar nada)`);
      console.log(`            ${detalle}`);
      return;
    }

    const esc = EXCEPCIONES.find((x) => rel.endsWith(x.f) || rel === x.f);
    if (esc) {
      ok++;
      console.log(`  EXCEPCION  ${rel}:${i + 1}  (${esc.m})`);
      console.log(`            ${detalle}`);
      return;
    }
    fallos++;
    console.log(`  FROZEN  ${rel}:${i + 1}`);
    console.log(`            ${detalle}`);
  });
}

/* Segunda mitad: los semánticos no deben haberse coloreado. Si un archivo
   pinta un rojo/verde/ámbar SEMÁNTICO pero además le pone una clase de
   marca al mismo elemento, el elemento tiene dos intenciones y gana la
   última: el color de error se pierde. Se marca como conflicto, no como
   ausencia de token. */
console.log("\n── semánticos que se han colado de la marca ──\n");
const CONFLICTO = /(cr-tone-(?:error|success|warning)|cr-btn-(?:red|green|amber|blue))[\s\S]{0,220}?brand-\d/;
let conflictos = 0;
for (const abs of walked) {
  if (!vivos.has(abs)) continue;
  const rel = path.relative(RAIZ, abs).replace(/\\/g, "/");
  const texto = fs.readFileSync(abs, "utf8");
  if (!CONFLICTO.test(texto)) continue;
  conflictos++;
  console.log(`  CONFLICTO  ${rel}: elemento con tono semantico Y clase de marca`);
  console.log(`            ${texto.match(CONFLICTO)[0].replace(/\s+/g, " ").slice(0, 96)}`);
}

console.log("\n-----------------------------------------");
console.log(`congelamientos: ${fallos} · excepciones justificadas: ${ok} · conflictos semanticos: ${conflictos}`);
if (fallos === 0 && conflictos === 0) console.log("TODO CORRECTO");
else process.exit(1);
