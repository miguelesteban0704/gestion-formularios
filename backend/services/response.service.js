import { ApiError } from "../utils/ApiError.js";
import { getStatsForm } from "./form.service.js";
import * as formRepo from "../repositories/form.repo.js";
import * as responseRepo from "../repositories/response.repo.js";
import { OPTION_FIELD_TYPES, STATIC_FIELD_TYPES, CATALOG_FIELD_TYPES, catalogTypeFor } from "../utils/constants.js";
import { isQuestionVisible, isConsentDeclined } from "../utils/visibility.js";
import { broadcast } from "../utils/realtime.js";
import { validatePhone, countryFromPattern } from "../utils/phoneRules.js";

export async function submitResponse(
  slug,
  { answers = [], completionTime = 0, meta = {}, respondent = null },
) {
  const form = await formRepo.findPublishedBySlug(slug);
  if (!form) throw ApiError.notFound("This form is not accepting responses");

  // Regla de visibilidad: lo público es anónimo y libre; lo privado exige
  // identidad del IDP (respondent verificado por el flujo /f/:slug).
  let respondentSub = null;
  let respondentName = null;
  let respondentEmail = null;
  let respondentUsername = null;
  if ((form.visibility || "public") === "private") {
    if (!respondent?.sub) {
      throw ApiError.unauthorized("Este formulario requiere autenticación con el IDP");
    }
    respondentSub = respondent.sub;
    respondentName = respondent.name || respondent.email || respondent.sub;
    respondentEmail = respondent.email || null;
    respondentUsername = respondent.username || null;
  } else if (respondent?.sub) {
    // Un público respondido tras pasar por el IDP conserva la trazabilidad.
    respondentSub = respondent.sub;
    respondentName = respondent.name || respondent.email || respondent.sub;
    respondentEmail = respondent.email || null;
    respondentUsername = respondent.username || null;
  }

  const answerById = new Map(answers.map((a) => [a.questionId, a.value]));
  const normalized = [];

  /* Puerta de consentimiento: si la persona dijo que No, se guarda SOLO esa
     respuesta y no se exige nada más (ni siquiera lo obligatorio, que no llegó
     a ver). Queda marcada como declinada para poder medir la participación. */
  const gate = form.questions.find((q) => q?.isConsentGate && !STATIC_FIELD_TYPES.includes(q.type));
  const declined = gate ? isConsentDeclined(gate, answerById.get(gate.id)) : false;

  for (const q of form.questions) {
    if (STATIC_FIELD_TYPES.includes(q.type)) continue;

    /* En declinada solo viaja la puerta: lo demás, aunque venga, es de una
       pantalla que la persona no vio. */
    if (declined && q.id !== gate.id) continue;

    /* Lo oculto por condición no existe para quien responde: no es
       obligatorio, no se valida y no se guarda aunque venga en el envío. Es el
       espejo del navegador, que ya lo borra al ocultar; esto cubre el envío
       directo a la API. */
    if (!declined && !isQuestionVisible(q, answerById)) continue;

    const value = answerById.get(q.id);
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (q.required && isEmpty) {
      throw ApiError.badRequest(`"${q.label}" is required`);
    }
    if (isEmpty) continue;

    validateAnswer(q, value);
    normalized.push({ questionId: q.id, label: q.label, type: q.type, value });
  }

  const response = await responseRepo.createResponse({
    form: form._id,
    answers: normalized,
    completionTime,
    meta: declined ? { ...meta, declined: true } : meta,
    respondentSub,
    respondentName,
    respondentEmail,
    respondentUsername,
  });

  await formRepo.incrementResponseCount(form._id, 1);
  // Tiempo real: notifica a todos los suscritos a este formulario con exactitud
  try {
    broadcast(String(form._id), "response_created", {
      response: {
        _id: response._id,
        form: response.form,
        answers: response.answers,
        completionTime: response.completionTime,
        meta: response.meta,
        submittedAt: response.submittedAt,
      },
      formId: String(form._id),
      timestamp: new Date().toISOString(),
    });
  } catch {}
  return response;
}

