import { query } from "../config/db.js";

function mapUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url,
    externalId: row.external_id,
    idpProfile: row.idp_profile ?? null,
    lastName: row.last_name ?? "",
    bio: row.bio ?? "",
    username: row.username ?? "",
    isActive: row.is_active ?? true,
    passwordSetAt: row.password_set_at ?? null,
    mustChangePassword: row.must_change_password ?? false,
    tempPasswordExpiresAt: row.temp_password_expires_at ?? null,
    role: row.role ?? null,
    entityId: row.entity_id ?? null,
    accessUrlId: row.access_url_id ?? null,
    // Invitado anónimo (sesión autoemitida): external_id `guest-*`, sin clave.
    isGuest: String(row.external_id || "").startsWith("guest-"),
    createdAt: row.created_at,
  };
}

export async function findUserByExternalId(externalId) {
  const { rows } = await query(`SELECT * FROM users WHERE external_id = $1`, [externalId]);
  return mapUser(rows[0]);
}

async function findUserByEmail(email) {
  if (!email) return null;
  const { rows } = await query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
  return mapUser(rows[0]);
}

export async function findUserById(id) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return mapUser(rows[0]);
}

export async function findUserByAccessUrlId(accessUrlId) {
  if (!accessUrlId) return null;
  const { rows } = await query(
    `SELECT * FROM users WHERE access_url_id = $1 LIMIT 1`,
    [accessUrlId],
  );
  return mapUser(rows[0]);
}

/**
 * Contexto de identidad de una cuenta para `/auth/me`: la entidad vinculada
 * (id/code/name) y el slug de su URL de acceso. `mapUser` no los trae porque
 * viven en tablas aparte; el frontend los usa para el routing por entidad
 * (`/panel-gestion/:entitySlug`) y las etiquetas, sin llamadas extra.
 */
export async function findUserEntityContext(userId) {
  const { rows } = await query(
    `SELECT e.id AS entity_id, e.code AS entity_code, e.name AS entity_name,
            au.slug AS access_slug
     FROM users u
     LEFT JOIN entities e ON e.id = u.entity_id
     LEFT JOIN access_urls au ON au.id = u.access_url_id
     WHERE u.id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return { entity: null, accessUrlSlug: null };
  return {
    entity: row.entity_id
      ? { _id: row.entity_id, code: row.entity_code, name: row.entity_name }
      : null,
    accessUrlSlug: row.access_slug || null,
  };
}

export async function upsertFromIdentityProvider({ externalId, name, email, avatarColor, avatarUrl, idpProfile }) {
  const normalizedEmail = email?.toLowerCase() || null;
  const existingByEmail = await findUserByEmail(normalizedEmail);

  if (existingByEmail) {
    const { rows } = await query(
      `UPDATE users
      SET name = $2,
          external_id = $3,
          avatar_color = COALESCE($4, avatar_color),
          avatar_url = COALESCE($5, avatar_url),
          idp_profile = COALESCE($6::jsonb, idp_profile)
       WHERE id = $1
       RETURNING *`,
      [
        existingByEmail._id,
        name,
        externalId,
        avatarColor || null,
        avatarUrl || null,
        idpProfile ? JSON.stringify(idpProfile) : null,
      ],
    );
    return mapUser(rows[0]);
  }

  const { rows } = await query(
    `INSERT INTO users (name, email, external_id, avatar_color, avatar_url, idp_profile)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (external_id) DO UPDATE
       SET name = EXCLUDED.name,
           email = EXCLUDED.email,
           avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
           idp_profile = EXCLUDED.idp_profile
     RETURNING *`,
    [
      name,
      normalizedEmail,
      externalId,
      avatarColor || "#01bc7c",
      avatarUrl || null,
      idpProfile ? JSON.stringify(idpProfile) : null,
    ],
  );
  return mapUser(rows[0]);
}

/**
 * Persiste el perfil completo del proveedor de identidad (claims del id_token).
 * Se usa para backfill de sesiones existentes cuando aún no hay idp_profile.
 */
export async function setIdpProfile(userId, profile) {
  if (!profile) return;
  await query(`UPDATE users SET idp_profile = $2::jsonb WHERE id = $1`, [
    userId,
    JSON.stringify(profile),
  ]);
}

/**
 * Adopta el preferred_username del proveedor como @handle solo si el usuario
 * aún no tiene uno y el nombre está libre. Nunca rompe el login.
 */
export async function setIdpUsernameIfFree(userId, username) {
  if (!username) return;
  try {
    await query(
      `UPDATE users SET username = $2
       WHERE id = $1 AND (username IS NULL OR username = '')
         AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.username = $2)`,
      [userId, username],
    );
  } catch {
    /* conflicto de unicidad → se ignora, el login nunca falla por esto */
  }
}

export async function updateUserProfile(id, { name, avatarColor }) {
  const { rows } = await query(
    `UPDATE users SET name = COALESCE($2, name), avatar_color = COALESCE($3, avatar_color)
     WHERE id = $1 RETURNING *`,
    [id, name ?? null, avatarColor ?? null],
  );
  return mapUser(rows[0]);
}

export async function deleteUser(id) {
  await query(`DELETE FROM users WHERE id = $1`, [id]);
}

// ── Auth local paralela + administración por rol ────────────────────────────
// El secreto (hash, intentos, bloqueo) nunca sale por mapUser: tiene su
// propia lectura para el login local.

export async function findUserWithSecret(emailOrUsername) {
  const value = String(emailOrUsername || "").trim();
  if (!value) return null;
  const { rows } = await query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1`,
    [value],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...mapUser(row),
    passwordHash: row.password_hash || null,
    failedLoginAttempts: row.failed_login_attempts || 0,
    lockedUntil: row.locked_until || null,
  };
}

