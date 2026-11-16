import { listResponsesByForm, timelineByForms } from "../repositories/response.repo.js";
import { getStatsForm } from "./form.service.js";
import { OPTION_FIELD_TYPES, STATIC_FIELD_TYPES, RATING_TYPES, CATALOG_FIELD_TYPES, catalogTypeFor } from "../utils/constants.js";

export async function getFormAnalytics(formId, actorOrId) {
  const form = await getStatsForm(formId, actorOrId);
  return computeForForm(form);
}

/**
 * Analítica de un formulario PÚBLICO para invitados (sin sesión).
 * La puerta de visibilidad vive aquí: lo privado nunca sale por este camino.
 */
export async function getPublicFormAnalytics(form) {
  if (!form || (form.visibility || "public") === "private") {
    const { ApiError } = await import("../utils/ApiError.js");
    throw ApiError.notFound("This form is not available");
  }
  return computeForForm(form);
}

async function computeForForm(form) {
  /* La serie diaria sale de la MISMA consulta SQL que alimenta el heatmap y
     los formularios destacados: `to_char(submitted_at, 'YYYY-MM-DD')` en la
     zona de la base. Antes se derivaba de `submittedAt` en JS con
     `toISOString()`, que usa UTC y adelantaba un día los envíos de la tarde;
     así «Días con más actividad» y el «Mejor día» del tooltip podían discrepar. */
  const [responses, timeline] = await Promise.all([
    listResponsesByForm(form._id),
    timelineByForms([form._id]),
  ]);

  const totalResponses = responses.length;
  const views = form.views || 0;
  const conversionRate = views ? Math.round((totalResponses / views) * 100) : 0;

  const answerableCount = form.questions.filter(
    (q) => !STATIC_FIELD_TYPES.includes(q.type),
  ).length;

  const completionRate = computeCompletionRate(responses, answerableCount);

  const avgCompletionTime = totalResponses
    ? Math.round(
        responses.reduce((sum, r) => sum + (r.completionTime || 0), 0) /
          totalResponses,
      )
    : 0;

  return {
    stats: {
      totalResponses,
      views,
      conversionRate,
      completionRate,
      avgCompletionTime,
    },
    timeline,
    questions: buildQuestionAnalytics(form, responses),
  };
}

function computeCompletionRate(responses, answerableCount) {
  if (!responses.length || !answerableCount) return 0;
  const total = responses.reduce(
    (sum, r) =>
      sum + Math.min(r.answers.length, answerableCount) / answerableCount,
    0,
  );
  return Math.round((total / responses.length) * 100);
}

/* ── Texto «Otros» ────────────────────────────────────────────────────────
   Una respuesta puede guardar el texto libre de la persona de dos formas:
   · `otherText` junto a `value` (el campo condicional `_other` del frontal);
   · anidado en el valor de la opción marcada `isOther` (clasificación por
     escala: `{ [opcionId]: { value, otherText } }`).
   El desglose debe enseñar ese texto como respuesta efectiva, agrupando los
   textos idénticos y manteniendo separados los distintos. Si no hay texto
   recuperable, se conserva la etiqueta genérica («Otros»). */

const ETIQUETAS_OTROS = new Set([
  "other",
  "others",
  "otro",
  "otra",
  "otros",
  "otras",
]);

