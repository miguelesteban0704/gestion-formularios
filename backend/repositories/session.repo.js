import { query } from "../config/db.js";

export async function createSession({ userId, jti, deviceInfo = {}, ip, userAgent, expiresAt, absoluteExpiresAt }) {
  const { rows } = await query(
    `INSERT INTO user_sessions
       (user_id, jti, device_info, ip, user_agent, expires_at, absolute_expires_at, last_user_activity)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, now())
     RETURNING *`,
    [userId, jti, JSON.stringify(deviceInfo), ip, userAgent, expiresAt, absoluteExpiresAt]
  );
  return rows[0];
}

export async function findByJti(jti) {
  if (!jti) return null;
  const { rows } = await query(`SELECT * FROM user_sessions WHERE jti = $1 LIMIT 1`, [jti]);
  return rows[0] || null;
}

export async function listActiveByUser(userId) {
  const { rows } = await query(
    `SELECT * FROM user_sessions 
     WHERE user_id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY last_active DESC`,
    [userId]
  );
  return rows;
}

/** Historial completo de accesos del usuario (activas + cerradas). */
export async function listByUser(userId) {
  const { rows } = await query(
    `SELECT * FROM user_sessions
     WHERE user_id = $1
     ORDER BY last_active DESC`,
    [userId]
  );
  return rows;
}

export async function countActiveByUser(userId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int as count FROM user_sessions WHERE user_id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );
  return rows[0].count;
}

export async function updateLastActive(jti) {
  if (!jti) return;
  await query(`UPDATE user_sessions SET last_active = NOW() WHERE jti = $1`, [jti]);
}

/**
 * Marca la última INTERACCIÓN real del usuario (heartbeat del frontend). Es lo
 * que mide la inactividad: los sondeos automáticos (polling, SSE) no cuentan.
 */
export async function touchUserActivity(jti) {
  if (!jti) return;
  await query(`UPDATE user_sessions SET last_user_activity = NOW() WHERE jti = $1`, [jti]);
}

/** Cierra las sesiones activas más antiguas de un usuario conservando solo las
 * `keep` más recientes. Se llama tras crear una sesión nueva para respetar el
 * tope de sesiones concurrentes. Devuelve cuántas cerró.
 */
export async function deactivateOldestBeyond(userId, keep) {
  if (!keep || keep < 1) return 0;
  const { rows } = await query(
    `UPDATE user_sessions SET is_active = false
     WHERE id IN (
       SELECT id FROM user_sessions
       WHERE user_id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY last_active DESC, created_at DESC
       OFFSET $2
     )
     RETURNING id`,
    [userId, keep],
  );
  return rows.length;
}

export async function deactivateByJti(jti) {
  if (!jti) return;
  await query(`UPDATE user_sessions SET is_active = false WHERE jti = $1`, [jti]);
}

export async function deactivateAllByUser(userId) {
  await query(`UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND is_active = true`, [userId]);
}

export async function deactivateAllExcept(userId, keepJti) {
  await query(`UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND jti != $2 AND is_active = true`, [userId, keepJti]);
}

export async function findByIdAndUser(id, userId) {
  const { rows } = await query(`SELECT * FROM user_sessions WHERE id = $1 AND user_id = $2 LIMIT 1`, [id, userId]);
  return rows[0] || null;
}

export async function deactivateById(id, userId) {
  await query(`UPDATE user_sessions SET is_active = false WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function getSessionById(id) {
  const { rows } = await query(`SELECT * FROM user_sessions WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
}
