import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APIMailer } from "@apimailer/sdk";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import {
  createApiMailerPayload,
  createSmtpTransportOptions,
  resolveMailProvider,
  resolveSmtpFromAddress,
  safeMailErrorCode,
} from "../utils/mailConfiguration.js";
import { welcomeEmail, resetEmail } from "./mail.templates.js";

/**
 * Proveedor de correo transaccional.
 * - MAIL_PROVIDER vacío o cualquier valor distinto de "smtp": usa APIMailer (por defecto).
 * - MAIL_PROVIDER=smtp: usa Nodemailer + SMTP.
 *
 * APIMailer gestiona el remitente desde su panel; el SDK solo acepta { to, subject, body }.
 */

let apimailer = null;
let smtpTransport = null;

export function isMailConfigured() {
  const provider = resolveMailProvider({ mailProvider: env.mailProvider });
  if (provider === "smtp") {
    return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
  }
  return Boolean(process.env.APIMAILER_API_KEY || env.apiMailerKey);
}

function getApiMailer() {
  if (apimailer) return apimailer;

  const apiKey = process.env.APIMAILER_API_KEY || env.apiMailerKey;
  if (!apiKey) {
    throw new Error("APIMAILER_API_KEY no está configurada");
  }

  apimailer = new APIMailer({ apiKey });
  return apimailer;
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP no está configurado (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  }

  smtpTransport = nodemailer.createTransport(
    createSmtpTransportOptions({
      smtpHost: env.smtpHost,
      smtpPort: env.smtpPort,
      mailSecure: env.mailSecure,
      smtpUser: env.smtpUser,
      smtpPass: env.smtpPass,
    }),
  );
  return smtpTransport;
}

const RETRY_ATTEMPTS = 2;
const RETRY_BASE_MS = 500;

async function withRetry(
  fn,
  { attempts = RETRY_ATTEMPTS, baseMs = RETRY_BASE_MS } = {},
) {
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

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const LOGO_CID = "formularios-logo";

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
      attachments: [
        {
          filename: path.basename(file),
          path: file,
          cid: LOGO_CID,
        },
      ],
    };
  }

  const base = String(env.frontendUrl || env.clientUrl || "")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");

  return { logoUrl: `${base}/favicon.png`, attachments: [] };
}

async function sendMail({
  to,
  subject,
  html,
  text,
  attachments,
  fromName,
  fromEmail,
}) {
  const provider = resolveMailProvider({ mailProvider: env.mailProvider });

  if (provider === "smtp") {
    const transport = getSmtpTransport();
    const info = await transport.sendMail({
      from: `"${fromName || process.env.MAIL_FROM_NAME || "Formularios con IA"}" <${resolveSmtpFromAddress({ fromEmail, mailFrom: env.mailFrom, smtpUser: env.smtpUser })}>`,
      to,
      subject,
      html,
      text,
      attachments: attachments?.length
        ? attachments.map((a) => ({
            filename: a.filename,
            content: a.content ?? undefined,
            path: a.path ?? undefined,
            cid: a.cid,
          }))
        : [],
    });
    return {
      messageId: info.messageId || "smtp-ok",
      preview: null,
    };
  }

  // APIMailer (por defecto)
  const mailer = getApiMailer();
  try {
    const result = await mailer.send(createApiMailerPayload({
      to,
      subject,
      body: html || text,
    }));
    console.log("[mail.service] APIMailer respuesta:", JSON.stringify(result));
    return {
      messageId: result?.id || result?.data?.messageId || result?.messageId || "apimailer-ok",
      preview: null,
    };
  } catch (error) {
    console.error("[mail.service] APIMailer error:", error);
    console.error("[mail.service] APIMailer código:", error?.code, "status:", error?.status, "mensaje:", error?.message, "response:", error?.response);
    throw error;
  }
}

export async function sendPasswordResetCode({
  to,
  code,
  ttlMinutes,
  language = "es",
}) {
  const logo = brandLogo();
  const rendered = resetEmail({
    language,
    code,
    ttlMinutes,
    logoUrl: logo.logoUrl,
  });

  const result = await withRetry(() =>
    sendMail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: [],
    }),
  );

  return {
    messageId: result?.messageId || "apimailer-ok",
    preview: null,
  };
}

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

  const result = await withRetry(() =>
    sendMail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments: [],
    }),
  );

  return {
    messageId: result?.messageId || "apimailer-ok",
    preview: null,
  };
}

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

    await withRetry(() =>
      sendMail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        attachments: [],
      }),
    );

    result.sent = true;
    result.reason = null;
    return result;
  } catch (error) {
    console.error("[mail.service] Error al enviar correo:", error.message);
    result.reason = "error";
    try {
      result.error = safeMailErrorCode(error);
    } catch {
      result.error = error.code || "UNKNOWN_ERROR";
    }
    return result;
  }
}