export async function findEntityAdminByEntity(entityId, excludeUserId = null) {
  const params = [entityId];
  let excludeClause = "";
  if (excludeUserId) {
    params.push(excludeUserId);
    excludeClause = ` AND id <> $${params.length}`;
  }
  const { rows } = await query(
    `SELECT * FROM users WHERE role = 'entity_admin' AND entity_id = $1${excludeClause} LIMIT 1`,
    params,
  );
  return mapUser(rows[0]);
}

export async function createLocalUser({ name, email, username, passwordHash, role, entityId, accessUrlId, mustChangePassword = false, tempPasswordExpiresAt = null }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, username, password_hash, password_set_at, role, entity_id, access_url_id, avatar_color, must_change_password, temp_password_expires_at)
     VALUES ($1, $2, $3, $4, now(), $5, $6, $7, '#0c8b7c', $8, $9) RETURNING *`,
    [
      name,
      String(email).toLowerCase(),
      username ? String(username).toLowerCase() : null,
      passwordHash,
      role,
      entityId || null,
      accessUrlId || null,
      !!mustChangePassword,
      tempPasswordExpiresAt || null,
    ],
  );
  return mapUser(rows[0]);
}

export async function setLocalPassword(userId, passwordHash) {
  await query(
    `UPDATE users SET password_hash = $2, password_set_at = now(),
       failed_login_attempts = 0, locked_until = NULL,
       must_change_password = false, temp_password_expires_at = NULL WHERE id = $1`,
    [userId, passwordHash],
  );
}

/** Contraseña temporal (variante B / reenvío): obliga a cambiarla al entrar. */
export async function setTemporaryPassword(userId, passwordHash, expiresAt) {
  await query(
    `UPDATE users SET password_hash = $2, password_set_at = now(),
       failed_login_attempts = 0, locked_until = NULL,
       must_change_password = true, temp_password_expires_at = $3 WHERE id = $1`,
    [userId, passwordHash, expiresAt || null],
  );
}

export async function recordFailedLogin(userId, attempts, lockedUntil) {
  await query(
    `UPDATE users SET failed_login_attempts = $2, locked_until = $3 WHERE id = $1`,
    [userId, attempts, lockedUntil],
  );
}

export async function resetLoginAttempts(userId) {
  await query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
    [userId],
  );
}

export async function listUsers({ search = "", role = "", entityId = "" } = {}) {
  const where = [];
  const params = [];
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
  }
  if (role) { params.push(role); where.push(`u.role = $${params.length}`); }
  if (entityId) { params.push(entityId); where.push(`u.entity_id = $${params.length}`); }
  const { rows } = await query(
    `SELECT u.*, e.name AS entity_name, au.slug AS access_slug FROM users u
     LEFT JOIN entities e ON e.id = u.entity_id
     LEFT JOIN access_urls au ON au.id = u.access_url_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY u.created_at DESC`,
    params,
  );
  return rows.map((r) => ({ ...mapUser(r), entityName: r.entity_name || null, accessUrlSlug: r.access_slug || null }));
}

export async function adminUpdateUser(id, { name, role, entityId, isActive, accessUrlId, email, username, passwordHash }) {
  const sets = [];
  const params = [id];
  if (name !== undefined) { params.push(name); sets.push(`name = $${params.length}`); }
  if (role !== undefined) { params.push(role); sets.push(`role = $${params.length}`); }
  if (entityId !== undefined) { params.push(entityId || null); sets.push(`entity_id = $${params.length}`); }
  if (accessUrlId !== undefined) { params.push(accessUrlId || null); sets.push(`access_url_id = $${params.length}`); }
  if (isActive !== undefined) { params.push(!!isActive); sets.push(`is_active = $${params.length}`); }
  if (email !== undefined) { params.push(email || null); sets.push(`email = $${params.length}`); }
  if (username !== undefined) { params.push(username || null); sets.push(`username = $${params.length}`); }
  if (passwordHash !== undefined) { params.push(passwordHash); sets.push(`password_hash = $${params.length}`); }
  if (!sets.length) return findUserById(id);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params,
  );
  return mapUser(rows[0]);
}

export async function countByRole(role) {
  const { rows } = await query(`SELECT COUNT(*)::int AS n FROM users WHERE role = $1`, [role]);
  return rows[0].n;
}

// ── Recuperación de contraseña (tokens de un solo uso, con caducidad) ───────
import crypto from "node:crypto";

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export async function createPasswordReset(userId, ttlMinutes, token = crypto.randomBytes(32).toString("hex")) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();
  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, sha256(token), expiresAt],
  );
  return token;
}

export async function findValidPasswordReset(token) {
  const { rows } = await query(
    `SELECT pr.*, u.email FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.token_hash = $1 AND pr.used_at IS NULL AND pr.expires_at > now()
     LIMIT 1`,
    [sha256(token)],
  );
  return rows[0] || null;
}

export async function markPasswordResetUsed(id) {
  await query(`UPDATE password_resets SET used_at = now() WHERE id = $1`, [id]);
}