import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import * as settingsRepo from "../repositories/settings.repo.js";
import * as sessionRepo from "../repositories/session.repo.js";
import { findUserById } from "../repositories/user.repo.js";
import * as settingsService from "../services/settings.service.js";
import { sanitizeIdpProfile } from "../utils/idpPublicProfile.js";
import { changePasswordSchema, totpCodeSchema } from "../utils/validation.js";
import { auditNow } from "../middleware/rbac.js";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { query } from "../config/db.js";

// ─── GET /api/settings ──────────────────────────────────────────────────────
export const getSettings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [user, settings] = await Promise.all([
    findUserById(userId),
    settingsRepo.getOrCreateSettings(userId),
  ]);

  sendSuccess(res, {
    data: {
      // Perfil (de users)
      id: user._id,
      name: user.name,
      lastName: user.lastName ?? "",
      email: user.email,
      username: user.username || settings.username || "",
      bio: settings.bio,
      avatarUrl: user.avatarUrl,
      avatarColor: user.avatarColor,
      idpProfile: sanitizeIdpProfile(user.idpProfile),
      externalId: user.externalId ?? null,
      // Configuración (de user_settings)
      timezone: settings.timezone,
      language: settings.language,
      dateFormat: settings.dateFormat,
      theme: settings.theme,
      accentColor: settings.accentColor,
      notificationPrefs: settings.notificationPrefs,
      emailDigest: settings.emailDigest,
      totpEnabled: settings.totpEnabled,
      passwordSetAt: user.passwordSetAt ?? null,
    },
  });
});

// ─── PATCH /api/settings/profile ────────────────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { name, lastName, username, bio, timezone, language, dateFormat } = req.body;

  // Validación mínima
  if (name !== undefined && (typeof name !== "string" || name.trim().length < 2)) {
    throw ApiError.badRequest("El nombre debe tener al menos 2 caracteres.");
  }
  if (username !== undefined) {
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,32}$/.test(clean)) {
      throw ApiError.badRequest(
        "El username solo puede contener letras, números, puntos, guiones y guiones bajos (3-32 caracteres).",
      );
    }
    // Unicidad
    const { rows } = await query(
      `SELECT id FROM users WHERE username = $1 AND id != $2`,
      [clean, userId],
    );
    if (rows.length > 0) throw ApiError.conflict("Ese username ya está en uso.");
  }

  const updated = await settingsRepo.updateProfile(userId, {
    name: name?.trim(),
    lastName: lastName?.trim(),
    username: username?.trim().toLowerCase(),
    bio: bio?.trim(),
    timezone,
    language,
    dateFormat,
  });

  sendSuccess(res, { message: "Perfil actualizado", data: updated });
});

// ─── PATCH /api/settings/notifications ──────────────────────────────────────
export const updateNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notificationPrefs, emailDigest } = req.body;

  const VALID_DIGESTS = ["immediate", "daily", "weekly", "none"];
  if (emailDigest && !VALID_DIGESTS.includes(emailDigest)) {
    throw ApiError.badRequest(`emailDigest debe ser uno de: ${VALID_DIGESTS.join(", ")}`);
  }

  const updated = await settingsRepo.updateNotificationPrefs(userId, {
    notificationPrefs,
    emailDigest,
  });

  sendSuccess(res, { message: "Notificaciones actualizadas", data: updated });
});

// ─── PATCH /api/settings/appearance ─────────────────────────────────────────
export const updateAppearance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { theme, accentColor, language } = req.body;

  const VALID_THEMES = ["system", "light", "dark"];
  if (theme && !VALID_THEMES.includes(theme)) {
    throw ApiError.badRequest(`theme debe ser: ${VALID_THEMES.join(", ")}`);
  }
  if (accentColor && !/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
    throw ApiError.badRequest("accentColor debe ser un hex válido (#RRGGBB).");
  }
  const VALID_LANGS = ["es", "en"];
  if (language && !VALID_LANGS.includes(language)) {
    throw ApiError.badRequest(`language debe ser: ${VALID_LANGS.join(", ")}`);
  }

  const updated = await settingsRepo.updateAppearance(userId, { theme, accentColor, language });
  sendSuccess(res, { message: "Apariencia actualizada", data: updated });
});

