import { ApiError } from "../utils/ApiError.js";
import { writeAudit } from "../repositories/audit.repo.js";

export const ROLES = {
  SUPER: "super_admin",
  ENTITY: "entity_admin",
  CREATOR: "form_creator",
};

export const MANAGEABLE_ROLES = [ROLES.ENTITY, ROLES.CREATOR];

/** Usuarios previos al rediseño (role NULL): conservan su acceso histórico. */
export function isLegacy(user) {
  return !!user && !user.role;
}

export function isSuper(user) {
  return user?.role === ROLES.SUPER;
}

function clientInfo(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return {
    ip: forwarded ? String(forwarded).split(",")[0].trim() : req.ip || req.socket?.remoteAddress || "unknown",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
  };
}

/**
 * Puerta de rol. Uso: `protect, requireRole('super_admin')`.
 * No sustituye a `protect`: exige sesión válida primero.
 */
export function requireRole(...allowed) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized("Authentication required"));
    if (!req.user.role || !allowed.includes(req.user.role)) {
      return next(ApiError.forbidden("No tienes permiso para esta acción"));
    }
    next();
  };
}

/**
 * entity_admin debe pertenecer a una entidad. No filtra por sí solo:
 * combina con el scope de cada servicio (`entity_id = user.entityId`).
 */
export function requireEntityMember(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized("Authentication required"));
  if (req.user.role === ROLES.ENTITY && !req.user.entityId) {
    return next(ApiError.forbidden("Tu cuenta no tiene entidad asignada"));
  }
  next();
}

/** Auditoría best-effort: nunca rompe la petición que registra. */
export function audit(action, pick = {}) {
  return (req, _res, next) => {
    const { ip, userAgent } = clientInfo(req);
    const details = {};
    for (const [key, fn] of Object.entries(pick)) {
      try { details[key] = typeof fn === "function" ? fn(req) : fn; } catch {}
    }
    writeAudit({
      actorId: req.user?._id || null,
      actorRole: req.user?.role || null,
      action,
      entityType: details.entityType || null,
      entityId: details.entityId ? String(details.entityId) : null,
      ip,
      userAgent,
      details,
    }).catch(() => {});
    next();
  };
}

/** Atajo para acciones cuyo detalle sale del body/params ya validados. */
export async function auditNow(req, action, details = {}) {
  const { ip, userAgent } = clientInfo(req);
  try {
    await writeAudit({
      actorId: req.user?._id || null,
      actorRole: req.user?.role || null,
      action,
      entityType: details.entityType || null,
      entityId: details.entityId ? String(details.entityId) : null,
      ip,
      userAgent,
      details,
    });
  } catch {}
}
