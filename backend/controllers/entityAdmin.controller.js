import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword } from "../utils/password.js";
import { isMailConfigured } from "../services/mail.service.js";
import { sendWelcomeForNewUser, resendWelcomeEmail, tempPasswordExpiry, isCredentialVariant } from "../services/welcome.service.js";
import * as userRepo from "../repositories/user.repo.js";
import * as sessionRepo from "../repositories/session.repo.js";
import * as accessUrlRepo from "../repositories/accessUrl.repo.js";
import * as entityRepo from "../repositories/entity.repo.js";
import * as formRepo from "../repositories/form.repo.js";
import { assertAccessUrlFor } from "../services/accessUrl.service.js";
import { getFormAnalytics } from "../services/analytics.service.js";
import { randomAccessSlug, sealAccessContext } from "../utils/urlCrypto.js";
import { ROLES, auditNow } from "../middleware/rbac.js";

/**
 * Panel del `entity_admin` (Gestión de Entidad).
 *
 * Regla de oro: TODO se acota a `req.user.entityId`. El `entityId` nunca se
 * toma del body/query; una cuenta jamás puede leer ni tocar recursos de otra
 * entidad, aunque conozca su id (evita IDOR). Nunca se gestiona `super_admin`.
 * El router ya exige `protect + requireRole("entity_admin") + requireEntityMember`.
 */

function requireEntity(req) {
  if (!req.user?.entityId) throw ApiError.forbidden("Tu cuenta no tiene entidad asignada");
  return req.user.entityId;
}

/** Busca un usuario del propio ente; un id ajeno o un super_admin dan 404. */
async function findEntityUser(req, id) {
  const target = await userRepo.findUserById(id);
  const sameEntity = (target?.entityId || null) === (req.user.entityId || null);
  if (!target || target.role === ROLES.SUPER || !sameEntity) {
    throw ApiError.notFound("Usuario no encontrado");
  }
  return target;
}

// ── Usuarios de la entidad ──────────────────────────────────────────────────
export const listUsers = asyncHandler(async (req, res) => {
  const entityId = requireEntity(req);
  const { search = "", role = "", from = "", to = "" } = req.query;
  // El filtro por entidad es forzado por el servidor, no opcional.
  let users = await userRepo.listUsers({ search, role, entityId });
  users = users.filter((u) => u.role !== ROLES.SUPER);
  if (from) users = users.filter((u) => new Date(u.createdAt) >= new Date(from));
  if (to) users = users.filter((u) => new Date(u.createdAt) <= new Date(to));
  sendSuccess(res, { data: { users, count: users.length } });
});

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9._-]+$/).optional().nullable(),
  password: z.string().min(8).max(128),
  accessUrlId: z.string().uuid(),
  // Idioma del correo de bienvenida (ES por defecto).
  language: z.enum(["es", "en"]).optional().default("es"),
});

