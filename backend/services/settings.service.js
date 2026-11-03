import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { ApiError } from "../utils/ApiError.js";
import * as settingsRepo from "../repositories/settings.repo.js";

// Tolerancia ±30s para compensar pequeños desfases de reloj.
authenticator.options = { window: 1 };

// ─── Contraseña local ─────────────────────────────────────────────────────────

/**
 * Cambia o establece la contraseña local.
 * Si el usuario aún no tiene contraseña local (auth OIDC), no requiere la actual.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const creds = await settingsRepo.getCredentials(userId);

  if (creds?.password_hash) {
    if (!currentPassword) {
      throw ApiError.badRequest("Introduce tu contraseña actual.");
    }
    const ok = await bcrypt.compare(currentPassword, creds.password_hash);
    if (!ok) throw ApiError.unauthorized("La contraseña actual es incorrecta.");
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await settingsRepo.setPassword(userId, hash);
  return { passwordSetAt: new Date().toISOString() };
}

// ─── 2FA / TOTP ───────────────────────────────────────────────────────────────

/**
 * Genera un secreto TOTP + QR y lo guarda como "pendiente" (sin habilitar).
 * Habilitar solo es posible tras verificar un código (prueba de posesión).
 */
export async function setupTotp(userId, accountName) {
  const secret = authenticator.generateSecret();
  const issuer = "Timely Forms AI";
  const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);
  const qrDataUrl = await qrcode.toDataURL(otpauthUrl, {
    width: 248,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  await settingsRepo.setTotp(userId, { secret, enabled: false, verifiedAt: null });

  return { secret, issuer, otpauthUrl, qrDataUrl };
}

function requireSecret(totp, { mustBeEnabled = false } = {}) {
  if (!totp?.totp_secret) {
    throw ApiError.badRequest("Genera primero el código QR de 2FA.");
  }
  if (mustBeEnabled && !totp.totp_enabled) {
    throw ApiError.badRequest("La verificación en dos pasos no está activada.");
  }
}

/** Confirma un código TOTP y habilita 2FA. */
export async function verifyTotp(userId, code) {
  const totp = await settingsRepo.getTotp(userId);
  requireSecret(totp);

  if (!authenticator.check(code, totp.totp_secret)) {
    throw ApiError.badRequest("Código incorrecto. Revisa la hora de tu dispositivo.");
  }

  await settingsRepo.setTotp(userId, { enabled: true, verifiedAt: new Date() });
  return { totpEnabled: true, verifiedAt: new Date().toISOString() };
}

/** Desactiva 2FA tras verificar un código válido. */
export async function disableTotp(userId, code) {
  const totp = await settingsRepo.getTotp(userId);
  requireSecret(totp, { mustBeEnabled: true });

  if (!authenticator.check(code, totp.totp_secret)) {
    throw ApiError.badRequest("Código incorrecto.");
  }

  await settingsRepo.setTotp(userId, { enabled: false, verifiedAt: null, clearSecret: true });
  return { totpEnabled: false };
}