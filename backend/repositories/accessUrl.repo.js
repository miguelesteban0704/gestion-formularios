import { query } from "../config/db.js";

function mapUrl(row) {
  if (!row) return null;
  return {
    _id: row.id,
    entityId: row.entity_id,
    entityName: row.entity_name || null,
    entityCode: row.entity_code || null,
    role: row.role,
    slug: row.slug,
    // El contexto cifrado se entrega solo al resolver/crear: en listados
    // viaja truncado para no exponer el sello sin necesidad.
    context: row.context,
    isActive: row.is_active,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `SELECT u.*, e.name AS entity_name, e.code AS entity_code
  FROM access_urls u LEFT JOIN entities e ON e.id = u.entity_id`;

/**
 * Usuario(s) vinculado(s) a la URL: `users.access_url_id` es un LEFT JOIN
 * agregado (una URL creador podría compartirse entre varias cuentas, aunque
 * lo normal es una sola). El resto de consultas (`find*`) no lo traen: el
 * agregado solo interesa al listado del panel.
 */
const SELECT_LIST = `SELECT u.*, e.name AS entity_name, e.code AS entity_code,
  COALESCE(
    (SELECT json_agg(json_build_object(
              '_id', us.id, 'name', us.name, 'email', us.email, 'isActive', us.is_active
            ) ORDER BY us.name)
     FROM users us WHERE us.access_url_id = u.id),
    '[]'::json
  ) AS assigned_users
  FROM access_urls u LEFT JOIN entities e ON e.id = u.entity_id`;

export async function listAccessUrls({ entityId = "", role = "", active = "" } = {}) {
  const where = [];
  const params = [];
  if (entityId) { params.push(entityId); where.push(`u.entity_id = $${params.length}`); }
  if (role) { params.push(role); where.push(`u.role = $${params.length}`); }
  if (active !== "") { params.push(active === true || active === "true"); where.push(`u.is_active = $${params.length}`); }
  const { rows } = await query(
    `${SELECT_LIST}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY u.created_at DESC`,
    params,
  );
  return rows.map((r) => ({
    ...mapUrl(r),
    context: undefined,
    assignedUsers: Array.isArray(r.assigned_users) ? r.assigned_users : [],
  }));
}

export async function findAccessUrlBySlug(slug) {
  const { rows } = await query(`${SELECT} WHERE u.slug = $1`, [slug]);
  return mapUrl(rows[0]);
}

export async function findAccessUrlById(id) {
  const { rows } = await query(`${SELECT} WHERE u.id = $1`, [id]);
  return mapUrl(rows[0]);
}

export async function createAccessUrl({ entityId, role, slug, context, createdBy }) {
  const { rows } = await query(
    `INSERT INTO access_urls (entity_id, role, slug, context, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [entityId || null, role, slug, context, createdBy || null],
  );
  return mapUrl(rows[0]);
}

export async function updateAccessUrl(id, { entityId, role, slug, context, isActive }) {
  const sets = [];
  const params = [id];
  if (entityId !== undefined) { params.push(entityId || null); sets.push(`entity_id = $${params.length}`); }
  if (role !== undefined) { params.push(role); sets.push(`role = $${params.length}`); }
  if (slug !== undefined) { params.push(slug); sets.push(`slug = $${params.length}`); }
  if (context !== undefined) { params.push(context); sets.push(`context = $${params.length}`); }
  if (isActive !== undefined) { params.push(!!isActive); sets.push(`is_active = $${params.length}`); }
  if (!sets.length) return findAccessUrlById(id);
  sets.push("updated_at = now()");
  const { rows } = await query(
    `UPDATE access_urls SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params,
  );
  return mapUrl(rows[0]);
}

export async function deleteAccessUrl(id) {
  await query(`DELETE FROM access_urls WHERE id = $1`, [id]);
}

/** Uso real de la URL: contador + última vez. Best-effort desde el resolver. */
export async function registerUse(id) {
  await query(
    `UPDATE access_urls SET use_count = use_count + 1, last_used_at = now() WHERE id = $1`,
    [id],
  );
}
