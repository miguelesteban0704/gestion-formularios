export function recoveryCodeLogMessage({ nodeEnv, email, code }) {
  if (nodeEnv !== "development") return null;
  return `[local-auth] código de recuperación (sin correo) para ${email}: ${code}`;
}

export function recoveryResponseData({ nodeEnv, code, mailed }) {
  if (nodeEnv === "production") return {};
  return { code, mailed };
}
