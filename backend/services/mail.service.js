import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APIMailer } from "@apimailer/sdk";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { safeMailErrorCode } from "../utils/mailConfiguration.js";
import { welcomeEmail, resetEmail } from "./mail.templates.js";

let apimailer = null;
let smtpTransport = null;

function getMailProvider() {
  return String(process.env.MAIL_PROVIDER || env.mailProvider || "").toLowerCase() || "apimailer";
}

export function isMailConfigured() {
  const provider = getMailProvider();
  console.log("[mail.service] isMailConfigured → provider:", provider);

  if (provider === "smtp") {
    const ok = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
    console.log("[mail.service] SMTP configured:", ok, { host: !!env.smtpHost, user: !!env.smtpUser, pass: !!env.smtpPass });
    return ok;
  }

  const hasKey = Boolean(process.env.APIMAILER_API_KEY || env.apiMailerKey);
  console.log("[mail.service] APIMailer key configured:", hasKey);
  return hasKey;
}

function getApiMailer() {
  if (apimailer) return apimailer;

  const apiKey = process.env.APIMAILER_API_KEY || env.apiMailerKey;
  if (!apiKey) {
    throw new Error("APIMAILER_API_KEY no está configurada");
  }

  console.log("[mail.service] Inicializando APIMailer con clave:", apiKey.substring(0, 10) + "...");
  apimailer = new APIMailer({ apiKey });
  return apimailer;
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const port = Number(env.smtpPort) || 465;
  const secure = env.mailSecure === true || port === 465;

  smtpTransport = nodemailer.createTransport({
    host: env.smtpHost,
    port,
    secure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
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
  const provider = getMailProvider();
  console.log("[mail.service] sendMail → provider:", provider, "to:", to);

  if (provider === "smtp") {
    const transport = getSmtpTransport();
    const info = await transport.sendMail({
      from: `"${fromName || process.env.MAIL_FROM_NAME || "Formularios con IA"}" <${fromEmail || env.mailFrom || env.smtpUser || "no-reply@example.com"}>`,
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
    console.log("[mail.service] SMTP enviado correctamente, messageId:", info.messageId);
    return {
      messageId: info.messageId || "smtp-ok",
      preview: null,
    };
  }

  // APIMailer (por defecto)
  const mailLogs = [];
  mailLogs.push("--- INICIANDO ENVÍO DE CORREO ---");
  mailLogs.push(`MAIL_PROVIDER actual: ${process.env.MAIL_PROVIDER || env.mailProvider || "(vacío)"}`);
  mailLogs.push(`¿Existe API Key?: ${!!process.env.APIMAILER_API_KEY}`);

  const mailer = getApiMailer();
  try {
    mailLogs.push(`Llamando a mailer.send() de APIMailer para: ${to}`);
    const result = await mailer.send({
      to,
      subject,
      body: html || text,
    });
    mailLogs.push(`✅ APIMailer respondió con éxito: ${JSON.stringify(result)}`);
    return {
      messageId: result?.id || result?.data?.messageId || result?.messageId || "apimailer-ok",
      preview: null,
      logs: mailLogs,
    };
  } catch (error) {
    mailLogs.push(`🚨 ERROR CRÍTICO AL ENVIAR CORREO: ${error?.message ?? String(error)}`);
    mailLogs.push(`Detalles del error: ${JSON.stringify(error, null, 2)}`);
    mailLogs.push(`Código: ${error?.code} Status: ${error?.status} Mensaje: ${error?.message} Response: ${error?.response}`);
    const err = error;
    err.logs = mailLogs;
    throw err;
  }
}

export async function sendPasswordResetCode({
  to,
  code,
  ttlMinutes,
  language = "es",
}) {
  console.log("[mail.service] sendPasswordResetCode iniciado para:", to);

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

  console.log("[mail.service] sendPasswordResetCode completado:", result.messageId);
  return {
    messageId: result?.messageId || "apimailer-ok",
    preview: null,
    logs: result?.logs ?? [],
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
  console.log("[mail.service] sendWelcomeEmail iniciado para:", to);

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

  console.log("[mail.service] sendWelcomeEmail completado:", result.messageId);
  return {
    messageId: result?.messageId || "apimailer-ok",
    preview: null,
    logs: result?.logs ?? [],
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

  console.log("[mail.service] sendUserWelcomeEmail iniciado para:", to);

  if (!isMailConfigured()) {
    result.reason = "disabled";
    console.log("[mail.service] Correo deshabilitado (isMailConfigured=false)");
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

    const sendResult = await withRetry(() =>
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
    result.logs = sendResult?.logs ?? [];
    console.log("[mail.service] sendUserWelcomeEmail completado con éxito");
    return result;
  } catch (error) {
    console.error("[mail.service] Error al enviar correo:", error);
    console.error("[mail.service] Código:", error?.code, "Status:", error?.status, "Mensaje:", error?.message, "Response:", error?.response);
    result.reason = "error";
    try {
      result.error = safeMailErrorCode(error);
    } catch {
      result.error = error.code || "UNKNOWN_ERROR";
    }
    if (error.logs) result.logs = error.logs;
    return result;
  }
}
