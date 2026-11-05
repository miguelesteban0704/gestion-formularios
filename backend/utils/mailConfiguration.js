const TRANSPORT_ERROR_CODES = new Set([
  "EAUTH",
  "ECONNECTION",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EMESSAGE",
  "EENVELOPE",
  "ESOCKET",
  "ESTREAM",
  "ETIMEDOUT",
]);

export function isMailConfigured({ mailProvider, nodeEnv, smtpHost, smtpUser, smtpPass } = {}) {
  const provider = String(mailProvider || "").trim().toLowerCase();
  if (!provider || provider === "none") return false;
  if (provider === "ethereal") return nodeEnv !== "production";
  if (provider !== "smtp") return false;
  return Boolean(smtpHost && smtpUser && smtpPass);
}

export function resolveMailProvider({ mailProvider } = {}) {
  const provider = String(mailProvider || "").trim().toLowerCase();
  return provider || "apimailer";
}

export function createApiMailerPayload({ to, subject, body } = {}) {
  return { to, subject, body };
}

export function createSmtpTransportOptions({
  smtpHost,
  smtpPort,
  mailSecure,
  smtpUser,
  smtpPass,
} = {}) {
  const port = Number(smtpPort) || 587;
  const secureForPort = port === 465;
  const secure = typeof mailSecure === "boolean" && mailSecure === secureForPort
    ? mailSecure
    : secureForPort;

  return {
    host: smtpHost,
    port,
    secure,
    requireTLS: port === 587,
    auth: { user: smtpUser, pass: smtpPass },
  };
}

export function resolveSmtpFromAddress({ fromEmail, mailFrom, smtpUser } = {}) {
  return fromEmail || mailFrom || smtpUser;
}

export function safeMailErrorCode(error) {
  return TRANSPORT_ERROR_CODES.has(error?.code) ? error.code : "MAIL_TRANSPORT_ERROR";
}
