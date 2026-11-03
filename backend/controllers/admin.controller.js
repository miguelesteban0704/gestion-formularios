import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { query } from "../config/db.js";
import * as userRepo from "../repositories/user.repo.js";
import * as sessionRepo from "../repositories/session.repo.js";
import * as entityRepo from "../repositories/entity.repo.js";
import * as accessUrlRepo from "../repositories/accessUrl.repo.js";
import * as auditRepo from "../repositories/audit.repo.js";
import * as formRepo from "../repositories/form.repo.js";
import * as responseRepo from "../repositories/response.repo.js";
import { getFormAnalytics } from "../services/analytics.service.js";
import { computeInsights } from "../services/insights.service.js";
import { responsesToCsv } from "../utils/csv.js";
import { randomAccessSlug, sealAccessContext } from "../utils/urlCrypto.js";
import { getAccessUrlContext, assertAccessUrlFor } from "../services/accessUrl.service.js";
import { isMailConfigured } from "../services/mail.service.js";
import { resendWelcomeEmail } from "../services/welcome.service.js";
import { ROLES, MANAGEABLE_ROLES, auditNow } from "../middleware/rbac.js";

/**
 * Panel del super_admin (+ estadísticas de entidad para entity_admin).
 * Todo aquí exige rol explícito: las cuentas legacy (sin rol) no entran
 * hasta que el super_admin les asigne uno.
 */

// ── Portal oculto del super_admin ───────────────────────────────────────────
import { getLoginPortalSlug, regenerateLoginPortal } from "../utils/bootstrap.js";

/** Verifica el slug del portal sin revelar nada (ok / 404 idéntico). */
export const verifyLoginPortal = asyncHandler(async (req, res) => {
  const { slug } = z.object({ slug: z.string().min(1).max(120) }).parse(req.body);
  const current = await getLoginPortalSlug();
  if (!current || slug !== current) throw ApiError.notFound("Route not found");
  sendSuccess(res, { data: { ok: true, slug: current } });
});

/** Reafirma la URL fija del portal (no cambia la dirección). */
export const rotateLoginPortal = asyncHandler(async (req, res) => {
  const slug = await regenerateLoginPortal();
  await auditNow(req, "settings.portal.rotate", { entityType: "settings" });
  sendSuccess(res, { message: "URL fija del portal", data: { slug } });
});

/** Devuelve la URL de acceso actual del portal del super_admin. */
export const getLoginPortalSlugRoute = asyncHandler(async (req, res) => {
  const slug = await getLoginPortalSlug();
  if (!slug) throw ApiError.notFound("No hay portal de acceso configurado");
  sendSuccess(res, { message: "URL de acceso del portal", data: { slug } });
});

// ── Usuarios ────────────────────────────────────────────────────────────────
export const listUsers = asyncHandler(async (req, res) => {
  const { search = "", role = "", entityId = "" } = req.query;
  const users = await userRepo.listUsers({ search, role, entityId });
  sendSuccess(res, { data: { users, count: users.length } });
});

const adminUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum([...MANAGEABLE_ROLES, ROLES.SUPER]).optional(),
  entityId: z.string().uuid().nullable().optional(),
  accessUrlId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = adminUpdateSchema.parse(req.body);
  const target = await userRepo.findUserById(req.params.id);
  if (!target) throw ApiError.notFound("Usuario no encontrado");

  const nextRole = data.role ?? target.role;
  const nextEntityId = data.entityId === undefined ? target.entityId : data.entityId;
  if (nextRole === ROLES.ENTITY && !nextEntityId) {
    throw ApiError.badRequest("Un entity_admin necesita entidad asignada");
  }
  if (nextRole === ROLES.ENTITY && await userRepo.findEntityAdminByEntity(nextEntityId, target._id)) {
    throw ApiError.conflict("Esta entidad ya tiene un administrador");
  }
  // Correlación cuenta ↔ URL de acceso al editar: si el rol o la entidad
  // cambian respecto al estado actual, el vínculo anterior deja de
  // corresponder. Se exige uno nuevo válido o se limpia para no arrastrar
  // una correlación incoherente. Un super_admin nunca lleva URL.
  const pairChanged =
    nextRole !== (target.role || null) ||
    (nextEntityId || null) !== (target.entityId || null) ||
    nextRole === ROLES.SUPER;
  if (data.accessUrlId) {
    if (pairChanged || data.accessUrlId !== target.accessUrlId) {
      await assertAccessUrlFor({ accessUrlId: data.accessUrlId, entityId: nextEntityId, role: nextRole });
    }
  } else if (data.accessUrlId === null || pairChanged) {
    data.accessUrlId = null;
  }
  // Protección del único super_admin: no degradarlo ni desactivarlo.
  if (target.role === ROLES.SUPER) {
    const total = await userRepo.countByRole(ROLES.SUPER);
    if (total <= 1 && (data.role !== undefined || data.isActive === false)) {
      throw ApiError.forbidden("No puedes degradar al único super_admin");
    }
  }
  let user;
  try {
    user = await userRepo.adminUpdateUser(target._id, data);
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_entity_admin_entity_unique_idx") {
      throw ApiError.conflict("Esta entidad ya tiene un administrador");
    }
    throw error;
  }

  // Cambio de rol, de entidad o desactivación: la identidad de la cuenta
  // cambia, así que las sesiones del usuario dejan de ser válidas. Se revocan
  // todas excepto la del super_admin que está editando (no le cierro su propia
  // sessón mientras gestiona).
  const roleChanged = nextRole !== (target.role || null);
  const entityChanged = (nextEntityId || null) !== (target.entityId || null);
  const deactivated = data.isActive === false;
  if (roleChanged || entityChanged || deactivated) {
    const currentJti = req.token?.jti;
    if (currentJti) await sessionRepo.deactivateAllExcept(target._id, currentJti);
    else await sessionRepo.deactivateAllByUser(target._id);
    await auditNow(req, "session.revoked", {
      entityType: "user",
      entityId: target._id,
      reason: roleChanged ? "role" : entityChanged ? "entity" : deactivated ? "deactivated" : "admin",
    });
  }
  await auditNow(req, "user.update", { entityType: "user", entityId: user._id, ...data });
  sendSuccess(res, { message: "Usuario actualizado", data: { user } });
});

export const removeUser = asyncHandler(async (req, res) => {
  const target = await userRepo.findUserById(req.params.id);
  if (!target) throw ApiError.notFound("Usuario no encontrado");
  if (target.role === ROLES.SUPER) {
    const total = await userRepo.countByRole(ROLES.SUPER);
    if (total <= 1) throw ApiError.forbidden("No puedes eliminar al único super_admin");
  }
  if (target._id === req.user._id) throw ApiError.forbidden("No puedes eliminarte a ti mismo");
  await userRepo.deleteUser(target._id);
  await auditNow(req, "user.delete", { entityType: "user", entityId: target._id });
  sendSuccess(res, { message: "Usuario eliminado" });
});

// Reenvía el correo de bienvenida/activación. La contraseña original no se puede
// reenviar (está hasheada): variante A firma un token nuevo, variante B genera
// una contraseña temporal nueva. Best-effort: nunca lanza por el correo.
export const resendWelcome = asyncHandler(async (req, res) => {
  const target = await userRepo.findUserById(req.params.id);
  if (!target) throw ApiError.notFound("Usuario no encontrado");
  if (target.role === ROLES.SUPER) {
    throw ApiError.badRequest("El super_admin no recibe correo de bienvenida");
  }
  const { language } = z
    .object({ language: z.enum(["es", "en"]).optional().default("es") })
    .parse(req.body || {});
  let mail = { sent: false, reason: "disabled", to: target.email };
  if (isMailConfigured()) {
    mail = await resendWelcomeEmail({ user: target, language });
    if (mail.preview) console.log(`[admin] correo reenviado · preview: ${mail.preview}`);
    await auditNow(req, mail.sent ? "user.welcome.resend" : "user.welcome.resend_failed", {
      entityType: "user",
      entityId: target._id,
      reason: mail.reason,
    });
  }
  sendSuccess(res, {
    message: mail.sent ? "Correo reenviado" : "No se pudo enviar el correo",
    data: { mail },
  });
});

