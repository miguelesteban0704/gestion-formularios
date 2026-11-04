import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { welcomeEmail, resetEmail } from "./mail.templates.js";

/**
 * Proveedor de correo transaccional.
 *
 * - MAIL_PROVIDER=ethereal : cuenta de prueba gratuita (nodemailer). El correo
 *   SÍ se envía por SMTP real a Ethereal y la consola imprime la URL de
 *   previsualización. Solo para desarrollo.
 * - MAIL_PROVIDER=smtp     : SMTP real (Gmail con contraseña de aplicación,
 *   Mailtrap, Postmark, etc.) con SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.
 * - Sin MAIL_PROVIDER      : "sin correo"; el controlador decide el fallback.
 *
 * Modos del correo de alta (MAIL_SEND_CREDENTIALS):
 * - false (variante A, por defecto): el correo NO incluye contraseña; lleva un
 *   enlace de activación firmado con caducidad.
 * - true  (variante B): el correo incluye la contraseña temporal y obliga a
 *   cambiarla en el primer inicio de sesión.
 */

let transporter = null;
let etherealAccount = null;

export function isMailConfigured() {
  const provider = env.mailProvider;
  if (!provider || provider === "none") return false;
  // Ethereal es una cuenta de pruebas: nunca en producción.
  if (provider === "ethereal" && env.nodeEnv === "production") return false;
  if (provider === "smtp" && (!env.smtpHost || !env.smtpUser || !env.smtpPass)) return false;
  return true;
}

async function getTransporter() {
  if (transporter) return transporter;

  if (env.mailProvider === "ethereal") {
    etherealAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: { user: etherealAccount.user, pass: etherealAccount.pass },
    });
    console.log(`[mail] cuenta Ethereal creada: ${etherealAccount.user}`);
    return transporter;
  }

  if (env.mailProvider === "smtp") {
    // En producción, usar puerto 587 con TLS STARTTLS es más compatible
    // que el puerto 465 con SSL implícito, especialmente desde IPs outside
    // the US como Cuba. En desarrollo se mantiene la configuración actual.
    const isProduction = env.nodeEnv === "production";
    const port = isProduction ? Number(env.smtpPort) || 587 : Number(env.smtpPort) || 465;
    // En producción, forzar TLS (STARTTLS) en lugar de SSL implícito
    const secure = isProduction
      ? env.mailSecure !== false // Si no se especifica explicitamente false, usar TLS
      : env.mailSecure === null ? port === 465 : env.mailSecure === true;
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port,
      secure,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
    return transporter;
  }

  throw new Error("Proveedor de correo no configurado (MAIL_PROVIDER)");
}

const RETRY_ATTEMPTS = 2;
const RETRY_BASE_MS = 500;

/** Reintenta una operación asíncrona (por defecto 2 intentos, backoff lineal). */
async function withRetry(fn, { attempts = RETRY_ATTEMPTS, baseMs = RETRY_BASE_MS } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, baseMs * attempt));
      }
    }
  }
  throw lastError;
}

function sender() {
  return env.mailFrom || `Formularios con IA <${env.smtpUser || "no-reply@localhost"}>`;
}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const LOGO_CID = "formularios-logo";

/**
 * Imagen de marca del correo (el favicon del sitio).
 *
 * Se inserta como adjunto en línea (`cid:`): los clientes de correo la cargan
 * desde el propio mensaje, sin depender de que la URL sea pública/alcanzable
 * (Gmail no descarga imágenes de IPs privadas como `192.168.x.x`). Si no se
 * encuentra el archivo, se cae a `${FRONTEND_URL}/favicon.png`.
 *
 * Busca, por orden: `MAIL_LOGO_PATH`, el favicon del frontend y un asset local.
 * Devuelve `{ logoUrl, attachments }` listos para `sendMail`.
 */
function brandLogo() {
  const candidates = [
    env.mailLogoPath,
    path.resolve(MODULE_DIR, "../../frontend/AIFormBuilder/public/favicon.png"),
    path.resolve(MODULE_DIR, "../public/favicon.png"),
  ].filter(Boolean);
  const file = candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
  if (file) {
    return {
      logoUrl: `cid:${LOGO_CID}`,
      attachments: [{ filename: path.basename(file), path: file, cid: LOGO_CID }],
    };
  }
  const base = String(env.frontendUrl || env.clientUrl || "")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
  return { logoUrl: `${base}/favicon.png`, attachments: [] };
}

/**
 * Envía el código de recuperación. Devuelve { messageId, preview }.
 * Lanza si el proveedor no está configurado o el sendMail falla (tras reintentos).
 */
export async function sendPasswordResetCode({ to, code, ttlMinutes, language = "es" }) {
  const t = await getTransporter();
  const logo = brandLogo();
  const rendered = resetEmail({ language, code, ttlMinutes, logoUrl: logo.logoUrl });
  const info = await withRetry(() =>
    t.sendMail({
      from: sender(),
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: logo.attachments,
    }),
  );
  const preview = nodemailer.getTestMessageUrl(info) || null;
  return { messageId: info.messageId, preview };
}

/**
 * Envía los datos de acceso de una cuenta recién creada (URL + usuario +
 * contraseña, con el nombre del usuario y su entidad). Devuelve
 * { messageId, preview }. Lanza si el proveedor no está configurado o el envío
 * falla: el llamador decide si aborta o solo registra.
 */
export async function sendWelcomeEmail({
  to,
  name,
  entityName,
  url,
  username,
  email,
  password,
  language = "es",
}) {
  const t = await getTransporter();
  const logo = brandLogo();
  const rendered = welcomeEmail({
    language,
    mode: "credentials",
    logoUrl: logo.logoUrl,
    name,
    entityName,
    username,
    email,
    password,
    url,
  });
  const info = await withRetry(() =>
    t.sendMail({
      from: sender(),
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: logo.attachments,
    }),
  );
  const preview = nodemailer.getTestMessageUrl(info) || null;
  return { messageId: info.messageId, preview };
}

/**
 * Correo de bienvenida unificado. NUNCA lanza: devuelve siempre
 * `{ sent, reason, to, preview? }` para que el alta se complete aunque el
 * correo falle.
 *
 * `mode`:
 *  - "activation": variante A (sin contraseña; requiere `activationUrl`).
 *  - "credentials": variante B (con contraseña temporal).
 */
export async function sendUserWelcomeEmail({
  to,
  mode = "activation",
  language = "es",
  name,
  entityName,
  role,
  username,
  email,
  password,
  url,
  activationUrl,
  ttlHours = env.mailActivationTtlHours,
}) {
  const result = { sent: false, reason: null, to };
  if (!isMailConfigured()) {
    result.reason = "disabled";
    return result;
  }
  try {
    const t = await getTransporter();
    const logo = brandLogo();
    const rendered = welcomeEmail({
      language,
      mode,
      logoUrl: logo.logoUrl,
      name,
      entityName,
      role,
      username,
      email,
      password,
      url,
      activationUrl,
      ttlHours,
    });
    const info = await withRetry(() =>
      t.sendMail({
        from: sender(),
        to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        attachments: logo.attachments,
      }),
    );
    result.sent = true;
    result.reason = null;
    const preview = nodemailer.getTestMessageUrl(info) || null;
    if (preview) result.preview = preview;
    return result;
  } catch (error) {
    result.reason = "error";
    result.error = error?.message || "unknown";
    return result;
  }
}
