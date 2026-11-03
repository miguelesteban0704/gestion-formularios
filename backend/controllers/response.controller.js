import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import * as responseService from "../services/response.service.js";
import { getFormAnalytics } from "../services/analytics.service.js";
import { responsesToCsv } from "../utils/csv.js";
import { verifyToken } from "../utils/token.js";
import { findUserById } from "../repositories/user.repo.js";
import { getOwnedForm } from "../services/form.service.js";
import { addClient, removeClient } from "../utils/realtime.js";
import { ApiError } from "../utils/ApiError.js";

export const submitResponse = asyncHandler(async (req, res) => {
  const { answers, completionTime } = req.body;
  const meta = {
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip || "",
  };
  const response = await responseService.submitResponse(req.params.slug, {
    answers,
    completionTime,
    meta,
    respondent: req.respondent || null,
  });
  sendSuccess(res, {
    statusCode: 201,
    message: "Response recorded",
    data: { id: response._id },
  });
});

export const getResponses = asyncHandler(async (req, res) => {
  const responses = await responseService.listResponses(
    req.params.id,
    req.user,
    {
      search: req.query.search || "",
    },
  );
  sendSuccess(res, { data: { responses, count: responses.length } });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getFormAnalytics(req.params.id, req.user);
  sendSuccess(res, { data: { analytics } });
});

export const deleteResponse = asyncHandler(async (req, res) => {
  await responseService.deleteResponse(req.params.id, req.user);
  sendSuccess(res, { message: "Response deleted" });
});

export const exportResponses = asyncHandler(async (req, res) => {
  const { form, responses } = await responseService.exportResponses(
    req.params.id,
    req.user,
  );
  const csv = responsesToCsv(form, responses);
  const filename = `${form.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_responses.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

export const streamResponses = asyncHandler(async (req, res) => {
  // EventSource no manda Authorization header, permite token por query
  const headerToken = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
  const queryToken = req.query.token;
  const token = headerToken || queryToken;
  if (!token) throw ApiError.unauthorized("Authentication required");
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
  const user = await findUserById(decoded.id);
  if (!user) throw ApiError.unauthorized("User no longer exists");
  // Verifica ownership del formulario
  await getOwnedForm(req.params.id, user);

  const formId = String(req.params.id);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.write(`: connected\n\n`);
  // Envía un ping inicial y luego cada 15s para mantener vivo
  const ping = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch {}
  }, 15000);

  addClient(formId, res);

  const onClose = () => {
    clearInterval(ping);
    removeClient(formId, res);
    try { res.end(); } catch {}
  };
  req.on("close", onClose);
  req.on("error", onClose);
});