function normalizarEtiqueta(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function esOpcionOtros(opcion) {
  if (!opcion || typeof opcion !== "object") return false;
  if (opcion.isOther === true) return true;
  const crudo =
    opcion.value !== undefined && opcion.value !== null && opcion.value !== ""
      ? opcion.value
      : opcion.label;
  return ETIQUETAS_OTROS.has(normalizarEtiqueta(crudo));
}

/* Mismo criterio que `optionAnswerValue` del frontal: `value` si existe,
   si no `label`, si no `id`. */
function valorDeOpcion(opcion, indice = 0) {
  if (opcion?.value !== undefined && opcion?.value !== null && opcion?.value !== "") {
    return String(opcion.value);
  }
  if (opcion?.label !== undefined && opcion?.label !== null && opcion?.label !== "") {
    return String(opcion.label);
  }
  return String(opcion?.id ?? indice);
}

function textoOtrosDe(respuesta) {
  return typeof respuesta?.otherText === "string" && respuesta.otherText.trim() !== ""
    ? respuesta.otherText.trim()
    : null;
}

/* Valores que disparan el texto «Otros»: la opción marcada `isOther` y la
   condición de mismo campo configurada por el autor. `__other__` es el
   marcador interno de la clasificación por escala (se resuelve anidado). */
function valoresDisparadores(q) {
  const valores = new Set();
  const cond = q?.visibleIf?.sameFieldCondition;
  if (cond && cond !== "__other__") valores.add(String(cond));
  for (const opcion of q?.options || []) {
    if (esOpcionOtros(opcion)) valores.add(valorDeOpcion(opcion));
  }
  return valores;
}

function valoresEfectivos(q, respuesta) {
  const crudo = respuesta?.value;
  if (crudo === undefined || crudo === null || crudo === "") return [];
  const seleccion = Array.isArray(crudo) ? crudo : [crudo];
  const texto = textoOtrosDe(respuesta);
  const disparadores = valoresDisparadores(q);

  return seleccion.map((sel) => {
    if (sel !== null && typeof sel === "object") {
      const anidado = textoOtrosDe(sel);
      if (anidado) return anidado;
      if (sel.value === "other" && texto) return texto;
      return sel;
    }
    if (texto && disparadores.has(String(sel))) return texto;
    return sel;
  });
}

/* Exportada para las sondas de `qa/`: es pura (recibe formulario y respuestas),
   así que se puede comprobar el desglose sin tocar la base de datos. */
export function buildQuestionAnalytics(form, responses) {
  /* El denominador de TODA la analítica es el número de respuestas enviadas:
     la misma cifra que muestra el KPI de la encuesta. Cada pregunta declara
     además cuántas de esas respuestas la contestaron (`total`) y cuántas la
     dejaron en blanco (`skipped`), para que el desglose sea transparente y
     todas las tarjetas partan del mismo total. */
  const totalResponses = responses.length;
  return form.questions
    .filter((q) => !STATIC_FIELD_TYPES.includes(q.type))
    .map((q) => {
      const values = responses
        .map((r) => r.answers.find((a) => a.questionId === q.id)?.value)
        .filter((v) => v !== undefined && v !== null && v !== "");

      const answered = values.length;
      const base = {
        id: q.id,
        label: q.label,
        type: q.type,
        total: answered,
        responses: totalResponses,
        skipped: Math.max(0, totalResponses - answered),
      };

      if (isCatalogQuestion(q)) {
        const tally = new Map();
        for (const respuesta of responses) {
          const contesta = respuesta.answers.find((a) => a.questionId === q.id);
          if (!contesta) continue;
          for (const sel of valoresEfectivos(q, contesta)) {
            tally.set(String(sel), (tally.get(String(sel)) || 0) + 1);
          }
        }
        return {
          ...base,
          breakdown: [...tally.entries()].map(([label, count]) => ({ label, count })),
        };
      }

      /* Un ranking se cuenta al revés que una elección. En `checkbox` da igual
         cuántas veces marques "A"; en un orden, que lo coloquen 4 de cada 5
         veces es un dato distinto de que lo pusieran 1º una vez y 5º cuatro. La
         cifra que resume un ranking es la posición media: 1.0 es siempre lo
         primero, 5.0 siempre lo último. Se cuenta además cuántas respuestas lo
         mencionaron, porque en un orden parcial no todos colocan lo mismo. */
      if (q.type === "rank") {
        const puestos = new Map(); // etiqueta -> { suma, veces }
        for (const v of values) {
          if (!Array.isArray(v)) continue;
          v.forEach((etiqueta, i) => {
            const previo = puestos.get(etiqueta) || { suma: 0, veces: 0 };
            previo.suma += i + 1;
            previo.veces += 1;
            puestos.set(etiqueta, previo);
          });
        }
        return {
          ...base,
          breakdown: [...puestos.entries()]
            .map(([label, { suma, veces }]) => ({
              label,
              count: veces,
              averageRank: Number((suma / veces).toFixed(2)),
            }))
            .sort((a, b) => a.averageRank - b.averageRank),
        };
      }

      /* Clasificación por escala: el valor es un mapa `{ opcionId: puntos }`
         donde la opción «Otros» guarda además el texto libre. El desglose se
         hace por opción, sustituyendo el texto «Otros» por lo que escribió la
         persona (y agrupando textos idénticos). */
      if (q.type === "importancia") {
        const opciones = [...(q.options || [])];
        if (
          q.conditionalOption?.id &&
          !opciones.some((o) => o.id === q.conditionalOption.id)
        ) {
          opciones.push({
            id: q.conditionalOption.id,
            label: q.conditionalOption.label || "",
          });
        }
        const porEtiqueta = new Map(); // etiqueta -> { count, suma, puntuadas }
        for (const respuesta of responses) {
          const contesta = respuesta.answers.find((a) => a.questionId === q.id);
          if (!contesta) continue;
          const valor = contesta.value;
          if (valor === null || typeof valor !== "object" || Array.isArray(valor)) continue;

          for (const [id, entrada] of Object.entries(valor)) {
            if (entrada === undefined || entrada === null || entrada === "") continue;
            const opcion = opciones.find((o) => o.id === id);
            let etiqueta = opcion?.label ?? id;
            const textoAnidado =
              entrada !== null && typeof entrada === "object" && typeof entrada.otherText === "string"
                ? entrada.otherText.trim()
                : "";
            if (opcion && esOpcionOtros(opcion) && textoAnidado !== "") {
              etiqueta = textoAnidado;
            }

            const previo = porEtiqueta.get(etiqueta) || { count: 0, suma: 0, puntuadas: 0 };
            previo.count += 1;
            const puntos =
              entrada !== null && typeof entrada === "object"
                ? Number(entrada.value ?? entrada.priority)
                : Number(entrada);
            if (Number.isFinite(puntos)) {
              previo.suma += puntos;
              previo.puntuadas += 1;
            }
            porEtiqueta.set(etiqueta, previo);
          }
        }
        return {
          ...base,
          breakdown: [...porEtiqueta.entries()].map(
            ([label, { count, suma, puntuadas }]) => ({
              label,
              count,
              ...(puntuadas ? { averageScore: Number((suma / puntuadas).toFixed(2)) } : {}),
            }),
          ),
        };
      }

      if (OPTION_FIELD_TYPES.includes(q.type)) {
        const tally = new Map((q.options || []).map((o) => [o.label, 0]));
        for (const respuesta of responses) {
          const contesta = respuesta.answers.find((a) => a.questionId === q.id);
          if (!contesta) continue;
          for (const sel of valoresEfectivos(q, contesta)) {
            tally.set(sel, (tally.get(sel) || 0) + 1);
          }
        }
        return {
          ...base,
          breakdown: [...tally.entries()].map(([label, count]) => ({
            label,
            count,
          })),
        };
      }

      if (RATING_TYPES.includes(q.type) || q.type === "number") {
        const nums = values.map(Number).filter((n) => !Number.isNaN(n));
        const average = nums.length
          ? Number((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2))
          : 0;

        const distribution = new Map();
        for (const n of nums)
          distribution.set(n, (distribution.get(n) || 0) + 1);
        return {
          ...base,
          average,
          breakdown: [...distribution.entries()]
            .sort(([a], [b]) => a - b)
            .map(([label, count]) => ({ label: String(label), count })),
        };
      }

      if (q.type === "yes_no") {
        const yes = values.filter((v) => {
          if (v === true || v === 1 || v === "1") return true;
          const n = String(v)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
          return n === "yes" || n === "si" || n === "true" || n === "y" || n === "s";
        }).length;
        return {
          ...base,
          breakdown: [
            { label: "Yes", count: yes },
            { label: "No", count: values.length - yes },
          ],
        };
      }

      return { ...base, samples: values.map(String).reverse() };
    });
}

function isCatalogQuestion(q) {
  if (CATALOG_FIELD_TYPES.includes(q.type)) return true;
  if (!["dropdown", "radio"].includes(q.type)) return false;
  return Boolean(catalogTypeFor(q.label));
}
