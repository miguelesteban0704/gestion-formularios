import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getInsights, getInbox } from "../services/insights.service.js";

/**
 * Estadísticas: vetadas a form_creator. El super_admin SÍ entra en el
 * agregado general (`/insights`) y en la bandeja general (`/inbox`): su
 * superficie —el panel de formularios públicos— es de solo lectura sobre lo
 * público, así que la bandeja le entrega los publicados públicos de todas las
 * entidades (nunca los privados, que son del dueño del formulario).
 */
function blockStats(req) {
  if (req.user?.role === "form_creator") {
    throw ApiError.forbidden("Tu rol no tiene acceso a estadísticas");
  }
}

/** Bandeja: mismo veto por rol que las estadísticas. */
function blockInbox(req) {
  blockStats(req);
}

export const insights = asyncHandler(async (req, res) => {
  blockStats(req);
  const data = await getInsights(req.user);
  sendSuccess(res, { data: { insights: data } });
});

export const inbox = asyncHandler(async (req, res) => {
  blockInbox(req);
  const responses = await getInbox(req.user, {
    search: req.query.search || "",
  });
  sendSuccess(res, { data: { responses, count: responses.length } });
});