// ─── POST /api/settings/avatar ───────────────────────────────────────────────
export const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) throw ApiError.badRequest("No se recibió ningún archivo.");

  const ext = path.extname(req.file.originalname).toLowerCase();
  const ALLOWED = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  if (!ALLOWED.includes(ext)) {
    throw ApiError.badRequest("Solo se permiten imágenes JPG, PNG, WEBP o GIF.");
  }
  if (req.file.size > 4 * 1024 * 1024) {
    throw ApiError.badRequest("El archivo no puede superar 4 MB.");
  }

  // Guardar en /public/avatars/<userId><ext>
  const uploadDir = path.join(process.cwd(), "public", "avatars");
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${userId}${ext}`;
  const dest = path.join(uploadDir, filename);
  await fs.writeFile(dest, req.file.buffer);

  const avatarUrl = `/avatars/${filename}`;
  await settingsRepo.updateAvatar(userId, avatarUrl);

  sendSuccess(res, { message: "Avatar actualizado", data: { avatarUrl } });
});

// ─── DELETE /api/settings/avatar ─────────────────────────────────────────────
export const deleteAvatar = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await settingsRepo.updateAvatar(userId, null);
  sendSuccess(res, { message: "Avatar eliminado" });
});

// ─── GET /api/settings/sessions ─────────────────────────────────────────────
export const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessions = await sessionRepo.listByUser(userId);

  const currentJti = req.token?.jti;
  const mapped = sessions.map((s) => ({
    id: s.id,
    isCurrent: s.jti === currentJti,
    isActive: s.is_active,
    device: s.device_info?.device ?? null,
    browser: s.device_info?.browser ?? null,
    os: s.device_info?.os ?? null,
    ip: s.ip ?? null,
    location: s.device_info?.location ?? null,
    lastActive: s.last_active,
    createdAt: s.created_at,
  }));

  sendSuccess(res, { data: mapped });
});

// ─── DELETE /api/settings/sessions/:id ──────────────────────────────────────
export const revokeSession = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const session = await sessionRepo.findByIdAndUser(id, userId);
  if (!session) throw ApiError.notFound("Sesión no encontrada.");

  // No se puede revocar la sesión actual desde aquí
  if (session.jti === req.token?.jti) {
    throw ApiError.badRequest("Para cerrar la sesión actual usa /logout.");
  }

  await sessionRepo.deactivateById(id, userId);
  sendSuccess(res, { message: "Sesión cerrada correctamente." });
});

// ─── DELETE /api/settings/sessions ──────────────────────────────────────────
// Cierra todas menos la actual
export const revokeOtherSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentJti = req.token?.jti;

  if (currentJti) {
    await sessionRepo.deactivateAllExcept(userId, currentJti);
  } else {
    await sessionRepo.deactivateAllByUser(userId);
  }

  sendSuccess(res, { message: "Todas las demás sesiones han sido cerradas." });
});

// ─── GET /api/settings/export ────────────────────────────────────────────────
export const exportData = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const format = req.query.format === "csv" ? "csv" : "json";

  const [user, settings, forms] = await Promise.all([
    findUserById(userId),
    settingsRepo.getOrCreateSettings(userId),
    query(`SELECT id, title, status, created_at FROM forms WHERE owner = $1`, [userId]),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
    },
    settings: {
      timezone: settings.timezone,
      language: settings.language,
      dateFormat: settings.dateFormat,
      theme: settings.theme,
      emailDigest: settings.emailDigest,
    },
    forms: forms.rows,
  };

  if (format === "json") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="my-data-${userId}.json"`);
    return res.send(JSON.stringify(payload, null, 2));
  }

  // CSV simple
  const csvRows = [
    "section,key,value",
    `profile,name,${user.name}`,
    `profile,email,${user.email ?? ""}`,
    `profile,createdAt,${user.createdAt}`,
    `settings,timezone,${settings.timezone}`,
    `settings,language,${settings.language}`,
    `settings,theme,${settings.theme}`,
    ...forms.rows.map((f) => `form,${f.id},${f.title}`),
  ];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="my-data-${userId}.csv"`);
  return res.send(csvRows.join("\n"));
});

// ─── POST /api/settings/deactivate ──────────────────────────────────────────
export const deactivateAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { confirmWord } = req.body;
  if (confirmWord !== "DESACTIVAR") {
    throw ApiError.badRequest("Escribe DESACTIVAR para confirmar.");
  }
  await settingsRepo.deactivateAccount(userId);
  await sessionRepo.deactivateAllByUser(userId);
  sendSuccess(res, { message: "Cuenta desactivada. Puedes reactivarla iniciando sesión." });
});

// ─── DELETE /api/settings/account ───────────────────────────────────────────
export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { confirmWord } = req.body;
  if (confirmWord !== "ELIMINAR") {
    throw ApiError.badRequest("Escribe ELIMINAR para confirmar.");
  }
  await settingsRepo.deleteAccount(userId);
  sendSuccess(res, { message: "Cuenta eliminada permanentemente." });
});

// ─── POST /api/settings/password ─────────────────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      parsed.error.issues[0]?.message || "Los datos de la contraseña no son válidos.",
    );
  }

  const data = await settingsService.changePassword(userId, parsed.data);

  // Al cambiar la contraseña, la credencial de los demás dispositivos ya no
  // es la misma: revoca todas las sesiones excepto la actual (no cierro la
  // propia, así el usuario no se ve obligado a reautenticar en el mismo
  // navegador mientras escribe la nueva). La acción se audita.
  const currentJti = req.token?.jti;
  if (currentJti) {
    await sessionRepo.deactivateAllExcept(userId, currentJti);
  } else {
    await sessionRepo.deactivateAllByUser(userId);
  }
  await auditNow(req, "auth.password.changed", { entityType: "user", entityId: userId, revokedOthers: true });

  sendSuccess(res, { message: "Contraseña actualizada", data });
});

// ─── POST /api/settings/2fa/setup ────────────────────────────────────────────
export const setup2FA = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const accountName = req.user?.email || req.user?.name || "user";
  const data = await settingsService.setupTotp(userId, accountName);
  sendSuccess(res, {
    message: "Escanea el código QR con tu app de autenticación.",
    data,
  });
});

// ─── POST /api/settings/2fa/verify ───────────────────────────────────────────
export const verify2FA = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const parsed = totpCodeSchema.safeParse(req.body?.code);
  if (!parsed.success) {
    throw ApiError.badRequest("El código debe tener exactamente 6 dígitos.");
  }
  const data = await settingsService.verifyTotp(userId, parsed.data);
  sendSuccess(res, { message: "Verificación en dos pasos activada.", data });
});

// ─── POST /api/settings/2fa/disable ──────────────────────────────────────────
export const disable2FA = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const parsed = totpCodeSchema.safeParse(req.body?.code);
  if (!parsed.success) {
    throw ApiError.badRequest("El código debe tener exactamente 6 dígitos.");
  }
  const data = await settingsService.disableTotp(userId, parsed.data);
  sendSuccess(res, { message: "Verificación en dos pasos desactivada.", data });
});
