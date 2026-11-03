import { query } from "../config/db.js";

function mapEntity(row) {
  if (!row) return null;
  return {
    _id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    category: row.category,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listEntities({ search = "", category = "", active = null } = {}) {
  const where = [];
  const params = [];
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(name ILIKE $${params.length} OR code ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  if (active !== null && active !== undefined && active !== "") {
    params.push(active === true || active === "true");
    where.push(`is_active = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT * FROM entities${where.length ? ` WHERE ${where.join(" AND ")}` : ""}
     ORDER BY category, name`,
    params,
  );
  return rows.map(mapEntity);
}

export async function findEntityById(id) {
  const { rows } = await query(`SELECT * FROM entities WHERE id = $1`, [id]);
  return mapEntity(rows[0]);
}

export async function findEntityByCode(code) {
  const { rows } = await query(`SELECT * FROM entities WHERE code = $1`, [code]);
  return mapEntity(rows[0]);
}

export async function createEntity({ code, name, shortName, category }) {
  const { rows } = await query(
    `INSERT INTO entities (code, name, short_name, category) VALUES ($1, $2, $3, $4) RETURNING *`,
    [code, name, shortName || null, category || "organos_estatales"],
  );
  return mapEntity(rows[0]);
}

export async function updateEntity(id, { name, shortName, category, isActive }) {
  const sets = [];
  const params = [id];
  if (name !== undefined) { params.push(name); sets.push(`name = $${params.length}`); }
  // Cadena vacía = quitar las siglas (la columna admite NULL).
  if (shortName !== undefined) { params.push(shortName || null); sets.push(`short_name = $${params.length}`); }
  if (category !== undefined) { params.push(category); sets.push(`category = $${params.length}`); }
  if (isActive !== undefined) { params.push(!!isActive); sets.push(`is_active = $${params.length}`); }
  if (!sets.length) return findEntityById(id);
  sets.push("updated_at = now()");
  const { rows } = await query(
    `UPDATE entities SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params,
  );
  return mapEntity(rows[0]);
}

export async function deleteEntity(id) {
  await query(`DELETE FROM entities WHERE id = $1`, [id]);
}

/** Conteo de formularios publicados por entidad (panel del super_admin).
 *  Cuenta públicos y privados (unlisted); solo excluye los restringidos, igual que
 *  el agregado del panel (publicAggregate). */
export async function countPublishedByEntity() {
  const { rows } = await query(
    `SELECT entity_id AS entity, COUNT(*)::int AS count
     FROM forms
     WHERE status IN ('published', 'visible', 'publico')
       AND is_archived = false
       AND visibility <> 'private'
       AND entity_id IS NOT NULL
     GROUP BY entity_id`,
  );
  return rows;
}
