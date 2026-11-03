import { z } from "zod";
import crypto from "node:crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken, generateJti, getTokenExpiryDate } from "../utils/token.js";
import { absoluteExpiryFrom, maxConcurrentForRole } from "../utils/sessionPolicy.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { getClientIp, parseDeviceInfo } from "./auth.controller.js";
import * as userRepo from "../repositories/user.repo.js";
import * as sessionRepo from "../repositories/session.repo.js";
import * as entityRepo from "../repositories/entity.repo.js";
import { env } from "../config/env.js";
import { isMailConfigured, sendPasswordResetCode } from "../services/mail.service.js";
import { sendWelcomeForNewUser, tempPasswordExpiry, isCredentialVariant } from "../services/welcome.service.js";
import { resolveActiveAccessUrl, registerUse, assertAccessUrlFor } from "../services/accessUrl.service.js";
import { ROLES, MANAGEABLE_ROLES } from "../middleware/rbac.js";
import { auditNow } from "../middleware/rbac.js";

/**
 * Autenticación local paralela (email/usuario + contraseña, bcrypt).
 * La usan super_admin, entity_admin y form_creator para el panel.
 * El IDP externo queda reservado a encuestados en formularios privados.
 * Reutiliza el mismo mecanismo de sesión JWT + user_sessions del login IDP.
 *
 * La entrada NO es intercambiable: el enlace `/a/:slug` solo deja entrar a la
 * cuenta cuyo rol y entidad coinciden con su URL de acceso, y el portal fijo
 * es exclusivo del super_admin (las cuentas legacy, sin rol, siguen pasando).
 */

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9._-]+$/).optional().nullable(),
  password: z.string().min(8).max(128),
  role: z.enum(MANAGEABLE_ROLES),
  // Toda cuenta gestionada nace de una entidad concreta y de una URL de
  // acceso activa para su rol: sin ambos no se puede crear.
  entityId: z.string().uuid(),
  accessUrlId: z.string().uuid(),
  // Idioma del correo de bienvenida (ES por defecto). Opcional: no rompe el contrato.
  language: z.enum(["es", "en"]).optional().default("es"),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(128),
  // Puerta de acceso (`/a/:slug`): cuando viene, la sesión que se abre queda
  // atada a la entidad y al rol de ESA URL de acceso. Sin slug, el login es el
  // del portal fijo del super_admin. `ctx` es el sello cifrado opcional que la
  // propia puerta trae en la query; si falta, se usa el de la fila.
  // `nullish()` (no `optional()`): el frontend envía `ctx: null` cuando la
  // puerta no trae sello en la query, y `.optional()` solo admite `undefined`.
  slug: z.string().trim().min(1).max(64).nullish(),
  ctx: z.string().trim().min(1).max(2048).nullish(),
});

const accessRegisterSchema = registerSchema.pick({ name: true, email: true, username: true, password: true });

async function issueLocalSession(req, user) {
  const jti = generateJti();
  const token = signToken({ id: user._id, jti });
  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "";
  const absoluteExpiresAt = absoluteExpiryFrom();
  try {
    await sessionRepo.createSession({
      userId: user._id,
      jti,
      deviceInfo: { ...parseDeviceInfo(userAgent), ip, authMethod: "local" },
      ip,
      userAgent,
      expiresAt: getTokenExpiryDate(),
      absoluteExpiresAt,
    });
    // Respetar el tope de sesiones concurrentes del rol: cierra las más
    // antiguas conservando solo las permitidas.
    const max = maxConcurrentForRole(user.role);
    const evicted = await sessionRepo.deactivateOldestBeyond(user._id, max);
    if (evicted > 0) {
      await auditNow(req, "session.concurrent_evicted", { entityType: "user", entityId: user._id, evicted });
    }
  } catch (e) {
    console.warn("[local-auth] no se pudo registrar la sesión:", e.message);
  }
  await auditNow(req, "auth.local.login", { entityType: "user", entityId: user._id });
  const { passwordHash: _passwordHash, failedLoginAttempts: _attempts, lockedUntil: _locked, ...safeUser } = user;
  return { token, user: safeUser };
}

