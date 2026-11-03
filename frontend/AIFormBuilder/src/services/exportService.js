/**
 * Exportacion de estadisticas a Excel, Word y PDF.
 *
 * La idea es que las dos vistas de estadisticas --la general de Insights y la de
 * un formulario-- se.conviertan en un UNICO modelo de documento, y que ese
 * modelo tenga tres renderizadores. Así el contenido del Excel y el del PDF no
 * pueden separarse: si mañana el modelo gana una tabla nueva, los tres formatos
 * la reciben sin tocar ninguno de los tres generadores.
 *
 * El modelo no sabe de colores ni de marcas; eso vive en `lib/exportTheme.js`.
 * Y no sabe de traduccion: recibe un `t` ya resuelto, de modo que el documento
 * sale en el idioma que el usuario tiene puesto en la aplicacion y no en el
 * del navegador.
 */

import {
  argbHex,
  bareHex,
  buildPalette,
  rgbTriplet,
} from "../lib/exportTheme.js";
import { assetUrl } from "../lib/api.js";
import { downloadBlob, formatDuration } from "../lib/utils.js";

/* ─── Marca por defecto ──────────────────────────────────────────────────────
 * Si la exportacion sale de la vista general, el documento lleva el logotipo de
 * CubaGob. Si sale de un formulario concreto, lleva el logo de ese formulario y
 * solo recurre a CubaGob cuando el formulario no tiene ninguno.
 *
 * Se usa la version NEGRA (`logo_cgd_negro.png`) porque un documento se imprime
 * sobre papel blanco: la version clara de `logo_cgd.png` esta pensada para
 * fondos oscuros y sobre papel se veria casi invisible. */
export const BRAND_LOGO = "/logo_cgd_negro.png";

/* Los documentos comparten una sola tecnica para el logo: convertirlo a PNG.
 * No es arbitrario. jsPDF no sabe leer GIF, `docx` no sabe leer SVG y ExcelJS
 * no acepta SVG en su API de imagenes. Reescalar a PNG por canvas en el
 * navegador hace que un GIF, un SVG o un WebP se puedan incrustar igual en los
 * tres formatos, y de paso recorta el PNG de marca --6122x1740-- a un tamano
 * razonable para el peso del archivo. */
const LOGO_MAX_WIDTH = 1200;

/* Las respuestas abiertas se truncan: un documento de exportacion sirve para
 * leer el patron, no para hacer un volcado de texto libre de cientos de
 * caracteres por persona. */
const MAX_SAMPLES = 8;
const MAX_SAMPLE_LEN = 160;

/* ═══════════════════════════════════════════════════════════════════════════
 * Origen del logo
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Decide que imagen va en la cabecera del documento.
 *
 * Devuelve `null` en `src` cuando no hay nada que incrustar, que es un caso
 * legitimo: un logo remoto que el navegador no puede leer por CORS no debe
 * tumbar la exportacion entera, solo dejarla sin ilustracion y mantener todos
 * los colores de marca.
 */
export function resolveLogoSource({ scope, form } = {}) {
  if (scope === "form") {
    const own = form?.settings?.logo;
    if (own) return { src: assetUrl(own), isBrandLogo: false };
  }
  /* El logo de marca NO pasa por `assetUrl`, y la asimetría con la línea de
     arriba es a propósito: este lo sirve el FRONT, desde `public/`, mientras que
     el del formulario lo sirve el backend en la raíz del servidor. Pasarlo por
     `assetUrl` apuntaría al 8000 y daría un 404 en un documento que, sin logo,
     saldría bien. */
  return { src: BRAND_LOGO, isBrandLogo: true };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Carga del logo
 * ═══════════════════════════════════════════════════════════════════════════ */

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo"));
    img.src = src;
  });
}