// ── Entidades ───────────────────────────────────────────────────────────────
const entitySchema = z.object({  code: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(3).max(160),
  shortName: z.string().trim().max(32).nullish(),
  category: z.string().trim().min(2).max(60),
});

export const listEntities = asyncHandler(async (req, res) => {
  const { search = "", category = "", active = "" } = req.query;
  const entities = await entityRepo.listEntities({ search, category, active });
  sendSuccess(res, { data: { entities, count: entities.length } });
});

/** Catálogo público (activas) para el escaparate de invitados. Sin sesión. */
export const listEntitiesPublic = asyncHandler(async (_req, res) => {
  const entities = await entityRepo.listEntities({ active: true });
  sendSuccess(res, {
    data: {
      entities: entities.map((e) => ({ _id: e._id, code: e.code, name: e.name, category: e.category })),
    },
  });
});

export const createEntity = asyncHandler(async (req, res) => {
  const data = entitySchema.parse(req.body);
  const entity = await entityRepo.createEntity(data);
  await auditNow(req, "entity.create", { entityType: "entity", entityId: entity._id, ...data });
  sendSuccess(res, { statusCode: 201, message: "Entidad creada", data: { entity } });
});

export const updateEntity = asyncHandler(async (req, res) => {
  const data = entitySchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
  const entity = await entityRepo.updateEntity(req.params.id, data);
  if (!entity) throw ApiError.notFound("Entidad no encontrada");
  await auditNow(req, "entity.update", { entityType: "entity", entityId: entity._id, ...data });
  sendSuccess(res, { message: "Entidad actualizada", data: { entity } });
});

export const deleteEntity = asyncHandler(async (req, res) => {
  await entityRepo.deleteEntity(req.params.id);
  await auditNow(req, "entity.delete", { entityType: "entity", entityId: req.params.id });
  sendSuccess(res, { message: "Entidad eliminada" });
});

// ── Categorías de formularios ───────────────────────────────────────────────
const categorySchema = z.object({
  code: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
  name_es: z.string().trim().min(2).max(120),
  name_en: z.string().trim().max(120).optional().default(""),
});