// Solo el super_admin da de alta cuentas locales (nunca rol super_admin).
export const localRegister = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const entity = await entityRepo.findEntityById(data.entityId);
  if (!entity || !entity.isActive) throw ApiError.badRequest("Entidad no válida");
  // Correlación cuenta ↔ URL: el enlace debe existir, estar activo y ser de
  // esta entidad y este rol. Sin él no hay alta.
  const accessUrl = await assertAccessUrlFor({
    accessUrlId: data.accessUrlId,
    entityId: data.entityId,
    role: data.role,
  });
  const existing = await userRepo.findUserWithSecret(data.email);
  if (existing) throw ApiError.conflict("Ese correo ya está registrado");
  if (data.role === ROLES.ENTITY && await userRepo.findEntityAdminByEntity(data.entityId)) {
    throw ApiError.conflict("Esta entidad ya tiene un administrador");
  }

  let user;
  try {
    user = await userRepo.createLocalUser({
      name: data.name,
      email: data.email,
      username: data.username || null,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      entityId: data.entityId,
      accessUrlId: accessUrl._id,
      // Variante B: la cuenta nace obligada a cambiar la contraseña temporal.
      mustChangePassword: isCredentialVariant(),
      tempPasswordExpiresAt: isCredentialVariant() ? tempPasswordExpiry() : null,
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_entity_admin_entity_unique_idx") {
      throw ApiError.conflict("Esta entidad ya tiene un administrador");
    }
    if (error.code === "23505") throw ApiError.conflict("Ese correo o usuario ya está registrado");
    throw error;
  }
  await auditNow(req, "user.create", {
    entityType: "user",
    entityId: user._id,
    role: data.role,
    accessUrlId: accessUrl._id,
  });
  // Correo de bienvenida: variante A (enlace de activación) o B (credenciales
  // temporales), según MAIL_SEND_CREDENTIALS. Best-effort: nunca aborta el alta;
  // el resultado se devuelve para que el panel avise y se registra en auditoría.
  let mail = { sent: false, reason: "disabled", to: user.email };
  if (isMailConfigured()) {
    mail = await sendWelcomeForNewUser({
      user,
      entityName: entity?.name,
      accessSlug: accessUrl.slug,
      role: data.role,
      password: data.password,
      language: data.language,
    });
    if (mail.preview) {
      console.log(`[local-auth] correo de bienvenida enviado · preview: ${mail.preview}`);
    }
    if (mail.sent) {
      await auditNow(req, "user.create.email_sent", { entityType: "user", entityId: user._id });
    } else {
      await auditNow(req, "user.create.email_failed", {
        entityType: "user",
        entityId: user._id,
        reason: mail.reason,
      });
    }
  }
  // Nunca se devuelve el hash.
  sendSuccess(res, { statusCode: 201, message: "Usuario creado", data: { user, mail } });
});

export const localRegisterByAccess = asyncHandler(async (req, res) => {
  const data = accessRegisterSchema.parse(req.body);
  const accessUrl = await resolveActiveAccessUrl(req.params.slug, req.query.ctx);
  if (accessUrl.role !== ROLES.ENTITY || !accessUrl.entityId) {
    throw ApiError.forbidden("Esta URL no permite registrar un administrador de entidad");
  }

  const entity = await entityRepo.findEntityById(accessUrl.entityId);
  if (!entity?.isActive) throw ApiError.badRequest("La entidad ya no está activa");
  if (await userRepo.findEntityAdminByEntity(entity._id)) {
    throw ApiError.conflict("Esta entidad ya tiene un administrador");
  }
  if (await userRepo.findUserWithSecret(data.email)) {
    throw ApiError.conflict("Ese correo ya está registrado");
  }

  let user;
  try {
    user = await userRepo.createLocalUser({
      ...data,
      passwordHash: await hashPassword(data.password),
      role: ROLES.ENTITY,
      entityId: entity._id,
      accessUrlId: accessUrl._id,
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "users_entity_admin_entity_unique_idx") {
      throw ApiError.conflict("Esta entidad ya tiene un administrador");
    }
    if (error.code === "23505") throw ApiError.conflict("Ese correo o usuario ya está registrado");
    throw error;
  }

  await auditNow(req, "user.create", {
    entityType: "user",
    entityId: user._id,
    role: ROLES.ENTITY,
    accessUrlId: accessUrl._id,
  });
  // Marca la URL como usada (contador + última vez)
  await registerUse(accessUrl._id);
  const session = await issueLocalSession(req, user);
  sendSuccess(res, {
    statusCode: 201,
    message: "Cuenta creada",
    data: session,
  });
});

export const localLogin = asyncHandler(async (req, res) => {
  const { identifier, password, slug, ctx } = loginSchema.parse(req.body);
  const user = await userRepo.findUserWithSecret(identifier);
  // Sin enumeración: mismo error exista o no, y misma latencia aproximada.
  if (!user || !user.passwordHash) {
    await hashPassword("cebo-para-igualar-tiempos-123");
    throw ApiError.unauthorized("Credenciales inválidas");
  }
  if (user.isActive === false) throw ApiError.unauthorized("Cuenta desactivada");
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    throw ApiError.unauthorized("Cuenta bloqueada temporalmente, intenta más tarde");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const lockedUntil =
      attempts >= env.localLoginMaxAttempts
        ? new Date(Date.now() + env.localLoginLockMinutes * 60000).toISOString()
        : null;
    await userRepo.recordFailedLogin(user._id, attempts, lockedUntil);
    await auditNow(req, "auth.local.failed", { entityType: "user", entityId: user._id });
    throw ApiError.unauthorized(
      lockedUntil ? "Cuenta bloqueada temporalmente, intenta más tarde" : "Credenciales inválidas",
    );
  }
  await userRepo.resetLoginAttempts(user._id);

  /* La puerta manda: `/a/:slug` está atado a la entidad y al rol de SU URL de
     acceso (un enlace de gestor de entidad no admite a un gestor de
     formularios, ni al revés), y el portal fijo solo admite al super_admin.
     Las credenciales ya se validaron, así que aquí sí podemos decir por qué no
     encaja sin filtrar qué cuentas existen. */
  if (slug) {
    const accessUrl = await resolveActiveAccessUrl(slug, ctx);
    if (user.role !== accessUrl.role || (user.entityId || null) !== (accessUrl.entityId || null)) {
      await auditNow(req, "auth.local.wrong_door", {
        entityType: "user",
        entityId: user._id,
        role: user.role,
        accessUrlId: accessUrl._id,
      });
      // `details.code` es lo que el frontend usa para pintar el aviso visual
      // de «puerta equivocada» (el message localizado sigue viajando igual).
      throw ApiError.forbidden("Esta URL de acceso no corresponde a tu rol o entidad", {
        code: "wrong_door",
      });
    }
  } else if (user.role && user.role !== ROLES.SUPER) {
    await auditNow(req, "auth.local.wrong_portal", {
      entityType: "user",
      entityId: user._id,
      role: user.role,
    });
    throw ApiError.forbidden("Entra por el enlace de acceso de tu entidad", {
      code: "wrong_portal",
    });
  }

  // Variante B: si la contraseña temporal caducó, el acceso queda invalidado y
  // hay que pedir un nuevo enlace/contraseña (reenvío). La cuenta sigue existiendo.
  if (user.mustChangePassword && user.tempPasswordExpiresAt && new Date(user.tempPasswordExpiresAt) < new Date()) {
    await auditNow(req, "auth.local.temp_password_expired", { entityType: "user", entityId: user._id });
    throw ApiError.unauthorized("Tu contraseña temporal caducó; solicita un nuevo acceso");
  }
  sendSuccess(res, { data: await issueLocalSession(req, user) });
});

