import { env } from "../config/env.js";
import { ROLES } from "../middleware/rbac.js";

const MINUTE = 60 * 1000;

/* Política de sesión por rol. Vive aparte de `env.js` para que el backend
   (middleware, controladores) y los cálculos de expiración compartan UNA sola
   fuente: si mañana cambian los minutos, cambia aquí y en `.env`, no en cada
   `protect`. */

const IDLE_MINUTES = {
  [ROLES.SUPER]: env.sessionIdleSuperMinutes,
  [ROLES.ENTITY]: env.sessionIdleEntityMinutes,
  [ROLES.CREATOR]: env.sessionIdleCreatorMinutes,
};
const CONCURRENT = {
  [ROLES.SUPER]: env.sessionMaxConcurrentSuper,
  [ROLES.ENTITY]: env.sessionMaxConcurrentEntity,
  [ROLES.CREATOR]: env.sessionMaxConcurrentCreator,
};

function minutesFor(map, role, fallback) {
  const value = map[role];
  return (Number.isFinite(value) && value > 0 ? value : fallback) * MINUTE;
}

/** Inactividad real permitida para un rol (ms). */
export function idleMsForRole(role) {
  return minutesFor(IDLE_MINUTES, role, env.sessionIdleDefaultMinutes);
}

/** Vida máxima absoluta de cualquier sesión (ms). */
export function absoluteMs() {
  return env.sessionAbsoluteMinutes * MINUTE;
}

/** Sesiones concurrentes permitidas para un rol. */
export function maxConcurrentForRole(role) {
  const value = CONCURRENT[role];
  return Number.isFinite(value) && value > 0 ? value : env.sessionMaxConcurrentDefault;
}

/**
 * Política que el frontend necesita para saber cuándo caduca la sesión (idle y
 * vida absoluta) sin duplicar los minutos en JS.
 */
export function sessionPolicyFor(role) {
  return {
    idleMs: idleMsForRole(role),
    absoluteMs: absoluteMs(),
    maxConcurrent: maxConcurrentForRole(role),
  };
}

/** Fecha límite absoluta de una sesión nacida en `from` (por defecto, ahora). */
export function absoluteExpiryFrom(from = Date.now()) {
  return new Date(from + absoluteMs());
}