export const createUser = asyncHandler(async (req, res) => {
  const entityId = requireEntity(req);
  const data = createUserSchema.parse(req.body);
  // Solo creadores de formularios de SU entidad: nunca entity_admin (uno por
  // entidad, ya ocupado por quien crea) ni super_admin.
  const role = ROLES.CREATOR;
  const accessUrl = await assertAccessUrlFor({ accessUrlId: data.accessUrlId, entityId, role });
  const existing = await userRepo.findUserWithSecret(data.email);
  if (existing) throw ApiError.conflict("Ese correo ya está registrado");
  let user;
  try {
    user = await userRepo.createLocalUser({
      name: data.name,
      email: data.email,
      username: data.username || null,
      passwordHash: await hashPassword(data.password),
      role,
      entityId,
      accessUrlId: data.accessUrlId,
      // Variante B: la cuenta nace obligada a cambiar la contraseña temporal.
      mustChangePassword: isCredentialVariant(),
      tempPasswordExpiresAt: isCredentialVariant() ? tempPasswordExpiry() : null,
    });
  } catch (error) {
    if (error.code === "23505") throw ApiError.conflict("Ese correo o usuario ya está registrado");
    throw error;
  }
  await auditNow(req, "user.create", {
    entityType: "user",
    entityId: user._id,
    scopeEntityId: entityId,
    role,
    accessUrlId: data.accessUrlId,
  });
  // Correo de bienvenida (variante A: enlace de activación; B: credenciales
  // temporales). Best-effort: un fallo de correo no aborta el alta, pero el
  // resultado se devuelve y se audita para que el panel pueda avisar.
  let mail = { sent: false, reason: "disabled", to: user.email };
  if (isMailConfigured()) {
    const entity = await entityRepo.findEntityById(entityId);
    mail = await sendWelcomeForNewUser({
      user,
      entityName: entity?.name,
      accessSlug: accessUrl.slug,
      role,
      password: data.password,
      language: data.language,
    });
    if (mail.preview) {
      console.log(`[entity-admin] correo de bienvenida enviado · preview: ${mail.preview}`);
    }
    if (mail.sent) {
      await auditNow(req, "user.create.email_sent", {
        entityType: "user",
        entityId: user._id,
        scopeEntityId: entityId,
      });
    } else {
      await auditNow(req, "user.create.email_failed", {
        entityType: "user",
        entityId: user._id,
        scopeEntityId: entityId,
        reason: mail.reason,
      });
    }
  }
  sendSuccess(res, { statusCode: 201, message: "Usuario creado", data: { user, mail } });
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  accessUrlId: z.string().uuid().nullable().optional(),
  email: z.string().trim().toLowerCase().email().max(160).optional(),
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9._-]+$/).nullable().optional(),
  password: z.string().min(8).max(128).optional(),
});

export const updateUser = asyncHandler(async (req, res) => {
  const entityId = requireEntity(req);
  const target = await findEntityUser(req, req.params.id);
  const data = updateUserSchema.parse(req.body);
  // Nunca se cambia rol ni entidad desde este panel: la URL de acceso, si
  // cambia, debe seguir siendo de esta entidad y del rol creador.
  if (data.accessUrlId) {
    await assertAccessUrlFor({ accessUrlId: data.accessUrlId, entityId, role: ROLES.CREATOR });
  }
  // Unicidad de correo/usuario si tocan identidad (mismo probe que el alta).
  if (data.email || data.username) {
    const probe = await userRepo.findUserWithSecret(data.email || data.username);
    if (probe && probe._id !== target._id) {
      throw ApiError.conflict("Ese correo o usuario ya está registrado");
    }
  }
  if (data.password) {
    if (data.password.length < 8) throw ApiError.badRequest("La contraseña debe tener al menos 8 caracteres");
    data.passwordHash = await hashPassword(data.password);
    delete data.password;
  }
  const user = await userRepo.adminUpdateUser(target._id, {
    name: data.name,
    accessUrlId: data.accessUrlId,
    isActive: data.isActive,
    email: data.email,
    username: data.username === undefined ? undefined : data.username,
    ...(data.passwordHash ? { passwordHash: data.passwordHash } : {}),
  });
  const deactivated = data.isActive === false;
  const credentialsChanged = Boolean(data.passwordHash);
  if (deactivated || credentialsChanged) {
    await sessionRepo.deactivateAllByUser(target._id);
    await auditNow(req, "session.revoked", {
      entityType: "user",
      entityId: target._id,
      reason: deactivated ? "entity_admin" : "credentials",
    });
  }
  const auditData = { ...data };
  delete auditData.passwordHash;
  await auditNow(req, "user.update", {
    entityType: "user",
    entityId: user._id,
    scopeEntityId: entityId,
    ...auditData,
  });
  sendSuccess(res, { message: "Usuario actualizado", data: { user } });
});