export const localLogout = asyncHandler(async (req, res) => {
  if (req.token?.jti) await sessionRepo.deactivateByJti(req.token.jti);
  await auditNow(req, "auth.local.logout", {});

  // El super_admin usa su URL fija (SUPER_ADMIN_LOGIN_PATH), no se regenera
  // ni se envía correo al cerrar sesión.

  sendSuccess(res, { message: "Sesión cerrada" });
});

// Recuperación por código numérico: respuesta idéntica exista o no el correo
// (no enumerar). El código caduca en passwordResetTtlMinutes y es de un solo uso.
export const localForgot = asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
  const user = await userRepo.findUserWithSecret(email);
  if (!user?.passwordHash) {
    sendSuccess(res, {
      message: "Si el correo existe, se envió un código de recuperación",
      data: {},
    });
    return;
  }

  const code = String(crypto.randomInt(100000, 1000000));
  await userRepo.createPasswordReset(user._id, env.passwordResetTtlMinutes, code);
  await auditNow(req, "auth.local.forgot", { entityType: "user", entityId: user._id });

  let mailed = false;
  if (isMailConfigured()) {
    try {
      const { preview } = await sendPasswordResetCode({
        to: user.email,
        code,
        ttlMinutes: env.passwordResetTtlMinutes,
      });
      mailed = true;
      if (preview) console.log(`[local-auth] correo de recuperación enviado · preview: ${preview}`);
    } catch (e) {
      console.error("[local-auth] fallo al enviar correo de recuperación:", e.message);
    }
  }
  if (!mailed) console.log(`[local-auth] código de recuperación (sin correo) para ${email}: ${code}`);

  sendSuccess(res, {
    message: "Si el correo existe, se envió un código de recuperación",
    // En producción el código NUNCA se devuelve: solo llega por correo.
    // En desarrollo se expone para poder completar el flujo sin bandeja.
    data: env.nodeEnv === "production" ? {} : { code, mailed },
  });
});

export const localReset = asyncHandler(async (req, res) => {
  const { token, password } = z
    .object({ token: z.string().trim().min(6).max(128), password: z.string().min(8).max(128) })
    .parse(req.body);
  const row = await userRepo.findValidPasswordReset(token);
  if (!row) throw ApiError.badRequest("Código inválido o caducado");
  await userRepo.setLocalPassword(row.user_id, await hashPassword(password));
  await userRepo.markPasswordResetUsed(row.id);
  await sessionRepo.deactivateAllByUser(row.user_id);
  await auditNow(req, "auth.local.reset", { entityType: "user", entityId: row.user_id });
  /* La puerta VIGENTE del usuario, no la que pudiera tener el correo: el enlace
     de activación no lleva slug justamente para sobrevivir a una rotación. Con
     esto el frontend lo lleva a la puerta correcta a iniciar sesión. Las rutas
     son relativas, así que valen en cualquier dominio. */
  const ctx = await userRepo.findUserEntityContext(row.user_id);
  const door = ctx?.accessUrlSlug ? `/a/${ctx.accessUrlSlug}` : null;
  sendSuccess(res, {
    message: "Contraseña actualizada, vuelve a iniciar sesión",
    data: { door, email: row.email || null },
  });
});