function validateAnswer(q, value) {
  const v = q.validation || {};
  const asString = Array.isArray(value) ? value.join(",") : String(value);

  if (q.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asString)) {
    throw ApiError.badRequest(
      v.message || `"${q.label}" must be a valid email`,
    );
  }
  if (q.type === "url" && !/^https?:\/\/.+/.test(asString)) {
    throw ApiError.badRequest(v.message || `"${q.label}" must be a valid URL`);
  }
  /* Teléfono: la validación por país del autor/respondiente manda; el `pattern`
     guardado sirve además para deducir el país en formularios guardados antes de
     la clave `validation.phone` (así un form viejo no se afloja). */
  if (q.type === "phone" && v.pattern) {
    const phone = v.phone || {};
    const implied = !phone.mode ? countryFromPattern(v.pattern) : null;
    const result = validatePhone(asString, {
      fixedCountry: phone.country || implied?.code || null,
      mode: phone.mode || (implied ? "fixed" : "any"),
    });
    if (!result.ok) {
      throw ApiError.badRequest(v.message || `"${q.label}" is not a valid phone number`);
    }
  }
  if (v.minLength != null && asString.length < v.minLength) {
    throw ApiError.badRequest(v.message || `"${q.label}" is too short`);
  }
  if (v.maxLength != null && asString.length > v.maxLength) {
    throw ApiError.badRequest(v.message || `"${q.label}" is too long`);
  }
  if (q.type === "number") {
    const num = Number(value);
    if (Number.isNaN(num))
      throw ApiError.badRequest(`"${q.label}" must be a number`);
    if (v.min != null && num < v.min)
      throw ApiError.badRequest(v.message || `"${q.label}" is too small`);
    if (v.max != null && num > v.max)
      throw ApiError.badRequest(v.message || `"${q.label}" is too large`);
  }
  if (v.pattern && q.type !== "phone") {
    try {
      if (!new RegExp(v.pattern).test(asString)) {
        throw ApiError.badRequest(v.message || `"${q.label}" is invalid`);
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  }
  /* Un ranking es un array de etiquetas ordenadas de mejor a peor: la posición
     en el array ES el puesto. El bloque genérico de abajo ya valida que cada
     etiqueta sea una opción real, pero se traga los repetidos — y un ranking con
     "A, A, B" no dice nada. Se comprueba aquí, antes de llegar allí. */
  if (q.type === "rank" && Array.isArray(value)) {
    const yaPuestas = new Set();
    for (const etiqueta of value) {
      if (yaPuestas.has(etiqueta)) {
        throw ApiError.badRequest(
          `"${q.label}" has "${etiqueta}" in two different positions`,
        );
      }
      yaPuestas.add(etiqueta);
    }
  }
  if (OPTION_FIELD_TYPES.includes(q.type) && q.options.length && !isCatalogQuestion(q)) {
    const allowed = new Set(q.options.map((o) => o.label));
    const selected = Array.isArray(value) ? value : [value];
    for (const sel of selected) {
      if (!allowed.has(sel)) {
        throw ApiError.badRequest(
          `"${sel}" is not a valid choice for "${q.label}"`,
        );
      }
    }
  }
}

export async function listResponses(formId, actorOrId, { search = "" } = {}) {
  await getStatsForm(formId, actorOrId);
  const responses = await responseRepo.listResponsesByForm(formId);

  if (!search.trim()) return responses;

  const needle = search.trim().toLowerCase();
  return responses.filter((r) =>
    r.answers.some((a) => {
      const val = Array.isArray(a.value)
        ? a.value.join(" ")
        : String(a.value ?? "");
      return val.toLowerCase().includes(needle);
    }),
  );
}

export async function deleteResponse(responseId, actorOrId) {
  const response = await responseRepo.findResponseById(responseId);
  if (!response) throw ApiError.notFound("Response not found");

  await getStatsForm(response.form, actorOrId);
  await responseRepo.deleteResponse(responseId);
  await formRepo.incrementResponseCount(response.form, -1);
  try {
    broadcast(String(response.form), "response_deleted", { responseId, formId: String(response.form) });
  } catch {}
}

export async function exportResponses(formId, actorOrId) {
  const form = await getStatsForm(formId, actorOrId);
  const responses = await responseRepo.listResponsesByForm(formId);
  return { form, responses };
}

/* Un campo de catálogo lleva su lista puesta por la aplicación, no por el autor:
   validar la respuesta contra `options` rechazaría cualquier valor real. El
   criterio (tipo o etiqueta) vive en `catalogTypeFor`/`CATALOG_FIELD_TYPES` para
   que analítica, validación y generador no tengan cada uno el suyo. */
function isCatalogQuestion(q) {
  if (CATALOG_FIELD_TYPES.includes(q.type)) return true;
  if (!["dropdown", "radio"].includes(q.type)) return false;
  return Boolean(catalogTypeFor(q.label));
}