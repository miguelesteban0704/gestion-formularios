import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyToken } from "../utils/token.js";
import { findUserById } from "../repositories/user.repo.js";
import * as sessionRepo from "../repositories/session.repo.js";
import { writeAudit } from "../repositories/audit.repo.js";
import { sessionPolicyFor } from "../utils/sessionPolicy.js";

/** Auditoría best-effort del fin de una sesión por política. Nunca rompe la petición. */
function auditSessionEnd(req, action, user, jti) {
  const forwarded = req.headers["x-forwarded-for"];
  writeAudit({
    actorId: user?._id || null,
    actorRole: user?.role || null,
    action,
    entityType: "session",
    entityId: jti || null,
    ip: forwarded ? String(forwarded).split(",")[0].trim() : req.ip || req.socket?.remoteAddress || "unknown",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    details: { jti },
  }).catch(() => {});
}

/**
 * Autenticación de cada petición. Además de validar el token y la sesión,
 * aplica la POLÍTICA de sesión por rol:
 *  - inactividad real (`last_user_activity`, marcada por el heartbeat del
 *    frontend): los sondeos automáticos NO renuevan la sesión;
 *  - vida absoluta (`absolute_expires_at`): techo duro que no se renueva;
 *  - cuenta activa (una cuenta desactivada no sigue operando con su token).
 */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw ApiError.unauthorized("Authentication required");
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }

  const user = await findUserById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }
  if (user.isActive === false) {
    throw ApiError.unauthorized("Cuenta desactivada");
  }

  // ——— Multi-dispositivo + política de sesión (si el token trae jti) ———
  if (decoded.jti) {
    const session = await sessionRepo.findByJti(decoded.jti);
    if (!session || !session.is_active) {
      throw ApiError.unauthorized("Sesión cerrada en otro dispositivo");
    }

    const now = Date.now();
    const policy = sessionPolicyFor(user.role);

    // Vida absoluta: techo duro de la sesión, no se renueva ni con actividad.
    const absoluteMs = session.absolute_expires_at
      ? new Date(session.absolute_expires_at).getTime()
      : new Date(session.created_at).getTime() + policy.absoluteMs;
    if (now > absoluteMs) {
      await sessionRepo.deactivateByJti(decoded.jti);
      auditSessionEnd(req, "session.absolute_expired", user, decoded.jti);
      throw ApiError.unauthorized("Sesión expirada por tiempo máximo");
    }

    // Compatibilidad: el vencimiento del propio JWT sigue siendo válido.
    if (session.expires_at && new Date(session.expires_at).getTime() < now) {
      throw ApiError.unauthorized("Sesión expirada");
    }

    // Inactividad REAL (última interacción, no último request).
    const idleSince = session.last_user_activity
      ? new Date(session.last_user_activity).getTime()
      : new Date(session.last_active).getTime();
    if (now - idleSince > policy.idleMs) {
      await sessionRepo.deactivateByJti(decoded.jti);
      auditSessionEnd(req, "session.idle_expired", user, decoded.jti);
      throw ApiError.unauthorized("Sesión cerrada por inactividad");
    }

    // Marca de "último request" (solo para mostrar en Ajustes). No bloquea.
    sessionRepo.updateLastActive(decoded.jti).catch(() => {});

    req.session = session;
    req.sessionPolicy = policy;
  }

  req.user = user;
  req.token = decoded;
  next();
});