export const removeUser = asyncHandler(async (req, res) => {
  const entityId = requireEntity(req);
  const target = await findEntityUser(req, req.params.id);
  if (target._id === req.user._id) throw ApiError.forbidden("No puedes eliminarte a ti mismo");
  await userRepo.deleteUser(target._id);
  await auditNow(req, "user.delete", { entityType: "user", entityId: target._id, scopeEntityId: entityId });
  sendSuccess(res, { message: "Usuario eliminado" });
});

// Reenvía el correo de bienvenida/activación a un creador de SU entidad.
// Variante A: token nuevo; variante B: contraseña temporal nueva. Best-effort.
export const resendWelcome = asyncHandler(async (req, res) => {
  const entityId = requireEntity(req);
  const target = await findEntityUser(req, req.params.id);
  const { language } = z
    .object({ language: z.enum(["es", "en"]).optional().default("es") })
    .parse(req.body || {});
  let mail = { sent: false, reason: "disabled", to: target.email };
  if (isMailConfigured()) {
    mail = await resendWelcomeEmail({ user: target, language });
    if (mail.preview) console.log(`[entity-admin] correo reenviado · preview: ${mail.preview}`);
    await auditNow(req, mail.sent ? "user.welcome.resend" : "user.welcome.resend_failed", {
      entityType: "user",
      entityId: target._id,
      scopeEntityId: entityId,
      reason: mail.reason,
    });
  }
  sendSuccess(res, {
    message: mail.sent ? "Correo reenviado" : "No se pudo enviar el correo",
    data: { mail },
  });
});

// ── Formularios de la entidad ───────────────────────────────────────────────
export const listForms = asyncHandler(async (req, res) => {
  const entityId = requireEntity(req);
  const {
    search = "",
    status = "",
    ownerId = "",
    visibility = "",
    from = "",
    to = "",
    includeArchived = "true",
  } = req.query;
  const forms = await formRepo.listFormsByEntity(entityId, {
    includeArchived: includeArchived !== "false",
    search,
    status,
    ownerId,
    visibility,
    from,
    to,
  });
  sendSuccess(res, { data: { forms, count: forms.length } });
});

export const formStats = asyncHandler(async (req, res) => {
  requireEntity(req);
  // getFormAnalytics veta lo que no es de la entidad del actor.
  const analytics = await getFormAnalytics(req.params.id, req.user);
  sendSuccess(res, { data: { analytics } });
});

// ── URLs de acceso (solo lectura; para elegir la del nuevo creador) ─────────
export const listAccessUrls = asyncHandler(async (req, res) => {
  const entityId = requireEntity(req);
  // Únicamente las activas de su entidad y del rol creador (lo que puede usar).
  const urls = await accessUrlRepo.listAccessUrls({ entityId, role: ROLES.CREATOR, active: true });
  sendSuccess(res, { data: { urls, count: urls.length } });
});

// ── Generar una URL de acceso NUEVA para un creador de SU entidad ───────────
// El alta de un usuario necesita una URL de esa entidad y del rol creador.
// Este endpoint la fabrica bajo demanda (slug aleatorio + sello), sin que el
// administrador tenga que ir al panel del super_admin: SIEMPRE es de SU
// entidad y del rol `form_creator`.
export const createAccessUrl = asyncHandler(async (req, res) => {
  const entityId = requireEntity(req);
  const entity = await entityRepo.findEntityById(entityId);
  if (!entity || !entity.isActive) throw ApiError.badRequest("Entidad no válida");
  const role = ROLES.CREATOR;
  const slug = randomAccessSlug();
  const context = sealAccessContext({ entityId, entityCode: entity.code, role, slug });
  const url = await accessUrlRepo.createAccessUrl({
    entityId,
    role,
    slug,
    context,
    createdBy: req.user._id,
  });
  await auditNow(req, "access_url.create", {
    entityType: "access_url",
    entityId: url._id,
    scopeEntityId: entityId,
    role,
  });
  sendSuccess(res, { statusCode: 201, message: "URL de acceso generada", data: { url } });
});
