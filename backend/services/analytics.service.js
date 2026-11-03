import { listResponsesByForm } from "../repositories/response.repo.js";
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
  const responses = await listResponsesByForm(form._id);

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
    timeline: buildTimeline(responses),
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

function buildTimeline(responses) {
  const counts = new Map();
  for (const r of responses) {
    const key = new Date(r.submittedAt).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function buildQuestionAnalytics(form, responses) {
  return form.questions
    .filter((q) => !STATIC_FIELD_TYPES.includes(q.type))
    .map((q) => {
      const values = responses
        .map((r) => r.answers.find((a) => a.questionId === q.id)?.value)
        .filter((v) => v !== undefined && v !== null && v !== "");

      const base = {
        id: q.id,
        label: q.label,
        type: q.type,
        total: values.length,
      };

      if (isCatalogQuestion(q)) {
        const tally = new Map();
        for (const v of values) {
          const selected = Array.isArray(v) ? v : [v];
          for (const sel of selected) tally.set(String(sel), (tally.get(String(sel)) || 0) + 1);
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

      if (OPTION_FIELD_TYPES.includes(q.type)) {
        const tally = new Map(q.options.map((o) => [o.label, 0]));
        for (const v of values) {
          const selected = Array.isArray(v) ? v : [v];
          for (const sel of selected) tally.set(sel, (tally.get(sel) || 0) + 1);
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