/**
 * Descarga el logo y lo devuelve como PNG, con sus bytes y su data URL.
 *
 * Pasa siempre por un canvas y no devuelve el archivo original: es lo que
 * garantiza que el mismo logo funcione en los tres formatos (vease la nota de
 * `LOGO_MAX_WIDTH`) y lo que permite reducir un PNG de marca de 6122 px a algo
 * que no infle el .xlsx.
 *
 * Devuelve `null` ante CORS, 404 o un archivo que no sea una imagen. Es
 * deliberado: `toDataURL` lanza `SecurityError` si el canvas queda contaminado
 * y un logo inaccesible no es motivo para perder un Excel entero.
 */
export async function loadLogoPng(src) {
  if (!src || typeof document === "undefined") return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;

    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImageElement(objectUrl);
      // Un SVG sin `width`/`height` intrinsecos puede reportar 0: se le da un
      // tamano por defecto en vez de fallar.
      const naturalW = img.naturalWidth || img.width || 512;
      const naturalH = img.naturalHeight || img.height || 512;
      const scale = Math.min(1, LOGO_MAX_WIDTH / naturalW);
      const width = Math.max(1, Math.round(naturalW * scale));
      const height = Math.max(1, Math.round(naturalH * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/png");
      const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

      return { dataUrl, bytes, width, height, ratio: width / height };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Formateo
 * ═══════════════════════════════════════════════════════════════════════════ */

const numberFmt = new Intl.NumberFormat();

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? numberFmt.format(n) : "0";
}

function pct(part, total) {
  const a = Number(part) || 0;
  const b = Number(total) || 0;
  return `${b ? Math.round((a / b) * 100) : 0}%`;
}

function formatStamp(date, language) {
  try {
    return new Intl.DateTimeFormat(language || "es", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}

function displayName(user) {
  const full = [user?.name, user?.lastName].filter(Boolean).join(" ").trim();
  return full || user?.email || "";
}

/** `2026-10-01` -> `1 oct 2026`, sin arrastrar zona horaria. */
function dayLabel(iso, language) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(iso || "");
  try {
    return new Intl.DateTimeFormat(language || "es", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  } catch {
    return String(iso);
  }
}

function slugify(text) {
  return (
    String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "estadisticas"
  );
}

/** Excel no admite `:\ / ? * [ ]` en un nombre de hoja y corta a 31. */
function sheetName(title, fallback) {
  const clean = String(title || "")
    .replace(/[\\/*?:[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  return clean || fallback;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Modelo de documento
 *
 * Un modelo es `{ title, subtitle, meta, sections, filename }` y una seccion es
 * `{ id, kind, title, columns, rows }`, donde `kind` distingue una tabla de
 * datos (`table`, con fila de cabecera) de un bloque de metricas (`kv`, sin
 * ella). Las columnas llevan un `weight` relativo --no un ancho-- porque cada
 * generador lo reparte sobre su propia medida util: puntos en el PDF, porcentaje
 * en Word y caracteres en Excel.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Metadatos comunes: quien exporta y cuando. */
function metaRows({ user, language, t }) {
  return [
    { label: t("exportedBy"), value: displayName(user) || "—" },
    { label: t("exportedAt"), value: formatStamp(new Date(), language) },
  ];
}

export function buildStatsModel({
  scope,
  form,
  analytics,
  insights,
  user,
  t,
  typeLabel,
  language,
}) {
  const meta = metaRows({ user, language, t });
  /* El nombre de archivo usa el dia en ISO, NO la marca de tiempo. Cortar los
     diez primeros caracteres de "1 de octubre de 2026, 14:32" --que es lo que se
     hacia antes-- producia nombres como "estadisticas-1 de octub", con espacios
     y sin dia. */
  const day = new Date().toISOString().slice(0, 10);

  if (scope === "form") {
    return modelFromForm({ form, analytics, meta, t, typeLabel, language, day });
  }
  return modelFromOverview({ insights, meta, t, language, day });
}

/** Vista de un formulario concreto. */
function modelFromForm({ form, analytics, meta, t, typeLabel, language, day }) {
  const stats = analytics?.stats || {};
  const timeline = analytics?.timeline || [];
  const questions = analytics?.questions || [];
  const totalResponses = stats.totalResponses ?? 0;

  const sections = [];

  sections.push({
    id: "summary",
    kind: "kv",
    title: t("exportSummary"),
    columns: [
      { key: "label", label: t("exportMetric"), weight: 3 },
      { key: "value", label: t("exportValue"), weight: 2, align: "right" },
    ],
    rows: [
      { label: t("responses"), value: num(totalResponses) },
      { label: t("totalViews"), value: num(stats.views) },
      { label: t("responseConversionRate"), value: `${stats.conversionRate ?? 0}%` },
      { label: t("completion"), value: `${stats.completionRate ?? 0}%` },
      { label: t("time"), value: formatDuration(stats.avgCompletionTime) },
    ],
  });

  if (timeline.length) {
    sections.push({
      id: "timeline",
      kind: "table",
      title: t("exportTimeline"),
      columns: [
        { key: "date", label: t("exportDate"), weight: 2 },
        { key: "count", label: t("responses"), weight: 1, align: "right" },
        { key: "share", label: t("exportShare"), weight: 1, align: "right" },
      ],
      rows: timeline.map((d) => ({
        date: dayLabel(d.date, language),
        count: num(d.count),
        share: pct(d.count, totalResponses),
      })),
    });
  }

  if (questions.length) {
    sections.push({
      id: "questions",
      kind: "table",
      title: t("exportQuestions"),
      columns: [
        { key: "label", label: t("exportQuestion"), weight: 5 },
        { key: "type", label: t("exportType"), weight: 2 },
        { key: "total", label: t("responses"), weight: 1, align: "right" },
        { key: "coverage", label: t("exportCoverage"), weight: 1, align: "right" },
      ],
      rows: questions.map((q) => ({
        label: q.label || "—",
        type: typeLabel(q.type),
        total: num(q.total),
        coverage: pct(q.total, totalResponses),
      })),
    });
  }

  /* Una tabla por pregunta con distribucion. Es lo que hace legible el
     documento: "el 40% eligio A" en una columna compacta obliga a saltar del
     resumen a la pregunta; con su propia tabla se lee de un vistazo. */
  for (const q of questions) {
    const label = q.label || "—";
    if (Array.isArray(q.breakdown) && q.breakdown.length) {
      const isRank = q.breakdown.some((b) => b.averageRank != null);
      sections.push({
        id: `q-${q.id}`,
        kind: "table",
        title: isRank ? `${label} · ${t("exportAverageRank")}` : label,
        columns: [
          { key: "label", label: t("exportOption"), weight: 4 },
          { key: "count", label: t("responses"), weight: 1, align: "right" },
          { key: "share", label: t("exportShare"), weight: 1, align: "right" },
          ...(isRank
            ? [{ key: "averageRank", label: t("exportAverageRank"), weight: 1, align: "right" }]
            : []),
        ],
        rows: q.breakdown.map((b) => ({
          label: b.label ?? "—",
          count: num(b.count),
          share: pct(b.count, q.total),
          averageRank: b.averageRank != null ? String(b.averageRank) : "",
        })),
      });
    }

    if (Array.isArray(q.samples) && q.samples.length) {
      sections.push({
        id: `s-${q.id}`,
        kind: "table",
        title: `${label} · ${t("exportSamples")}`,
        columns: [
          { key: "index", label: "#", weight: 1 },
          { key: "text", label: t("exportSample"), weight: 8 },
        ],
        rows: q.samples.slice(0, MAX_SAMPLES).map((raw, i) => {
          const text = String(raw);
          const clipped = text.length > MAX_SAMPLE_LEN ? `${text.slice(0, MAX_SAMPLE_LEN)}...` : text;
          return { index: String(i + 1), text: clipped };
        }),
      });
    }
  }

  const title = t("insights");
  return {
    title,
    subtitle: form?.title || t("noTitle"),
    meta,
    sections,
    filename: `${slugify(form?.title || t("insights"))}-${day}`,
  };
}

/** Vista general: las metricas agregadas de todos los formularios. */
function modelFromOverview({ insights, meta, t, language, day }) {
  const stats = insights?.stats || {};
  const timeline = insights?.timeline || [];
  const devices = insights?.devices || [];
  const topForms = insights?.topForms || [];
  const totalResponses = stats.totalResponses ?? 0;
  const deviceTotal = devices.reduce((sum, d) => sum + (d.value || 0), 0);

  const sections = [];

  sections.push({
    id: "summary",
    kind: "kv",
    title: t("exportSummary"),
    columns: [
      { key: "label", label: t("exportMetric"), weight: 3 },
      { key: "value", label: t("exportValue"), weight: 2, align: "right" },
    ],
    rows: [
      { label: t("exportTotalForms"), value: num(stats.totalForms) },
      { label: t("published"), value: num(stats.published) },
      { label: t("responses"), value: num(totalResponses) },
      { label: t("totalViews"), value: num(stats.totalViews) },
      { label: t("conversion"), value: `${stats.conversion ?? 0}%` },
      { label: t("time"), value: formatDuration(stats.avgCompletionTime) },
    ],
  });

  if (timeline.length) {
    sections.push({
      id: "timeline",
      kind: "table",
      title: t("exportTimeline"),
      columns: [
        { key: "date", label: t("exportDate"), weight: 2 },
        { key: "count", label: t("responses"), weight: 1, align: "right" },
        { key: "share", label: t("exportShare"), weight: 1, align: "right" },
      ],
      rows: timeline.map((d) => ({
        date: dayLabel(d.date, language),
        count: num(d.count),
        share: pct(d.count, totalResponses),
      })),
    });
  }

  if (devices.length) {
    sections.push({
      id: "devices",
      kind: "table",
      /* Estas tres reusen las claves que ya usa la pantalla --`devices`,
         `topForms` y `form`-- y no unas `export*` propias. El documento tiene
         que decir lo mismo que la vista de la que sale, y una clave duplicada
         puede quedarse sin traducir sin que se note en pantalla: entonces el
         documento saca el nombre de la clave tal cual, en medio de una tabla. */
      title: t("devices"),
      columns: [
        { key: "label", label: t("exportDevice"), weight: 3 },
        { key: "value", label: t("exportSessions"), weight: 1, align: "right" },
        { key: "share", label: t("exportShare"), weight: 1, align: "right" },
      ],
      rows: devices.map((d) => ({
        label: d.label,
        value: num(d.value),
        share: pct(d.value, deviceTotal),
      })),
    });
  }

  if (topForms.length) {
    sections.push({
      id: "topForms",
      kind: "table",
      title: t("topForms"),
      columns: [
        { key: "title", label: t("form"), weight: 5 },
        { key: "status", label: t("exportStatus"), weight: 2 },
        { key: "responses", label: t("responses"), weight: 1, align: "right" },
        { key: "views", label: t("totalViews"), weight: 1, align: "right" },
        { key: "conversion", label: t("conversion"), weight: 1, align: "right" },
      ],
      rows: topForms.map((f) => ({
        title: f.title || "—",
        status: f.status === "published" ? t("published") : t("drafts"),
        responses: num(f.responses),
        views: num(f.views),
        conversion: `${f.conversion ?? 0}%`,
      })),
    });
  }

  return {
    title: t("insights"),
    subtitle: t("performanceAllForms"),
    meta,
    sections,
    filename: `estadisticas-${day}`,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Excel
 * ═══════════════════════════════════════════════════════════════════════════ */

export async function generateXlsx(model, palette, logo) {
  /* Devuelve los bytes en vez de descargar. Que el generador no tenga el efecto
     secundario de Lanzar el navegador es lo que permite auditar el archivo
     produced --abrirlo, buscar el color de marca, contar sus hojas-- en lugar de
     tener que confiar en que "ha salido bien". La descarga ocurre en un unico
     sitio, `exportStats`. */
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = model.meta.find((m) => m.label)?.value || "Formly";
  wb.created = new Date();

  let imageId = null;
  if (logo) {
    imageId = wb.addImage({ base64: logo.dataUrl.slice(logo.dataUrl.indexOf(",") + 1), extension: "png" });
  }

  const cover = wb.addWorksheet(sheetName(model.subtitle, "Resumen"), {
    views: [{ showGridLines: false }],
  });
  cover.views = [{ showGridLines: false }];
  cover.properties.tabColor = { argb: argbHex(palette.primary) };

  const topBand = cover.getRow(1);
  topBand.height = 12;
  for (let c = 1; c <= 12; c += 1) {
    const cell = topBand.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbHex(palette.primary) } };
    cell.border = { top: { style: "thin", color: { argb: argbHex(palette.primaryDark) } } };
  }

  const panel = cover.getRow(2);
  panel.height = 10;
  for (let c = 1; c <= 12; c += 1) {
    const cell = panel.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbHex(palette.primaryLight) } };
  }

  if (imageId) {
    const height = 54;
    cover.addImage(imageId, {
      tl: { col: 0.2, row: 2.6 },
      ext: { width: Math.round(height * logo.ratio), height },
    });
  }

  const titleRow = cover.getRow(imageId ? 5 : 4);
  const titleCell = titleRow.getCell(1);
  titleCell.value = model.title;
  titleCell.font = { bold: true, size: 18, color: { argb: argbHex(palette.primaryDark) } };
  titleCell.alignment = { vertical: "middle" };
  cover.getCell("A" + titleRow.number).value = model.title;

  const subtitleRow = cover.getRow(imageId ? 6 : 5);
  const subtitleCell = subtitleRow.getCell(1);
  subtitleCell.value = model.subtitle;
  subtitleCell.font = { size: 11, color: { argb: argbHex(palette.muted) } };
  cover.getCell("A" + subtitleRow.number).value = model.subtitle;

  const chipRow = cover.getRow(imageId ? 7 : 6);
  const chipCell = chipRow.getCell(1);
  chipCell.value = "Panel ejecutivo";
  chipCell.font = { bold: true, size: 9, color: { argb: argbHex(palette.onStrong) } };
  chipCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbHex(palette.primary) } };
  chipCell.alignment = { horizontal: "center" };

  const metaStart = imageId ? 9 : 8;
  model.meta.forEach((m, i) => {
    const row = cover.getRow(metaStart + i);
    row.getCell(1).value = m.label;
    row.getCell(1).font = { bold: true, size: 10, color: { argb: argbHex(palette.muted) } };
    row.getCell(2).value = m.value;
    row.getCell(2).font = { size: 10, color: { argb: argbHex(palette.ink) } };
  });

  const coverWidths = [34, 26];
  cover.columns.forEach((col, i) => {
    col.width = coverWidths[i] || 18;
  });

  const summary = model.sections.find((s) => s.kind === "kv");
  if (summary) {
    const start = metaStart + model.meta.length + 1;
    summary.rows.forEach((r, i) => {
      const row = cover.getRow(start + i);
      row.getCell(1).value = r.label;
      row.getCell(1).font = { size: 11, color: { argb: argbHex(palette.ink) } };
      row.getCell(2).value = r.value;
      row.getCell(2).font = { bold: true, size: 11, color: { argb: argbHex(palette.strong) } };
      row.getCell(2).alignment = { horizontal: "right" };
      row.getCell(1).border = { bottom: { style: "hair", color: { argb: argbHex(palette.rule) } } };
      row.getCell(2).border = { bottom: { style: "hair", color: { argb: argbHex(palette.rule) } } };
    });
  }

  for (const section of model.sections.filter((s) => s.kind === "table")) {
    const ws = wb.addWorksheet(sheetName(section.title, section.id));
    ws.views = [{ showGridLines: false }];

    const totalWeight = section.columns.reduce((s, c) => s + (c.weight || 1), 0);
    ws.columns = section.columns.map((c) => ({
      width: Math.max(10, Math.round(((c.weight || 1) / totalWeight) * 60)),
    }));

    const header = ws.getRow(1);
    section.columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c.label;
      cell.font = { bold: true, size: 11, color: { argb: argbHex(palette.onStrong) } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbHex(palette.strong) } };
      cell.alignment = { horizontal: c.align || "left", vertical: "middle" };
    });
    header.height = 22;

    section.rows.forEach((r, ri) => {
      const row = ws.getRow(ri + 2);
      section.columns.forEach((c, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = r[c.key] ?? "";
        cell.font = { size: 11, color: { argb: argbHex(palette.ink) } };
        cell.alignment = { horizontal: c.align || "left", vertical: "top", wrapText: true };
        cell.border = { bottom: { style: "hair", color: { argb: argbHex(palette.rule) } } };
        if (ri % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbHex(palette.wash) } };
        }
      });
    });

    ws.getColumn(1).width = Math.min(60, ws.getColumn(1).width + 20);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return { data: buffer, filename: `${model.filename}.xlsx`, mime: MIME.xlsx };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Word
 * ═══════════════════════════════════════════════════════════════════════════ */