export const listCategories = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT * FROM form_categories ORDER BY name_es`);
  sendSuccess(res, { data: { categories: rows, count: rows.length } });
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO form_categories (code, name_es, name_en) VALUES ($1, $2, $3) RETURNING *`,
    [data.code, data.name_es, data.name_en],
  );
  await auditNow(req, "category.create", { entityType: "category", entityId: rows[0].id, ...data });
  sendSuccess(res, { statusCode: 201, message: "Categoría creada", data: { category: rows[0] } });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const data = categorySchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
  const sets = [];
  const params = [req.params.id];
  if (data.name_es !== undefined) { params.push(data.name_es); sets.push(`name_es = $${params.length}`); }
  if (data.name_en !== undefined) { params.push(data.name_en); sets.push(`name_en = $${params.length}`); }
  if (data.isActive !== undefined) { params.push(!!data.isActive); sets.push(`is_active = $${params.length}`); }
  if (!sets.length) throw ApiError.badRequest("Nada que actualizar");
  const { rows } = await query(`UPDATE form_categories SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, params);
  if (!rows[0]) throw ApiError.notFound("Categoría no encontrada");
  await auditNow(req, "category.update", { entityType: "category", entityId: rows[0].id });
  sendSuccess(res, { message: "Categoría actualizada", data: { category: rows[0] } });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await query(`DELETE FROM form_categories WHERE id = $1`, [req.params.id]);
  await auditNow(req, "category.delete", { entityType: "category", entityId: req.params.id });
  sendSuccess(res, { message: "Categoría eliminada" });
});

// ── URLs de acceso por entidad y rol ────────────────────────────────────────
const accessUrlSchema = z.object({
  entityId: z.string().uuid(),
  role: z.enum(MANAGEABLE_ROLES),
});

export const listAccessUrls = asyncHandler(async (req, res) => {
  const { entityId = "", role = "", active = "" } = req.query;
  const urls = await accessUrlRepo.listAccessUrls({ entityId, role, active });
  sendSuccess(res, { data: { urls, count: urls.length } });
});

async function buildAccessUrl({ entityId, role, createdBy }) {
  const entity = await entityRepo.findEntityById(entityId);
  if (!entity || !entity.isActive) throw ApiError.badRequest("Entidad no válida");
  const slug = randomAccessSlug();
  const context = sealAccessContext({ entityId: entity._id, entityCode: entity.code, role, slug });
  return accessUrlRepo.createAccessUrl({ entityId: entity._id, role, slug, context, createdBy });
}

export const createAccessUrl = asyncHandler(async (req, res) => {
  const data = accessUrlSchema.parse(req.body);
  const url = await buildAccessUrl({ ...data, createdBy: req.user._id });
  await auditNow(req, "access_url.create", { entityType: "access_url", entityId: url._id, role: data.role });
  sendSuccess(res, { statusCode: 201, message: "URL creada", data: { url } });
});

export const toggleAccessUrl = asyncHandler(async (req, res) => {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  const url = await accessUrlRepo.updateAccessUrl(req.params.id, { isActive });
  if (!url) throw ApiError.notFound("URL no encontrada");
  await auditNow(req, "access_url.toggle", { entityType: "access_url", entityId: url._id, isActive });
  sendSuccess(res, { message: isActive ? "URL activada" : "URL desactivada", data: { url } });
});

export const regenerateAccessUrl = asyncHandler(async (req, res) => {
  const current = await accessUrlRepo.findAccessUrlById(req.params.id);
  if (!current) throw ApiError.notFound("URL no encontrada");
  const slug = randomAccessSlug();
  const entity = current.entityId ? await entityRepo.findEntityById(current.entityId) : null;
  const context = sealAccessContext({
    entityId: current.entityId,
    entityCode: entity?.code || null,
    role: current.role,
    slug,
  });
  const url = await accessUrlRepo.updateAccessUrl(current._id, { slug, context, isActive: true });
  await auditNow(req, "access_url.regenerate", { entityType: "access_url", entityId: url._id });
  sendSuccess(res, { message: "Slug regenerado", data: { url } });
});

export const deleteAccessUrl = asyncHandler(async (req, res) => {
  await accessUrlRepo.deleteAccessUrl(req.params.id);
  await auditNow(req, "access_url.delete", { entityType: "access_url", entityId: req.params.id });
  sendSuccess(res, { message: "URL eliminada" });
});

/**
 * Resolver público de URL de acceso: valida slug + sello y devuelve el
 * contexto (entidad + rol) para precargar el login. Registra el uso.
 */
export const resolveAccessUrl = asyncHandler(async (req, res) => {
  const { accessUrl, data } = await getAccessUrlContext(req.params.slug, req.query.ctx);
  accessUrlRepo.registerUse(accessUrl._id).catch(() => {});
  sendSuccess(res, { data });
});

// ── Configuración global ────────────────────────────────────────────────────
export const getSettings = asyncHandler(async (_req, res) => {
  const { rows } = await query(`SELECT key, value FROM site_settings`);
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  sendSuccess(res, { data: { settings } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const data = z.record(z.unknown()).parse(req.body);
  for (const [key, value] of Object.entries(data)) {
    if (!/^[a-z0-9_]{1,60}$/.test(key)) throw ApiError.badRequest(`Clave no válida: ${key}`);
    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value ?? null)],
    );
  }
  await auditNow(req, "settings.update", { entityType: "settings", keys: Object.keys(data) });
  sendSuccess(res, { message: "Configuración guardada" });
});

// ── Auditoría ───────────────────────────────────────────────────────────────
export const listAudit = asyncHandler(async (req, res) => {
  const { actorId = "", action = "", limit = "50", offset = "0" } = req.query;
  const logs = await auditRepo.listAuditLogs({ actorId, action, limit, offset });
  sendSuccess(res, { data: { logs, count: logs.length } });
});

// ── Formularios publicados (solo lectura; público y privado) ────────────────
function publicSummary(forms, entityName, visibility = "") {
  const n = forms.length;
  const scope = entityName ? ` para ${entityName}` : " en el sistema";
  const kind =
    visibility === "private" ? "restringido"
      : visibility === "unlisted" ? "privado"
        : visibility === "public" ? "público"
          : "";
  return `Se encontraron ${n} formulario${n === 1 ? "" : "s"}${kind ? ` ${kind}${n === 1 ? "" : "s"}` : ""}${scope}`;
}

export const listPublicAdmin = asyncHandler(async (req, res) => {
  const { search = "", entityId = "", visibility = "" } = req.query;
  const forms = await formRepo.listPublicFormsScoped({ search, entityId, visibility });
  let entityName = null;
  if (entityId) entityName = (await entityRepo.findEntityById(entityId))?.name || null;
  const summary = publicSummary(forms, entityName, visibility);
  sendSuccess(res, { data: { forms, count: forms.length, summary, entity: entityName } });
});

export const publicAggregate = asyncHandler(async (req, res) => {
  const { entityId = "", visibility = "" } = req.query;
  // Una sola consulta SIN filtro de visibilidad: los contadores de
  // públicos/privados se calculan sobre el conjunto completo (de la
  // entidad) y el segmento de la cabecera solo afecta a respuestas,
  // vistas y totales de la tabla.
  const all = await formRepo.listPublicFormsScoped({ entityId });
  const publicForms = all.filter((f) => f.visibility !== "private").length;
  const privateForms = all.length - publicForms;
  const forms =
    visibility === "public" || visibility === "unlisted" || visibility === "private"
      ? all.filter((f) => f.visibility === visibility)
      : all;
  const ids = forms.map((f) => f._id);
  const counts = await responseRepo.countsByForms(ids);
  const byId = new Map(counts.map((r) => [String(r.form), r.count]));
  const perForm = forms.map((f) => ({
    _id: f._id,
    title: f.title,
    entityId: f.entityId,
    entityName: f.entityName || null,
    views: f.views || 0,
    responses: byId.get(String(f._id)) || 0,
  }));
  const byEntity = new Map();
  for (const f of perForm) {
    const key = f.entityId || "sin-entidad";
    const row = byEntity.get(key) || { entityId: f.entityId, entityName: f.entityName, forms: 0, responses: 0, views: 0 };
    row.forms += 1;
    row.responses += f.responses;
    row.views += f.views;
    byEntity.set(key, row);
  }
  const totals = {
    forms: perForm.length,
    responses: perForm.reduce((s, f) => s + f.responses, 0),
    views: perForm.reduce((s, f) => s + f.views, 0),
    publicForms,
    privateForms,
  };
  sendSuccess(res, { data: { totals, byEntity: [...byEntity.values()], perForm } });
});

export const publicFormStats = asyncHandler(async (req, res) => {
  // getFormAnalytics ya veta lo privado para el super_admin.
  const analytics = await getFormAnalytics(req.params.id, req.user);
  sendSuccess(res, { data: { analytics } });
});

export const publicFormExport = asyncHandler(async (req, res) => {
  const { getOwnedForm } = await import("../services/form.service.js");
  const form = await getOwnedForm(req.params.id, req.user);
  if (form.visibility === "private") throw ApiError.forbidden("Solo formularios públicos");
  const responses = await responseRepo.listResponsesByForm(form._id);
  const csv = responsesToCsv(form, responses);
  const filename = `${form.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_responses.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

// ── Estadísticas de la entidad (entity_admin: todo lo suyo) ─────────────────
// Misma forma que el agregado del super_admin (stats, timeline, heatmap,
// devices, topForms) para que la página de la entidad pinte LOS MISMOS
// charts con datos reales de SUS formularios. Reutiliza `computeInsights`
// en vez de duplicar la agregación.
export const entityAggregate = asyncHandler(async (req, res) => {
  if (!req.user.entityId) throw ApiError.forbidden("Tu cuenta no tiene entidad asignada");
  const forms = await formRepo.listFormsByEntity(req.user.entityId, { includeArchived: true });
  sendSuccess(res, { data: await computeInsights(forms) });
});
