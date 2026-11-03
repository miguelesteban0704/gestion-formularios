import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { query } from "../config/db.js";
import { nanoid } from "../utils/nanoid.js";
import { signToken, generateJti, getTokenExpiryDate } from "../utils/token.js";
import { getClientIp, parseDeviceInfo } from "./auth.controller.js";
import * as sessionRepo from "../repositories/session.repo.js";
import * as responseRepo from "../repositories/response.repo.js";
import { findPublishedBySlug } from "../repositories/form.repo.js";
import { getPublicFormAnalytics } from "../services/analytics.service.js";
import { getPublicInsights } from "../services/insights.service.js";
import { responsesToCsv } from "../utils/csv.js";

/**
 * Superficie de invitados: sesión anónima autoemitida + lectura pública.
 * La sesión invitado es una cuenta real sin clave (`external_id guest-*`),
 * así el constructor, la IA y las plantillas reutilizan los mismos caminos
 * con dueño propio. Sus reglas viven en `canSeeStats` (solo públicos).
 */

export const guestSession = asyncHandler(async (req, res) => {
  const tag = nanoid(6);
  const { rows } = await query(
    `INSERT INTO users (name, external_id, avatar_color)
     VALUES ($1, $2, '#64748b') RETURNING *`,
    [`Invitado ${tag.toUpperCase()}`, `guest-${nanoid(12)}`],
  );
  const row = rows[0];
  const jti = generateJti();
  const token = signToken({ id: row.id, jti });
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "";
  try {
    await sessionRepo.createSession({
      userId: row.id,
      jti,
      deviceInfo: { ...parseDeviceInfo(userAgent), ip, authMethod: "guest" },
      ip,
      userAgent,
      expiresAt: getTokenExpiryDate(),
    });
  } catch (e) {
    console.warn("[guest] no se pudo registrar sesión:", e.message);
  }
  sendSuccess(res, {
    statusCode: 201,
    data: {
      token,
      user: {
        _id: row.id,
        name: row.name,
        email: null,
        role: null,
        entityId: null,
        isGuest: true,
      },
    },
  });
});

/** Estadísticas generales públicas (mismo cómputo que el panel, sin privados). */
export const guestInsights = asyncHandler(async (_req, res) => {
  const data = await getPublicInsights();
  sendSuccess(res, { data: { insights: data } });
});

/** Estadísticas de un formulario PÚBLICO (lo privado: 404, sin distinción). */
export const guestFormStats = asyncHandler(async (req, res) => {
  const form = await findPublishedBySlug(req.params.slug);
  const analytics = await getPublicFormAnalytics(form);
  sendSuccess(res, { data: { analytics, title: form.title } });
});

/** CSV de un formulario PÚBLICO para investigación del invitado. */
export const guestFormExport = asyncHandler(async (req, res) => {
  const form = await findPublishedBySlug(req.params.slug);
  if (!form || (form.visibility || "public") === "private") {
    const { ApiError } = await import("../utils/ApiError.js");
    throw ApiError.notFound("This form is not available");
  }
  const responses = await responseRepo.listResponsesByForm(form._id);
  const csv = responsesToCsv(form, responses);
  const filename = `${form.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_responses.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});
