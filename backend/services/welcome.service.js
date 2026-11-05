import { env } from "../config/env.js";
import * as userRepo from "../repositories/user.repo.js";
import * as entityRepo from "../repositories/entity.repo.js";
import { hashPassword, generateTempPassword } from "../utils/password.js";
import { isMailConfigured, sendUserWelcomeEmail } from "./mail.service.js";
import { safeMailErrorCode } from "../utils/mailConfiguration.js";

/**
 * Orquesta el correo de bienvenida de una cuenta recién creada o reenviada.
 *
 * Dos variantes (MAIL_SEND_CREDENTIALS):
 *  - false (A, por defecto): el correo NO lleva contraseña; se firma un token de
 *    activación de un solo uso (caduca en MAIL_ACTIVATION_TTL_HOURS) y el enlace
 *    lleva al usuario al formulario de "elegir contraseña" del portal.
 *  - true (B): el correo lleva la contraseña temporal y la cuenta queda marcada
 *    con `must_change_password` (caduca en MAIL_TEMP_PASSWORD_TTL_HOURS).
 *
 * El envío NUNCA lanza: devuelve `{ sent, reason, preview? }` para no romper el alta.
 */

// El enlace de activación usa una RUTA ESTABLE, no el slug de la puerta.
//
// Motivo: el slug de `/a/<slug>` es el secreto de la puerta, y «Regenerar» existe
// para invalidar un enlace filtrado. Si el correo de alta llevara el slug, rotar
// la puerta mataría todos los correos de activación ya enviados (y es un fallo
// silencioso: el enlace queda muerto sin explicación).
//
// La activación se protege con el TOKEN, que es de un solo uso y tiene caducidad,
// así que no necesita el slug. El correo sigue mostrando la puerta de acceso del
// usuario como dato informative, y tras fijar la contraseña `localReset` devuelve
// la puerta vigente para dejarle entrar.
//
// Se construye con `FRONTEND_URL` + ruta: no lleva ningún dominio escrito, así
// que el mismo enlace vale en cualquier entorno (localhost, IP de la LAN o el
// dominio de producción).
const ACTIVATION_PATH = "/activar";

/**
 * Enlace de activación de un alta. No depende del slug: es el mismo para todos
 * los correos y sobrevive a cualquier rotación de puertas.
 *
 * Se exporta pura (sin BD ni correo) para poder comprobarla en las sondas.
 */
export function activationUrlFor(publicBase, token) {
  return `${publicBase}${ACTIVATION_PATH}?token=${token}`;
}

export function isCredentialVariant() {
  return env.mailSendCredentials === true;
}

/** Minutos de caducidad del enlace de activación (variante A). */
export function activationTtlMinutes() {
  return env.mailActivationTtlHours * 60;
}

/** ISO de caducidad de la contraseña temporal (variante B). */
export function tempPasswordExpiry() {
  return new Date(Date.now() + env.mailTempPasswordTtlHours * 3600000).toISOString();
}

/**
 * Envía el correo de bienvenida de `user`. Requiere `accessSlug` para construir
 * la URL de acceso. `password` solo se usa en la variante B.
 */
export async function sendWelcomeForNewUser({
  user,
  entityName = null,
  accessSlug,
  role = null,
  password = null,
  language = "es",
}) {
  const publicBase = String(env.frontendUrl || env.clientUrl || "")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
  const url = `${publicBase}/a/${accessSlug}`;
  const base = {
    to: user.email,
    language,
    name: user.name,
    entityName,
    role,
    username: user.username || null,
    email: user.email,
    url,
  };

  if (isCredentialVariant()) {
    return sendUserWelcomeEmail({
      ...base,
      mode: "credentials",
      password,
      ttlHours: env.mailTempPasswordTtlHours,
    });
  }

  const token = await userRepo.createPasswordReset(user._id, activationTtlMinutes());
  const activationUrl = activationUrlFor(publicBase, token);
  return sendUserWelcomeEmail({
    ...base,
    mode: "activation",
    activationUrl,
    ttlHours: env.mailActivationTtlHours,
  });
}

/**
 * Reenvía el acceso a un usuario ya existente.
 *
 * La contraseña original NUNCA se puede reenviar (está hasheada):
 *  - variante A: se firma un token de activación nuevo (un solo uso).
 *  - variante B: se genera una contraseña temporal nueva y se marca
 *    `must_change_password` (las sesiones abiertas se revocan aparte).
 *
 * Devuelve el mismo `{ sent, reason, ... }` que el alta. Si el usuario no tiene
 * URL de acceso asociada no hay a dónde mandarlo: `reason: "no_access_url"`.
 */
export async function resendWelcomeEmail({ user, language = "es" }) {
  const ctx = await userRepo.findUserEntityContext(user._id);
  const accessSlug = ctx?.accessUrlSlug || null;
  if (!accessSlug) {
    return { sent: false, reason: "no_access_url", to: user.email };
  }
  const entity = ctx?.entity ? await entityRepo.findEntityById(ctx.entity._id) : null;

  let password = null;
  if (isCredentialVariant()) {
    password = generateTempPassword();
    await userRepo.setTemporaryPassword(user._id, await hashPassword(password), tempPasswordExpiry());
  }

  return sendWelcomeForNewUser({
    user,
    entityName: entity?.name,
    accessSlug,
    role: user.role,
    password,
    language,
  });
}

/**
 * Envía al super_admin la URL de acceso aleatoria para que pueda volver a
 * entrar tras cerrar sesión. Devuelve { sent, reason, to } y nunca lanza.
 */
export async function sendSuperAdminAccessUrl({
  to,
  name,
  slug,
  language = "es",
}) {
  const publicBase = String(env.frontendUrl || env.clientUrl || "")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
  const url = `${publicBase}/a/${slug}`;
  const base = {
    to,
    language,
    name,
    entityName: null,
    role: "super_admin",
    username: null,
    email: to,
    url,
  };

  if (!isMailConfigured()) {
    return { sent: false, reason: "disabled", to };
  }

  try {
    const info = await sendUserWelcomeEmail({
      ...base,
      mode: "activation",
      activationUrl: url,
      ttlHours: env.mailActivationTtlHours,
    });
    return { sent: true, reason: null, to, ...info };
  } catch (error) {
    return { sent: false, reason: safeMailErrorCode(error), to };
  }
}
