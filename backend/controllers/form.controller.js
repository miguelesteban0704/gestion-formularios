import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import * as formService from "../services/form.service.js";
import { auditNow } from "../middleware/rbac.js";

export const getForms = asyncHandler(async (req, res) => {
  const { search, filter, visibility } = req.query;
  const forms = await formService.listFormsScoped(req.user, { search, filter, visibility });
  sendSuccess(res, { data: { forms } });
});

export const getForm = asyncHandler(async (req, res) => {
  const form = await formService.getFormById(req.params.id, req.user);
  sendSuccess(res, { data: { form } });
});

export const getPublicForm = asyncHandler(async (req, res) => {
  await formService.registerView(req.params.slug);
  const form = await formService.getPublicForm(req.params.slug);
  sendSuccess(res, { data: { form } });
});

// ── Escaparate de invitados (SIN sesión) ────────────────────────────────────
// Públicos y privados visibles en el listado; el detalle de un privado no
// entrega preguntas (requiresAuth: true) hasta validar identidad en el IDP.
// `listedOnly: true`: el escaparate nunca muestra los "privados"
// (unlisted). Los consumidores internos de metrics/insights no pasan el flag
// y siguen contándolos.
export const guestListForms = asyncHandler(async (req, res) => {
  const { search, entityId, visibility } = req.query;
  const forms = await formService.listGuestForms({ search, entityId, visibility, listedOnly: true });
  sendSuccess(res, { data: { forms, count: forms.length } });
});

export const guestGetForm = asyncHandler(async (req, res) => {
  await formService.registerView(req.params.slug);
  const form = await formService.getGuestFormDetail(req.params.slug, req.respondent);
  sendSuccess(res, { data: { form } });
});


export const createForm = asyncHandler(async (req, res) => {
  const form = await formService.createForm(req.user, req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: "Form created",
    data: { form },
  });
});

export const updateForm = asyncHandler(async (req, res) => {
  const form = await formService.updateForm(
    req.params.id,
    req.user,
    req.body,
  );
  sendSuccess(res, { message: "Form saved", data: { form } });
});

// ─── POST /api/forms/:id/logo ────────────────────────────────────────────────
// El archivo llega en `req.file` (multer, en memoria). Devuelve el formulario
// entero ya actualizado para que el front no tenga que adivinar la ruta final.
export const uploadFormLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No se recibio ningun archivo.");

  // Solo se pasan el buffer y el mimetype. El nombre original NO se reenvía al
  // servicio: la extensión la decide el servidor a partir del Content-Type, de
  // modo que un nombre manipulado no decide nada.
  const form = await formService.setFormLogo(req.params.id, req.user, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });

  sendSuccess(res, { message: "Logo actualizado", data: { form } });
});

// ─── DELETE /api/forms/:id/logo ──────────────────────────────────────────────
export const deleteFormLogo = asyncHandler(async (req, res) => {
  const form = await formService.clearFormLogo(req.params.id, req.user);
  sendSuccess(res, { message: "Logo eliminado", data: { form } });
});

// ─── PATCH /api/forms/:id/visibility ─────────────────────────────────────────
// Endpoint dedicado para que el cambio de visibilidad quede auditado en un solo
// camino (el autosave del Builder ya no la escribe). Solo registra el evento si
// hay cambio real.
export const setFormVisibility = asyncHandler(async (req, res) => {
  const { form, from, to } = await formService.setVisibility(
    req.params.id,
    req.user,
    req.body?.visibility,
  );
  if (from !== to) {
    await auditNow(req, "form.visibility.changed", {
      entityType: "form",
      entityId: form._id,
      from,
      to,
    });
  }
  sendSuccess(res, { message: "Visibility updated", data: { form } });
});

export const publishForm = asyncHandler(async (req, res) => {
  const shouldPublish = req.body.publish !== false;
  const form = await formService.setPublishState(
    req.params.id,
    req.user,
    shouldPublish,
  );
  sendSuccess(res, {
    message: shouldPublish ? "Form published" : "Form unpublished",
    data: { form },
  });
});

export const duplicateForm = asyncHandler(async (req, res) => {
  const form = await formService.duplicateForm(req.params.id, req.user);
  sendSuccess(res, {
    statusCode: 201,
    message: "Form duplicated",
    data: { form },
  });
});

export const deleteForm = asyncHandler(async (req, res) => {
  await formService.deleteForm(req.params.id, req.user);
  sendSuccess(res, { message: "Form deleted" });
});

export const getPublicForms = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const forms = await formService.listPublicForms(req.user, { search });
  sendSuccess(res, { data: { forms } });
});