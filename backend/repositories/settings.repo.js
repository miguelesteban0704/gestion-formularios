import { query } from "../config/db.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSettings(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    lastName: row.last_name,
    bio: row.bio,
    timezone: row.timezone,
    language: row.language,
    dateFormat: row.date_format,
    theme: row.theme,
    accentColor: row.accent_color,
    notificationPrefs: row.notification_prefs,
    emailDigest: row.email_digest,
    totpEnabled: row.totp_enabled,
    totpVerifiedAt: row.totp_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Obtiene o crea el registro de settings para el usuario.
 * Nunca devuelve null si el usuario existe.
 */
export async function getOrCreateSettings(userId) {
  const { rows } = await query(
    `INSERT INTO user_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = user_settings.updated_at
     RETURNING *`,
    [userId],
  );
  return mapSettings(rows[0]);
}

/**
 * Actualiza campos de perfil en users + user_settings en una transacción.
 */
export async function updateProfile(userId, { name, lastName, username, bio, timezone, language, dateFormat, email }) {
  // Actualizar tabla users (campos que viven ahí)
  await query(
    `UPDATE users
     SET
       name       = COALESCE($2, name),
       last_name  = COALESCE($3, last_name),
       username   = COALESCE($4, username),
       email      = COALESCE($5, email)
     WHERE id = $1`,
    [userId, name ?? null, lastName ?? null, username ?? null, email ?? null],
  );

  // Actualizar user_settings
  const { rows } = await query(
    `UPDATE user_settings
     SET
       bio         = COALESCE($2, bio),
       timezone    = COALESCE($3, timezone),
       language    = COALESCE($4, language),
       date_format = COALESCE($5, date_format),
       updated_at  = now()
     WHERE user_id = $1
     RETURNING *`,
    [userId, bio ?? null, timezone ?? null, language ?? null, dateFormat ?? null],
  );
  return mapSettings(rows[0]);
}

/**
 * Actualiza preferencias de notificaciones.
 */
export async function updateNotificationPrefs(userId, { notificationPrefs, emailDigest }) {
  const { rows } = await query(
    `UPDATE user_settings
     SET
       notification_prefs = COALESCE($2::jsonb, notification_prefs),
       email_digest       = COALESCE($3, email_digest),
       updated_at         = now()
     WHERE user_id = $1
     RETURNING *`,
    [userId, notificationPrefs ? JSON.stringify(notificationPrefs) : null, emailDigest ?? null],
  );
  return mapSettings(rows[0]);
}

/**
 * Actualiza preferencias de apariencia / tema / idioma de la interfaz.
 */
export async function updateAppearance(userId, { theme, accentColor, language }) {
  const { rows } = await query(
    `UPDATE user_settings
     SET
       theme        = COALESCE($2, theme),
       accent_color = COALESCE($3, accent_color),
       language     = COALESCE($4, language),
       updated_at   = now()
     WHERE user_id = $1
     RETURNING *`,
    [userId, theme ?? null, accentColor ?? null, language ?? null],
  );
  return mapSettings(rows[0]);
}

/**
 * Actualiza el avatar_url del usuario.
 */
export async function updateAvatar(userId, avatarUrl) {
  const { rows } = await query(
    `UPDATE users SET avatar_url = $2 WHERE id = $1 RETURNING avatar_url`,
    [userId, avatarUrl],
  );
  return rows[0]?.avatar_url ?? null;
}

/**
 * Habilita / deshabilita 2FA. Almacena el secret (cifrado en producción vía app-layer).
 * `clearSecret: true` borra el secreto almacenado (p. ej. al desactivar 2FA).
 */
export async function setTotp(userId, { secret, enabled, verifiedAt, clearSecret = false }) {
  const { rows } = await query(
    `UPDATE user_settings
     SET
       totp_secret      = CASE WHEN $2 THEN NULL ELSE COALESCE($5, totp_secret) END,
       totp_enabled     = $3,
       totp_verified_at = $4,
       updated_at       = now()
     WHERE user_id = $1
     RETURNING totp_enabled, totp_verified_at`,
    [userId, clearSecret, enabled, verifiedAt ?? null, secret ?? null],
  );
  return rows[0];
}

/**
 * Marca la cuenta como desactivada (soft-delete).
 */
export async function deactivateAccount(userId) {
  await query(
    `UPDATE users SET is_active = false, deleted_at = now() WHERE id = $1`,
    [userId],
  );
}

/**
 * Elimina la cuenta completamente (hard-delete). El CASCADE borra todo.
 */
export async function deleteAccount(userId) {
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
}

/**
 * Devuelve las credenciales locales del usuario (password_hash).
 */
export async function getCredentials(userId) {
  const { rows } = await query(
    `SELECT password_hash, password_set_at FROM users WHERE id = $1`,
    [userId],
  );
  return rows[0] || null;
}

/**
 * Guarda el hash de la contraseña local. Un cambio de contraseña por parte del
 * usuario (incluido el cambio forzado tras una temporal) limpia la marca
 * `must_change_password` y la caducidad de la temporal.
 */
export async function setPassword(userId, hash) {
  await query(
    `UPDATE users SET password_hash = $2, password_set_at = now(),
       failed_login_attempts = 0, locked_until = NULL,
       must_change_password = false, temp_password_expires_at = NULL WHERE id = $1`,
    [userId, hash],
  );
}

/**
 * Estado actual TOTP del usuario.
 */
export async function getTotp(userId) {
  const { rows } = await query(
    `SELECT totp_secret, totp_enabled, totp_verified_at FROM user_settings WHERE user_id = $1`,
    [userId],
  );
  return rows[0] || null;
}
