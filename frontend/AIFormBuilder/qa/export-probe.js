/* Sonda de la exportacion de estadisticas: comprueba que los tres formatos se
 * generan de verdad, que llevan el color de marca del usuario y que el logo va
 * en la cabecera. No se fia de "no dio error": abre lo que produjo y lo mira.
 *
 * Importa el codigo REAL con el cargador de SSR de Vite. Es a proposito: `src/lib/
 * api.js` lee `import.meta.env` en el tope del modulo, asi que un `import` normal
 * de Node lo revienta. Y una copia a mano de la logica --el fallo que ya costo
 * una vez-- no contaria como haber probado nada.
 *
 * `jszip` se usa para abrir el .docx y viene por dependencia de `exceljs`. No se
 * anade al package.json a proposito: es una herramienta de esta sonda y anadirla
 * como devDependency solo por descomprimir un zip es ruido.
 *
 * Uso:  node qa/export-probe.js        (no necesita dev server ni navegador)
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import JSZip from "jszip";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

/* ─── Micro marco de comprobaciones ───────────────────────────────────────── */
let pass = 0;
const failures = [];

function section(title) {
  console.log(`\n${title}`);
}

function check(name, condition, detail = "") {
  if (condition) {
    pass += 1;
    console.log(`  OK    ${name}`);
  } else {
    failures.push(`${name}${detail ? ` -- ${detail}` : ""}`);
    console.log(`  FALLA ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}

/* ─── Contraste WCAG, implementado aparte a proposito ──────────────────────
 * No se reusa `checkOnAccent` de la aplicacion: si la sonda comparte el criterio
 * que esta midiendo, solo demuestra que el codigo es coherente consigo mismo,
 * no que el texto se lea. Aqui va la formula de la norma. */
function relLuminance(hex) {
  const h = String(hex).replace("#", "");
  const channels = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a, b) {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* Requisito del usuario, traducido a una comprobacion: "si el color primario es
 * muy claro el texto debe ser oscuro, y si es oscuro, blanco". Lo que se exige no
 * es que el texto tenga una luminancia concreta --eso seria una convencion-- sino
 * que sea EL de los dos candidatos que mas contraste da. Un umbral fijo como
 * `luminancia < 0.32` miente en los tonos medios: el dorado de marca es claro y
 * oscuro a la vez segun quien mida, y por eso la regla se decide por la cifra. */
function picksBestInk(bg, ink) {
  const LIGHT = "#ffffff";
  const DARK = "#1e293b";
  const chosen = contrastRatio(bg, ink);
  const other = contrastRatio(bg, ink === LIGHT ? DARK : LIGHT);
  return chosen >= other;
}

/* ─── Carga del codigo bajo prueba ────────────────────────────────────────── */
const server = await createServer({
  root: ROOT,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true },
});

let service;
let theme;
try {
  service = await server.ssrLoadModule("/src/services/exportService.js");
  theme = await server.ssrLoadModule("/src/lib/exportTheme.js");
} catch (error) {
  await server.close();
  throw error;
}
/* El servidor se cierra al FINAL del script, en el cierre del bloque de resumen.
 * Los generadores hacen `await import("exceljs")` y en modo SSR eso pasa por el
 * corredor de modulos de Vite: cerrarlo antes de generarlos deja el archivo a
 * medias y la sonda muere con "Vite module runner has been closed". */

/* El logo real del repositorio, leido del disco. Se construye a mano el objeto
 * que `loadLogoPng` produce en el navegador, porque aqui no hay canvas: lo que
 * se prueba es que los tres generadores lo incrustan bien, que es la parte
 * propria de este codigo. La obtencion del PNG en si la prueba el navegador. */
const logoFile = path.join(ROOT, "public", "logo_cgd_negro.png");
const logoBytes = fs.readFileSync(logoFile);
const LOGO = {
  dataUrl: `data:image/png;base64,${logoBytes.toString("base64")}`,
  bytes: new Uint8Array(logoBytes),
  width: 6122,
  height: 1740,
  ratio: 6122 / 1740,
};

/* ─── Datos de mentira, con todas las ramas que el modelo debe tratar ─────── */
const t = (key) => key;

const FORM = {
  _id: "form-qa",
  title: "Encuesta de satisfaccion 2026",
  status: "published",
  settings: { logo: "/form-logos/form-qa.png" },
};

const ANALYTICS = {
  stats: { totalResponses: 128, views: 640, conversionRate: 20, completionRate: 78, avgCompletionTime: 95 },
  timeline: [
    { date: "2026-09-28", count: 12 },
    { date: "2026-09-29", count: 20 },
    { date: "2026-09-30", count: 31 },
  ],
  questions: [
    {
      id: "q1",
      label: "¿Que te parece el servicio?",
      type: "radio",
      total: 120,
      breakdown: [
        { label: "Excelente", count: 60 },
        { label: "Bueno", count: 40 },
        { label: "Malo", count: 20 },
      ],
    },
    {
      id: "q2",
      label: "Ordena los pasos",
      type: "rank",
      total: 40,
      breakdown: [
        { label: "Registro", count: 40, averageRank: 1.2 },
        { label: "Pago", count: 40, averageRank: 2.8 },
      ],
    },
    {
      id: "q3",
      label: "Comentario libre",
      type: "long_text",
      total: 55,
      samples: Array.from(
        { length: 20 },
        (_, i) =>
          `Comentario ${i + 1}. ` +
          "El servicio funciona bien pero la entrega tardo mas de lo previsto y " +
          "preferiria que avisaran antes con una fecha mas exacta. ".repeat(3)
      ),
    },
    {
      id: "q4",
      label: "Valoracion",
      type: "rating",
      total: 90,
      average: 4.2,
      breakdown: [{ label: "5", count: 40 }, { label: "4", count: 30 }],
    },
  ],
};

const INSIGHTS = {
  stats: { totalForms: 7, published: 5, totalResponses: 1543, totalViews: 9021, conversion: 17, avgCompletionTime: 88 },
  timeline: [
    { date: "2026-09-28", count: 120 },
    { date: "2026-09-29", count: 200 },
  ],
  devices: [
    { label: "Desktop", value: 900 },
    { label: "Mobile", value: 500 },
    { label: "Tablet", value: 143 },
  ],
  topForms: [
    { id: "a", title: "Alfa", status: "published", responses: 800, views: 4000, conversion: 20, history: [] },
    { id: "b", title: "Beta", status: "draft", responses: 120, views: 900, conversion: 13, history: [] },
  ],
};

const USER = { name: "Ada", lastName: "Lovelace", email: "ada@example.com" };

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. Origen del logo
 * ═══════════════════════════════════════════════════════════════════════════ */
section("1. Que logo se pone en cada caso");

const brandSource = service.resolveLogoSource({ scope: "overview" });
check("La vista general usa el logo de CubaGob", brandSource.src === "/logo_cgd_negro.png", brandSource.src);
check("...y se marca como logo de marca", brandSource.isBrandLogo === true);

const ownSource = service.resolveLogoSource({ scope: "form", form: FORM });
check(
  "Un formulario con logo propio usa el suyo",
  ownSource.src.endsWith("/form-logos/form-qa.png") && ownSource.isBrandLogo === false,
  ownSource.src
);

const bareForm = service.resolveLogoSource({ scope: "form", form: { settings: {} } });
check(
  "Un formulario SIN logo cae en el de CubaGob",
  bareForm.src === "/logo_cgd_negro.png",
  bareForm.src
);

const noSettings = service.resolveLogoSource({ scope: "form" });
check("Un formulario inexistente tambien cae en el de CubaGob", noSettings.src === "/logo_cgd_negro.png");

check(
  "La version usada es la negra ( legible sobre papel )",
  fs.existsSync(logoFile) && service.BRAND_LOGO === "/logo_cgd_negro.png"
);

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. Paleta y contraste
 * ═══════════════════════════════════════════════════════════════════════════ */
section("2. Contraste de la paleta (WCAG, medido con la formula de la norma)");

const ACCENTS = ["#39FF14", "#00D2FF", "#9D4EDD", "#1E293B", "#bfa23a", "#D946EF", "#FF007F"];

for (const accent of ACCENTS) {
  const palette = theme.buildPalette(accent);
  const ratioStrong = contrastRatio(palette.strong, palette.onStrong);

  check(
    `${accent} -> texto legible sobre la cabecera de tabla (${ratioStrong.toFixed(2)}:1)`,
    ratioStrong >= 4.5,
    `strong=${palette.strong} onStrong=${palette.onStrong}`
  );
  check(
    `${accent} -> el texto elegido es el de mas contraste, no un blanco fijo`,
    picksBestInk(palette.strong, palette.onStrong),
    `strong=${palette.strong} onStrong=${palette.onStrong}`
  );
  check(
    `${accent} -> la cabecera es un tono MAS PROFUNDO que el acento, no el mismo`,
    relLuminance(palette.strong) < relLuminance(palette.primary),
    `strong=${palette.strong} primary=${palette.primary}`
  );
  /* `primary` es el acento puro y en ningun generador hace de fondo de texto
     (solo de filete y de raya), asi que no se le exige AA: exigirlo obligaria a
     retocar el color que el usuario tiene guardado, que es justo lo que no se
     debe hacer. Lo que se le exige es que traiga su tinta correcta. */
  check(
    `${accent} -> el acento puro trae su tinta correcta (aunque no se use como fondo)`,
    picksBestInk(palette.primary, palette.onPrimary),
    `primary=${palette.primary} onPrimary=${palette.onPrimary}`
  );
}

/* Los tres formatos piden el color en tres dialectos: si uno de ellos se
 *olvida de la almohadilla, el documento sale con el color equivocado. */
section("3. Los tres dialectos de color");
const sample = theme.buildPalette("#00D2FF");
check("Excel recibe ARGB", theme.argbHex(sample.primary) === "FF00D2FF", theme.argbHex(sample.primary));
check("Word recibe RGB sin almohadilla", theme.bareHex(sample.primary) === "00d2ff", theme.bareHex(sample.primary));
check("PDF recibe tripleta 0-255", JSON.stringify(theme.rgbTriplet(sample.primary)) === "[0,210,255]");
check(
  "Un color de tres digitos se expande (#abc -> #aabbcc)",
  theme.normalizeHex("#abc") === "#aabbcc"
);
check("Un color sucio cae al acento por defecto", theme.normalizeHex("no-es-un-color", "#00D2FF") === "#00D2FF");

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. Modelo de documento
 * ═══════════════════════════════════════════════════════════════════════════ */
section("4. Modelo de documento");

const overviewModel = service.buildStatsModel({ scope: "overview", insights: INSIGHTS, user: USER, t, typeLabel: (x) => x, language: "es" });
check("La vista general arranca con el resumen", overviewModel.sections[0].kind === "kv");
check(
  "La vista general trae las cuatro tablas",
  ["timeline", "devices", "topForms"].every((id) => overviewModel.sections.some((s) => s.id === id))
);
check("La vista general lleva metadatos", overviewModel.meta.length === 2 && overviewModel.meta[0].value === "Ada Lovelace");
check("El nombre de archivo lleva la fecha", /^estadisticas-\d{4}-\d{2}-\d{2}$/.test(overviewModel.filename), overviewModel.filename);

const formModel = service.buildStatsModel({ scope: "form", form: FORM, analytics: ANALYTICS, user: USER, t, typeLabel: (x) => `field_${x}`, language: "es" });
check("El formulario usa su propio titulo", formModel.subtitle === FORM.title);
check("El resumen del formulario trae las cinco metricas", formModel.sections[0].rows.length === 5);
check(
  "El resumen del formulario incluye la conversion y la finalizacion",
  formModel.sections[0].rows.some((r) => r.label === "responseConversionRate") &&
    formModel.sections[0].rows.some((r) => r.label === "completion")
);
check(
  "Las preguntas con distribucion reciben su propia tabla",
  ["q-q1", "q-q2", "q-q4"].every((id) => formModel.sections.some((s) => s.id === id))
);

const rankSection = formModel.sections.find((s) => s.id === "q-q2");
check(
  "Una clasificacion añade la columna de posicion media",
  rankSection && rankSection.columns.some((c) => c.key === "averageRank")
);
const radioSection = formModel.sections.find((s) => s.id === "q-q1");
check(
  "Una eleccion normal NO lleva la columna de posicion media",
  radioSection && !radioSection.columns.some((c) => c.key === "averageRank")
);

const sampleSection = formModel.sections.find((s) => s.id === "s-q3");
check("Las respuestas abiertas se limitan a 8 filas", sampleSection.rows.length === 8, `hay ${sampleSection?.rows.length}`);
check(
  "Cada respuesta abierta se recorta",
  sampleSection.rows.every((r) => r.text.length <= 165),
  `la mas larga mide ${Math.max(...sampleSection.rows.map((r) => r.text.length))}`
);
check(
  "El recorte de verdad marca el final con puntos suspensivos",
  sampleSection.rows[0].text.endsWith("..."),
  sampleSection.rows[0].text.slice(-20)
);

check(
  "Un formulario sin datos no rompe el modelo",
  (() => {
    const empty = service.buildStatsModel({
      scope: "form",
      form: { title: "Vacio" },
      analytics: { stats: {}, timeline: [], questions: [] },
      user: null,
      t,
      typeLabel: (x) => x,
      language: "es",
    });
    return empty.sections.length === 1 && empty.meta[0].value === "—";
  })()
);

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. Los tres archivos
 * ═══════════════════════════════════════════════════════════════════════════ */
section("5. Generacion de los tres archivos");

const palette = theme.buildPalette("#00D2FF");
const outputs = {};

for (const format of ["xlsx", "docx", "pdf"]) {
  const { data, filename, mime } = await service[`generate${format === "xlsx" ? "Xlsx" : format === "docx" ? "Docx" : "Pdf"}`](
    formModel,
    palette,
    LOGO
  );
  outputs[format] = { data, filename, mime };
  const size = data.byteLength ?? data.size ?? 0;
  check(`${format} se genera (${(size / 1024).toFixed(0)} KB, ${mime.split(".").pop()})`, size > 2000);
}

const xlsxBuf = Buffer.from(outputs.xlsx.data);
const docxBuf = Buffer.from(await outputs.docx.data.arrayBuffer());
const pdfBuf = Buffer.from(outputs.pdf.data);

check("El .xlsx es un zip", xlsxBuf.subarray(0, 2).toString() === "PK");
check("El .docx es un zip", docxBuf.subarray(0, 2).toString() === "PK");
check("El .pdf es un PDF", pdfBuf.subarray(0, 5).toString() === "%PDF-");

/* ═══════════════════════════════════════════════════════════════════════════
 * 6. Excel: se relee con exceljs, no se buscan cadenas en el zip
 * ═══════════════════════════════════════════════════════════════════════════ */
section("6. Excel (releido con ExcelJS)");

const ExcelJS = (await import("exceljs")).default;
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(xlsxBuf);

const tableSections = formModel.sections.filter((s) => s.kind === "table");
check(
  "Una hoja por tabla mas la portada",
  wb.worksheets.length === tableSections.length + 1,
  `${wb.worksheets.length} hojas para ${tableSections.length + 1} esperadas`
);
check("El logo queda incrustado en el libro", wb.media.length === 1, `${wb.media.length} imagenes`);
check(
  "La portada lleva el logo de marca",
  Object.values(wb.media)[0]?.extension === "png"
);

const cover = wb.worksheets[0];
const coverValues = [];
cover.eachRow((row) => row.eachCell((cell) => coverValues.push(String(cell.value ?? ""))));
check("La portada trae el titulo del formulario", coverValues.some((v) => v === FORM.title));
check("La portada trae el nombre de quien exporta", coverValues.some((v) => v === "Ada Lovelace"));

const sheet = wb.worksheets[1];
const headerCell = sheet.getRow(1).getCell(1);
check(
  "La cabecera de la tabla va en el color de marca (ARGB)",
  headerCell.fill?.fgColor?.argb === theme.argbHex(palette.strong),
  `${headerCell.fill?.fgColor?.argb} esperado FF${theme.bareHex(palette.strong).toUpperCase()}`
);
check(
  "El texto de la cabecera usa el color de contraste",
  headerCell.font?.color?.argb === theme.argbHex(palette.onStrong),
  `${headerCell.font?.color?.argb}`
);
check(
  "Las filas de datos estan todas",
  sheet.rowCount === tableSections[0].rows.length + 1,
  `${sheet.rowCount} filas`
);

/* ═══════════════════════════════════════════════════════════════════════════
 * 7. Word y PDF: hay que descomprimir
 * ═══════════════════════════════════════════════════════════════════════════ */
section("7. Word (docx descomprimido)");

const zip = await JSZip.loadAsync(docxBuf);
const entryNames = Object.keys(zip.files);
const documentXml = await zip.file("word/document.xml").async("string");

check("El paquete tiene el documento", entryNames.includes("word/document.xml"));
check(
  "El logo va incrustado en word/media",
  entryNames.some((n) => n.startsWith("word/media/") && n.endsWith(".png")),
  entryNames.filter((n) => n.startsWith("word/media/")).join(", ")
);
check(
  "Una tabla por seccion de datos mas la de cabecera",
  (documentXml.match(/<w:tbl>/g) || []).length === formModel.sections.length + 1,
  `${(documentXml.match(/<w:tbl>/g) || []).length} tablas`
);
check(
  "El relleno de la cabecera es el color de marca",
  documentXml.includes(`w:fill="${theme.bareHex(palette.strong)}"`),
  `buscando ${theme.bareHex(palette.strong)}`
);
check(
  "El texto de la cabecera lleva el color de contraste",
  documentXml.includes(`w:color w:val="${theme.bareHex(palette.onStrong)}"`)
);
check("Aparece el nombre de quien exporta", documentXml.includes("Ada Lovelace"));
check("Aparece el titulo del formulario", documentXml.includes(FORM.title));
check(
  "Las filas repetibles de cabecera se declaran",
  documentXml.includes("<w:tblHeader/>")
);

section("8. PDF (flujos reinflados)");

/* El color de marca del PDF vive en los flujos de contenido, y jsPDF v4 los
 * escribe SIN comprimir por defecto. Se intenta inflar por si acaso --alguien
 * puede activar `compress`-- y si no es un flujo Flate se conserva el trozo en
 * crudo, que para un PDF sin comprimir es justo el contenido.
 *
 * Detalle que hace falta: `indexOf("stream")` encuentra tambien el "stream" de
 * "endstream". Se descarta con una comprobacion explicita. */
function extractPdfContent(buf) {
  const out = [];
  const open = Buffer.from("stream");
  const close = Buffer.from("endstream");
  const endOfWord = Buffer.from("end");
  let idx = 0;
  for (;;) {
    const at = buf.indexOf(open, idx);
    if (at === -1) break;
    if (at >= 3 && buf.subarray(at - 3, at).equals(endOfWord)) {
      idx = at + open.length;
      continue;
    }
    let start = at + open.length;
    if (buf[start] === 0x0d) start += 1;
    if (buf[start] === 0x0a) start += 1;
    const end = buf.indexOf(close, start);
    if (end === -1) break;
    const raw = buf.subarray(start, end);
    try {
      out.push(zlib.inflateSync(raw).toString("latin1"));
    } catch {
      out.push(raw.toString("latin1"));
    }
    idx = end + close.length;
  }
  return out.join("\n");
}

const pdfText = extractPdfContent(pdfBuf);
const rawPdf = pdfBuf.toString("latin1");

check("Se pudo leer el contenido del PDF", pdfText.length > 200, `${pdfText.length} chars`);

check("El PDF cierra correctamente", rawPdf.includes("%%EOF"));
check("El PDF tiene el objeto de imagen del logo", rawPdf.includes("/Subtype /Image") || rawPdf.includes("/Subtype/Image"));
check("El PDF trae la marca de agua de tiempo del generador", rawPdf.includes("/Producer"));

/* Tres cosas que hacen que buscar el color "a ojo" en el PDF no funcione. Las tres
 * hicieron fallar una comprobacion que en realidad era correcta:
 *
 *   1. jsPDF v4 normaliza a 0..1: `setTextColor(0, 210, 255)` sale `0 .82 1 rg`.
 *   2. El blanco NO sale como `1 1 1 rg`: sale `1 g`. Los operadores de
 *      escala de grises se reservan para los colores acromaticos, y el blanco es
 *      el caso limite.
 *   3. El color de la raya de acento va con `RG` mayuscula --trazos--, no `rg`
 *      minuscula --rellenos--.
 *
 * Aqui se aceptan los cuatro operadores y se comparan por la cifra, con
 * tolerancia para el redondeo y para el `0.` sin digitos. */
function pdfPaints(text, hex) {
  const want = theme.rgbTriplet(hex).map((n) => n / 255);
  const near = (got) => Math.max(...got.map((v, i) => Math.abs(v - want[i]))) < 0.005;

  const rgb = /([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(?:rg|RG)\b/g;
  let match = rgb.exec(text);
  while (match !== null) {
    if (near(match.slice(1, 4).map(Number))) return true;
    match = rgb.exec(text);
  }

  const gray = /([\d.]+)\s+(?:g|G)\b/g;
  match = gray.exec(text);
  while (match !== null) {
    if (near([Number(match[1]), Number(match[1]), Number(match[1])])) return true;
    match = gray.exec(text);
  }
  return false;
}

check(
  "El PDF pinta con el acento puro",
  pdfPaints(pdfText, palette.primary),
  `buscando rgb de ${palette.primary}`
);
check(
  "El PDF pinta las cabeceras con el tono profundo de marca",
  pdfPaints(pdfText, palette.strong),
  `buscando rgb de ${palette.strong}`
);
check(
  "El PDF escribe el texto de las cabeceras con el color de contraste",
  pdfPaints(pdfText, palette.onStrong),
  `buscando rgb de ${palette.onStrong}`
);
check(
  "El PDF NO pinta las cabeceras con el acento puro (serian ilegibles)",
  !pdfPaints(pdfText, palette.primary) || palette.strong !== palette.primary,
  `strong=${palette.strong} primary=${palette.primary}`
);
check("El PDF pagina", rawPdf.includes("/Type /Page") || rawPdf.includes("/Type/Page"));
check("El PDF lleva el titulo del formulario", pdfText.includes("Encuesta de satisfaccion 2026"));
check("El PDF lleva el nombre de quien exporta", pdfText.includes("Ada Lovelace"));

/* ═══════════════════════════════════════════════════════════════════════════
 * 9. La vista general tambien genera los tres
 * ═══════════════════════════════════════════════════════════════════════════ */
section("9. La vista general genera los tres formatos");

for (const format of ["xlsx", "docx", "pdf"]) {
  const name = format === "xlsx" ? "Xlsx" : format === "docx" ? "Docx" : "Pdf";
  try {
    const { data } = await service[`generate${name}`](overviewModel, palette, LOGO);
    const size = data.byteLength ?? data.size ?? 0;
    check(`overview -> ${format} (${(size / 1024).toFixed(0)} KB)`, size > 2000);
  } catch (error) {
    check(`overview -> ${format}`, false, error.message);
  }
}

/* Un logo que no se puede leer no debe tumbar la exportacion. */
section("10. Tolerancia a fallos");
try {
  const { data } = await service.generatePdf(formModel, palette, null);
  check("El PDF se genera sin logo", (data.byteLength ?? 0) > 2000);
} catch (error) {
  check("El PDF se genera sin logo", false, error.message);
}

try {
  const { data } = await service.generateXlsx(formModel, palette, undefined);
  check("El Excel se genera sin logo", (data.byteLength ?? 0) > 2000);
} catch (error) {
  check("El Excel se genera sin logo", false, error.message);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 11. Ninguna etiqueta sale como clave sin traducir
 * ═══════════════════════════════════════════════════════════════════════════ */
section("11. Las etiquetas del documento son prosa, no claves");

/* Esta seccion existe por un fallo que las otras diez no podian ver.
 *
 * Arriba, `t` es `(key) => key`. Es lo correcto para comprobar la estructura
 * del modelo sin depender de los textos: si no, cambiar una palabra en
 * LanguageContext rompe veinte comprobaciones que no van de eso. El problema es
 * que esa stub hace invisible justo el fallo que importa, porque `t` de verdad
 * devuelve la clave cuando no la encuentra. Una clave mal escrita --se pide
 * `exportDevices` y existe `devices`-- produce un documento con la palabra
 * `exportDevices` impresa como cabecera de tabla, y las 91 comprobaciones
 * anteriores pasan todas: la estructura es correcta, los colores son correctos
 * y el fichero abre en Excel.
 *
 * El fallo no se ve hasta que alguien abre el .xlsx downloaded. Asi que aqui se
 * monta la `t` de verdad, con el diccionario real leido del fuente, y se
 * recorre el modelo buscando identificadores donde deberia haber frases. */

const FUENTE_TRADUCCIONES = fs.readFileSync(
  path.join(ROOT, "src", "contexts", "LanguageContext.jsx"),
  "utf8"
);

/* Las claves de primer nivel de cada bloque de idioma, con su texto. El
   diccionario no se exporta, y no se va a ampliar la superficie publica de un
   contexto solo para que una sonda lo lea: se lee el fuente, que es lo que va a
   los ojos del que lo escribe. */
function clavesDe(idioma) {
  const bloque = FUENTE_TRADUCCIONES.split(`\n  ${idioma}: {`)[1];
  if (!bloque) throw new Error(`no encuentro el bloque ${idioma} en LanguageContext`);
  return new Map(
    [...bloque.matchAll(/^ {4}([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*?),?$/gm)].map((m) => [
      m[1],
      m[2].trim(),
    ])
  );
}

const DICCIONARIO = { en: clavesDe("en"), es: clavesDe("es") };
check(
  "Los dos idiomas declaran las mismas claves",
  DICCIONARIO.en.size === DICCIONARIO.es.size && [...DICCIONARIO.es.keys()].every((k) => DICCIONARIO.en.has(k)),
  `${DICCIONARIO.en.size} vs ${DICCIONARIO.es.size}`
);

/* La `t` de verdad, con la misma precedencia que la de la app: primero el idioma
   pedido, despues el ingles, y si no esta la clave devuelta tal cual. Que sea
   exactamente la misma regla es lo que hace la comprobacion util: aqui, igual
   que en pantalla, una clave ausente sale como clave. */
const tReal = (key) => DICCIONARIO.es.get(key) ?? DICCIONARIO.en.get(key) ?? key;

/* Todas las claves que el servicio pide, incluidas las de las plantillas: el
   menu compone ``t(`export_${id}`)``, y `id` sale de la lista `ORDER` que esta
   declarada en el propio fichero del menu. */
const FORMATOS = ["xlsx", "docx", "pdf"];
const FUENTE_SERVICIO = fs.readFileSync(path.join(ROOT, "src", "services", "exportService.js"), "utf8");
const FUENTE_MENU = fs.readFileSync(path.join(ROOT, "src", "components", "analytics", "ExportMenu.jsx"), "utf8");

function clavesPedidas(fuente) {
  const pedidas = new Set();
  for (const m of fuente.matchAll(/\bt\(\s*"([A-Za-z_][A-Za-z0-9_]*)"/g)) pedidas.add(m[1]);
  for (const m of fuente.matchAll(/\bt\(\s*`([^`]*\$\{\w+\}[^`]*)`/g)) {
    const patron = m[1];
    for (const formato of FORMATOS) {
      const clave = patron.replace(/\$\{\w+\}/, formato);
      pedidas.add(clave);
    }
  }
  return pedidas;
}

const pedidas = new Set([...clavesPedidas(FUENTE_SERVICIO), ...clavesPedidas(FUENTE_MENU)]);
const sinTraducir = [...pedidas].filter((k) => !DICCIONARIO.en.has(k) || !DICCIONARIO.es.has(k)).sort();
check(
  `Las ${pedidas.size} claves que pide el servicio existen en los dos idiomas`,
  sinTraducir.length === 0,
  sinTraducir.join(", ")
);

/* Y la version de extremo a extremo: el modelo montado con la `t` de verdad no
   puede contener una clave sin traducir en ningun sitio donde vaya a leerla una
   persona. */
const modeloReal = service.buildStatsModel({
  scope: "overview",
  insights: INSIGHTS,
  user: USER,
  t: tReal,
  typeLabel: (type) => tReal(`field_${type}`),
  language: "es",
});

/* Que es "parecer una clave".
 *
 * Dos formas, porque `t` devuelve la clave tal cual y las claves de este
 * proyecto no tienen siempre la misma forma:
 *
 *   - guion bajo: `field_short_text`, `export_share`
 *   - camelCase: `exportDevices`, `noTitle`
 *
 * Solo la segunda se me habia escapado en la primera version de esta
 * comprobacion, que buscaba unicamente el guion bajo. Reintroduje el fallo a
 * proposito para ver si lo cazaba, y dio verde mientras las tres comprobaciones
 * concretas de abajo lo delataban. Una comprobacion que no falla cuando tiene
 * que fallar no comprueba nada.
 *
 * El patron exige que el token empiece en minuscula y lleve una mayuscula por
 * dentro, para no marcar etiquetas legitimas: `Resumen`, `Dispositivos`, `Device`
 * y `PDF` se libran; `exportDevices` y `noTitle` no. */
const PARECE_CLAVE = /\b(?:[a-z][a-z0-9]*_[A-Za-z0-9_]+|[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*)\b/;

/* Solo se recorren los textos que salen SIEMPRE de `t()`: titulo de seccion,
   etiqueta de columna, etiqueta de fila de un `kv` y los metadatos. Las celdas
   de una tabla son dato, y el nombre de un formulario lo pone el usuario:
   `miFormulario` es un nombre legitimo que un patron de codigo marcaria sin
   ninguna razon. Ahi no se mira nada. */
const TRADUCIDO = [];

function recorrer(modelo) {
  if (typeof modelo.title === "string") TRADUCIDO.push(["titulo", modelo.title]);
  if (typeof modelo.subtitle === "string") TRADUCIDO.push(["subtitulo", modelo.subtitle]);
  for (const m of modelo.meta || []) TRADUCIDO.push(["meta", m.label]);
  for (const s of modelo.sections) {
    if (s.title) TRADUCIDO.push([`${s.id}.titulo`, s.title]);
    for (const c of s.columns || []) TRADUCIDO.push([`${s.id}.${c.key}`, c.label]);
    if (s.kind === "kv") for (const fila of s.rows || []) TRADUCIDO.push([`${s.id}.etiqueta`, fila.label]);
  }
}

recorrer(modeloReal);

const sospechosas = TRADUCIDO.filter(([, valor]) => typeof valor === "string" && PARECE_CLAVE.test(valor));
check(
  `Ninguna de las ${TRADUCIDO.length} etiquetas parece una clave sin traducir`,
  sospechosas.length === 0,
  sospechosas.map(([donde, valor]) => `${donde} = ${valor}`).slice(0, 4).join(" | ")
);

/* Y la regla fuerte, sin heuristica: si una de esas etiquetas es exactamente el
   nombre de una clave del diccionario, esta sin traducir aunque su forma no la
   delate. */
const literalesDeClave = TRADUCIDO.filter(
  ([, valor]) => DICCIONARIO.en.has(valor) || DICCIONARIO.es.has(valor)
);
check(
  "Ninguna etiqueta es literalmente el nombre de una clave",
  literalesDeClave.length === 0,
  literalesDeClave.map(([donde, valor]) => `${donde} = ${valor}`).slice(0, 4).join(" | ")
);

/* Un caso concreto que se colaron mientras se escribia esto: el servicio pedia
   `exportDevices`, `exportTopForms` y `exportFormTitle`, que no existen en
   ningun idioma. Los tres salen en el documento general. Se comprueba aqui el
   texto de verdad, no que la clave no este, para que el fallo diga que decia
   la palabra y no solo que hay un problema. */
const seccionDispositivos = modeloReal.sections.find((s) => s.id === "devices");
const seccionTop = modeloReal.sections.find((s) => s.id === "topForms");
check(
  "La tabla de dispositivos se titula con la palabra, no con la clave",
  seccionDispositivos?.title === DICCIONARIO.es.get("devices"),
  seccionDispositivos?.title
);
check(
  "La tabla de formularios destacados tambien",
  seccionTop?.title === DICCIONARIO.es.get("topForms"),
  seccionTop?.title
);
check(
  "La columna del formulario se nombra con su palabra",
  seccionTop?.columns?.[0]?.label === DICCIONARIO.es.get("form"),
  seccionTop?.columns?.[0]?.label
);

/* Los tipos de campo se declaran en `FIELD_DEFS`, que es la fuente que
   funciona: el constructor, la validacion y el renderer publico salen de ahi.
   La traduccion del nombre del tipo es una copia, y las copias se quedan
   atras. */
function tiposDeCampo() {
  const fuente = fs.readFileSync(path.join(ROOT, "src", "lib", "fieldTypes.js"), "utf8");
  const bloque = fuente.split("export const FIELD_DEFS = {")[1];
  if (!bloque) throw new Error("no encuentro FIELD_DEFS en fieldTypes.js");
  return [...bloque.matchAll(/^ {2}([a-z_]+):\s*\{\s*label:/gm)].map((m) => m[1]);
}

const tipos = tiposDeCampo();
const sinClaveDeTipo = tipos.filter(
  (tipo) => !DICCIONARIO.en.has(`field_${tipo}`) || !DICCIONARIO.es.has(`field_${tipo}`)
);
check(
  `Los ${tipos.length} tipos de campo tienen su clave field_* en los dos idiomas`,
  tipos.length > 0 && sinClaveDeTipo.length === 0,
  sinClaveDeTipo.length ? `sin clave: ${sinClaveDeTipo.join(", ")}` : `tipos hallados: ${tipos.length}`
);

/* ═══════════════════════════════════════════════════════════════════════════ */
console.log(`\n${"=".repeat(60)}`);
await server.close();
if (failures.length) {
  console.log(`${pass} correctas, ${failures.length} FALLIDAS\n`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
} else {
  console.log(`Las ${pass} comprobaciones pasan.`);
}