export async function generateDocx(model, palette, logo) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    ImageRun,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = await import("docx");

  const noSide = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = {
    top: noSide,
    bottom: noSide,
    left: noSide,
    right: noSide,
    insideHorizontal: noSide,
    insideVertical: noSide,
  };
  const hair = { style: BorderStyle.SINGLE, size: 4, color: bareHex(palette.rule) };
  const tableBorders = {
    top: hair,
    bottom: hair,
    left: hair,
    right: hair,
    insideHorizontal: hair,
    insideVertical: hair,
  };

  /* Cabecera: logo a la izquierda y bloque de titulo a su derecha, en una
     tabla sin bordes. Es la unica forma que docx ofrece de alinear dos bloques
     de alturas distintas en horizontal. */
  const LOGO_H = 52;
  const logoParagraph = logo
    ? new Paragraph({
        children: [
          new ImageRun({
            data: logo.bytes,
            type: "png",
            transformation: { width: Math.round(LOGO_H * logo.ratio), height: LOGO_H },
          }),
        ],
      })
    : new Paragraph({ children: [] });

  const headerRow = new TableRow({
    children: [
      new TableCell({
        borders: noBorders,
        margins: { right: 220 },
        verticalAlign: VerticalAlign.CENTER,
        shading: { type: ShadingType.CLEAR, fill: bareHex(palette.primaryLight), color: "auto" },
        children: [logoParagraph],
      }),
      new TableCell({
        borders: noBorders,
        verticalAlign: VerticalAlign.CENTER,
        shading: { type: ShadingType.CLEAR, fill: bareHex(palette.primaryLight), color: "auto" },
        children: [
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: "CubaGob", bold: true, size: 18, color: bareHex(palette.primaryDark) }),
            ],
          }),
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: model.title, bold: true, size: 30, color: bareHex(palette.ink) }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: model.subtitle, size: 18, color: bareHex(palette.muted) }),
            ],
          }),
        ],
      }),
    ],
  });

  const children = [
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: [headerRow] }),
    new Paragraph({
      spacing: { before: 80, after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: bareHex(palette.primary), space: 2 } },
      children: [],
    }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({ text: "Dashboard ejecutivo", bold: true, size: 16, color: bareHex(palette.primaryDark) }),
      ],
    }),
  ];

  for (const m of model.meta) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `${m.label}: `, bold: true, size: 17, color: bareHex(palette.muted) }),
          new TextRun({ text: m.value, size: 17, color: bareHex(palette.ink) }),
        ],
      })
    );
  }

  for (const section of model.sections) {
    children.push(
      new Paragraph({
        spacing: { before: 320, after: 120 },
        children: [
          new TextRun({ text: section.title, bold: true, size: 24, color: bareHex(palette.strong) }),
        ],
      })
    );

    const headerCells =
      section.kind === "table"
        ? [
            new TableRow({
              tableHeader: true,
              children: section.columns.map((c) =>
                new TableCell({
                  shading: { type: ShadingType.CLEAR, fill: bareHex(palette.strong), color: "auto" },
                  margins: { top: 60, bottom: 60, left: 90, right: 90 },
                  children: [
                    new Paragraph({
                      alignment: c.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                      children: [
                        new TextRun({
                          text: c.label,
                          bold: true,
                          size: 18,
                          color: bareHex(palette.onStrong),
                        }),
                      ],
                    }),
                  ],
                })
              ),
            }),
          ]
        : [];

    const bodyRows = section.rows.map((r, ri) =>
      new TableRow({
        children: section.columns.map((c) =>
          new TableCell({
            /* Bandas alternas: el mismo `wash` que en el PDF y en Excel, para
               que los tres documentos se lean como la misma familia. */
            shading: { type: ShadingType.CLEAR, fill: bareHex(ri % 2 ? palette.wash : palette.paper), color: "auto" },
            margins: { top: 60, bottom: 60, left: 90, right: 90 },
            children: [
              new Paragraph({
                alignment: c.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: String(r[c.key] ?? ""),
                    size: 19,
                    color: bareHex(palette.ink),
                    bold: section.kind === "kv" && c.align === "right",
                  }),
                ],
              }),
            ],
          })
        ),
      })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [...headerCells, ...bodyRows],
      })
    );
  }

  const doc = new Document({
    creator: model.meta[0]?.value || "Formly",
    title: `${model.title} - ${model.subtitle}`,
    description: model.meta.map((m) => `${m.label}: ${m.value}`).join(" | "),
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  return { data: blob, filename: `${model.filename}.docx`, mime: MIME.docx };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PDF
 * ═══════════════════════════════════════════════════════════════════════════ */

export async function generatePdf(model, palette, logo) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 44;
  const usable = pageW - M * 2;

  const ink = rgbTriplet(palette.ink);
  const muted = rgbTriplet(palette.muted);
  const primary = rgbTriplet(palette.primary);
  const primaryDark = rgbTriplet(palette.primaryDark);
  const strong = rgbTriplet(palette.strong);
  const onStrong = rgbTriplet(palette.onStrong);
  const rule = rgbTriplet(palette.rule);
  const wash = rgbTriplet(palette.wash);

  /* ── Cabecera premium tipo dashboard ejecutivo ── */
  const bannerY = M;
  const bannerH = 82;
  const bannerW = pageW - M * 2;
  doc.setFillColor(...primary);
  doc.roundedRect(M, bannerY, bannerW, bannerH, 16, 16, "F");
  doc.setDrawColor(...primaryDark);
  doc.roundedRect(M, bannerY, bannerW, bannerH, 16, 16, "S");

  const badgeW = 110;
  const badgeH = 18;
  doc.setFillColor(...onStrong);
  doc.roundedRect(pageW - M - badgeW - 8, bannerY + 12, badgeW, badgeH, 9, 9, "F");
  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold").setFontSize(8.2);
  doc.text("Dashboard ejecutivo", pageW - M - badgeW / 2 - 8, bannerY + 25, { align: "center" });

  const LOGO_H = 28;
  let textX = M + 20;
  if (logo) {
    const logoW = Math.min(LOGO_H * logo.ratio, usable * 0.32);
    doc.addImage(logo.dataUrl, "PNG", M + 16, bannerY + 20, logoW, LOGO_H, undefined, "FAST");
    textX = M + 18 + logoW + 16;
  }

  doc.setTextColor(...onStrong);
  doc.setFont("helvetica", "bold").setFontSize(10.5);
  doc.text("CubaGob", textX, bannerY + 26);

  const textW = pageW - textX - M - 18;
  let cursor = bannerY + 45;
  doc.setFont("helvetica", "bold").setFontSize(18);
  for (const line of doc.splitTextToSize(model.title, textW)) {
    doc.text(line, textX, cursor);
    cursor += 17;
  }
  doc.setFont("helvetica", "normal").setFontSize(10);
  for (const line of doc.splitTextToSize(model.subtitle, textW)) {
    doc.text(line, textX, cursor);
    cursor += 12;
  }

  cursor = bannerY + bannerH + 18;

  doc.setLineWidth(1.2).setDrawColor(...primary);
  doc.line(M, cursor, M + 76, cursor);
  doc.setLineWidth(0.5).setDrawColor(...rule);
  doc.line(M + 76, cursor, pageW - M, cursor);

  cursor += 14;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...muted);
  doc.text(
    model.meta.map((m) => `${m.label}: ${m.value}`).join("    ·    "),
    M,
    cursor
  );
  cursor += 12;

  /* ── Secciones ── */
  for (const section of model.sections) {
    const titleLines = doc.splitTextToSize(section.title, usable);
    const needed = titleLines.length * 14 + 26;
    if (cursor + needed > pageH - M - 30) {
      doc.addPage();
      cursor = M + 6;
    }
    doc.setFont("helvetica", "bold").setFontSize(11.5).setTextColor(...strong);
    doc.text(titleLines, M, cursor + 10);
    cursor += needed;

    const totalWeight = section.columns.reduce((s, c) => s + (c.weight || 1), 0);
    const columnStyles = {};
    section.columns.forEach((c, i) => {
      columnStyles[i] = {
        cellWidth: (usable * (c.weight || 1)) / totalWeight,
        halign: c.align || "left",
      };
    });

    autoTable(doc, {
      head: section.kind === "table" ? [section.columns.map((c) => c.label)] : undefined,
      body: section.rows.map((r) => section.columns.map((c) => String(r[c.key] ?? ""))),
      startY: cursor,
      margin: { left: M, right: M, top: M, bottom: M + 18 },
      columnStyles,
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 5,
        lineColor: rule,
        lineWidth: 0.5,
        textColor: ink,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: strong,
        textColor: onStrong,
        fontStyle: "bold",
        lineWidth: 0,
        cellPadding: 6,
      },
      alternateRowStyles: { fillColor: wash },
      /* En el bloque de metricas la primera columna hace de etiqueta: en
         negrita y sin cabecera, para no fingir que hay dos columnas simetricas. */
      ...(section.kind === "kv"
        ? { columnStyles: { ...columnStyles, 0: { ...columnStyles[0], fontStyle: "bold" } } }
        : {}),
      didDrawPage: () => {
        const h = doc.internal.pageSize.getHeight();
        const w = doc.internal.pageSize.getWidth();
        doc.setLineWidth(0.5).setDrawColor(...rule);
        doc.line(M, h - M - 6, w - M, h - M - 6);
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...muted);
        doc.text(model.subtitle, M, h - M + 8);
        doc.text(String(doc.internal.getNumberOfPages()), w - M, h - M + 8, { align: "right" });
      },
    });

    cursor = (doc.lastAutoTable?.finalY ?? cursor) + 20;
  }

  /* `output("arraybuffer")` en vez de `save()`: el PDF se devuelve como bytes y
     quien lo descarga es `exportStats`, igual que en los otros dos formatos. */
  return { data: doc.output("arraybuffer"), filename: `${model.filename}.pdf`, mime: MIME.pdf };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Punto de entrada unico
 * ═══════════════════════════════════════════════════════════════════════════ */

const GENERATORS = {
  xlsx: generateXlsx,
  docx: generateDocx,
  pdf: generatePdf,
};

const MIME = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

export const EXPORT_FORMATS = [
  { id: "xlsx", label: "Excel", ext: ".xlsx" },
  { id: "docx", label: "Word", ext: ".docx" },
  { id: "pdf", label: "PDF", ext: ".pdf" },
];

/**
 * Genera y descarga un documento.
 *
 * `format` es `xlsx`, `docx` o `pdf`. La paleta y el logo se resuelven aqui, y
 * no en el componente, para que las tres rutas compartan exactamente el mismo
 * criterio de marca. La descarga vive aqui y en ningun otro sitio.
 */
export async function exportStats({ format, ...modelInput }) {
  const generate = GENERATORS[format];
  if (!generate) throw new Error(`Formato de exportacion no soportado: ${format}`);

  const palette = buildPalette(modelInput.accent);
  const logo = await loadLogoPng(resolveLogoSource(modelInput).src);
  const model = buildStatsModel(modelInput);

  const { data, filename, mime } = await generate(model, palette, logo);
  downloadBlob(data, filename, mime);
  return filename;
}