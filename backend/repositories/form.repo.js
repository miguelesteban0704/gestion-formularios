import { query } from "../config/db.js";
import { nanoid } from "../utils/nanoid.js";

export function defaultSettings() {
  return {
    logo: "",
    primaryColor: "#0c8b7c",
    background: "#f8fafc",
    borderRadius: 12,
    thankYouMessage: "Thanks for your submission! 🎉",
    submitButtonText: "Submit",
    seoTitle: "",
    seoDescription: "",
    showProgressBar: true,
  };
}

export function mapForm(row) {
  if (!row) return null;
  return {
    _id: row.id,
    owner: row.owner,
    title: row.title,
    description: row.description,
    theme: row.theme,
    status: row.status,
    creationSource: row.creation_source || "blank",
    slug: row.slug,
    questions: row.questions || [],
    settings: row.settings || {},
    views: row.views,
    responseCount: row.response_count,
    isFavorite: row.is_favorite,
    isArchived: row.is_archived,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entityId: row.entity_id ?? null,
    entityName: row.entity_name ?? null,
    ownerName: row.owner_username || row.owner_name || null,
    updatedBy: row.updated_by ?? null,
    updatedByName: row.updated_by_username || row.updated_by_name || null,
    categoryId: row.category_id ?? null,
    visibility: row.visibility || "public",
  };
}

export async function createForm(owner, payload = {}) {
  const settings = { ...defaultSettings(), ...(payload.settings || {}) };
  const { rows } = await query(
    `INSERT INTO forms (owner, title, description, theme, status, slug, questions, settings, published_at, creation_source, entity_id, category_id, visibility)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [
      owner,
      payload.title || "Untitled form",
      payload.description || "",
      payload.theme || "modern",
      payload.status || "draft",
      nanoid(12),
      JSON.stringify(payload.questions || []),
      JSON.stringify(settings),
      payload.publishedAt || null,
      payload.creationSource || "blank",
      payload.entityId || null,
      payload.categoryId || null,
      payload.visibility === "private" || payload.visibility === "unlisted"
        ? payload.visibility
        : "public",
    ],
  );
  return mapForm(rows[0]);
}

export async function findFormById(id) {
  const { rows } = await query(`SELECT * FROM forms WHERE id = $1`, [id]);
  return mapForm(rows[0]);
}

export async function findPublishedBySlug(slug) {
  const { rows } = await query(
    `SELECT * FROM forms WHERE slug = $1 AND status IN ('published', 'visible', 'publico')`,
    [slug],
  );
  return mapForm(rows[0]);
}

export async function listFormsByOwner(
  owner,
  { search = "", filter = "all" } = {},
) {
  const where = ["owner = $1"];
  const params = [owner];

  if (filter === "archived") where.push("is_archived = true");
  else where.push("is_archived = false");

  if (filter === "favorites") where.push("is_favorite = true");
  if (filter === "published") where.push("status = 'published'");
  if (filter === "draft") where.push("status = 'draft'");

  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`title ILIKE $${params.length}`);
  }

  const { rows } = await query(
    `SELECT * FROM forms WHERE ${where.join(" AND ")}
    ORDER BY is_favorite DESC, updated_at DESC`,
    params,
  );
  return rows.map(mapForm);
}

/* `owner` es obligatorio a propósito: esta consulta llega desde un endpoint sin
   filtro de cuenta, y sin él devolvía los formularios publicados de todo el
   mundo. Que sea un parámetro y no un valor por defecto es lo que impide que
   vuelva a colarse un listado global por un descuido. */
export async function listPublicForms(owner, { search = "" } = {}) {
  const params = [owner];
  const where = [
    "owner = $1",
    "status IN ('published', 'visible', 'publico')",
    "is_archived = false",
  ];

  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`title ILIKE $${params.length}`);
  }

  const { rows } = await query(
    `SELECT * FROM forms WHERE ${where.join(" AND ")}
    ORDER BY published_at DESC NULLS LAST, updated_at DESC`,
    params,
  );
  return rows.map(mapForm);
}


export async function updateForm(id, updates) {
  const sets = [];
  const params = [id];
  const map = {
    title: "title",
    description: "description",
    theme: "theme",
    status: "status",
    isFavorite: "is_favorite",
    isArchived: "is_archived",
    entityId: "entity_id",
    categoryId: "category_id",
    visibility: "visibility",
    updatedBy: "updated_by",
  };
  const jsonMap = { questions: "questions", settings: "settings" };

  for (const [key, col] of Object.entries(map)) {
    if (key in updates) {
      params.push(updates[key]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  for (const [key, col] of Object.entries(jsonMap)) {
    if (key in updates) {
      params.push(JSON.stringify(updates[key]));
      sets.push(`${col} = $${params.length}::jsonb`);
    }
  }

  if (!sets.length) return findFormById(id);
  sets.push("updated_at = now()");

  const { rows } = await query(
    `UPDATE forms SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params,
  );
  return mapForm(rows[0]);
}

/**
 * Escribe (o borra) SOLO la clave `logo` del jsonb `settings`.
 *
 * Se usa `jsonb_set` y no `updateForm({ settings })` a propósito: el panel
 * manda el objeto `settings` entero, así que una escritura completa desde la
 * subida del logo podría pisar en silencio cambios de color, radio o textos que
 * el usuario todavía no había guardado. Aquí solo se toca una clave y el resto
 * del documento se conserva tal cual.
 */
export async function updateFormLogo(id, logoUrl, updatedBy = null) {
  const { rows } = await query(
    `UPDATE forms
        SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{logo}', $2::jsonb, true),
            updated_at = now(),
            updated_by = COALESCE($3::uuid, updated_by)
      WHERE id = $1
      RETURNING *`,
    [id, JSON.stringify(logoUrl ?? ""), updatedBy],
  );
  return mapForm(rows[0]);
}

export async function incrementViews(slug) {
  await query(
    `UPDATE forms SET views = views + 1 WHERE slug = $1 AND status IN ('published', 'visible', 'publico')`,
    [slug],
  );
}

export async function incrementResponseCount(id, delta = 1) {
  await query(
    `UPDATE forms SET response_count = GREATEST(response_count + $2, 0) WHERE id = $1`,
    [id, delta],
  );
}

export async function setCounters(id, { views, responseCount }) {
  await query(
    `UPDATE forms SET views = $2, response_count = $3 WHERE id = $1`,
    [id, views, responseCount],
  );
}

export async function deleteForm(id) {
  await query(`DELETE FROM forms WHERE id = $1`, [id]);
}

/**
 * Devuelve TODOS los formularios del usuario (activos + archivados).
 * Usado exclusivamente por insights para que las métricas globales
 * no omitan formularios archivados con respuestas históricas.
 */
export async function listAllFormsByOwner(owner) {
  const { rows } = await query(
    `SELECT * FROM forms WHERE owner = $1 ORDER BY updated_at DESC`,
    [owner],
  );
  return rows.map(mapForm);
}

// ── Visibilidad pública/privada + scope por rol/entidad ─────────────────────
// Sin `owner`: el invitado ve el escaparate completo (públicos y privados).
// Solo metadatos para listar; el detalle decide si entrega las preguntas.

const GUEST_SELECT = `SELECT f.*,
  e.name AS entity_name,
  u.username AS owner_username,
  u.name AS owner_name,
  ub.username AS updated_by_username,
  ub.name AS updated_by_name
FROM forms f
LEFT JOIN entities e ON e.id = f.entity_id
LEFT JOIN users u ON u.id = f.owner
LEFT JOIN users ub ON ub.id = f.updated_by`;

/* `listedOnly` distingue el escaparate (true: excluye los "privados" —unlisted—) de
   los consumidores internos como insights/analytics (false por defecto), que
   deben seguir contando los unlisted en sus métricas. */
export async function listPublishedForGuests({ search = "", entityId = "", visibility = "", listedOnly = false } = {}) {
  const where = [
    "f.status IN ('published', 'visible', 'publico')",
    "f.is_archived = false",
  ];
  const params = [];
  if (listedOnly) where.push("f.visibility <> 'unlisted'");
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(f.title ILIKE $${params.length} OR f.description ILIKE $${params.length})`);
  }
  if (entityId) { params.push(entityId); where.push(`f.entity_id = $${params.length}`); }
  if (visibility === "public" || visibility === "unlisted" || visibility === "private") {
    params.push(visibility);
    where.push(`f.visibility = $${params.length}`);
  }
  const { rows } = await query(
    `${GUEST_SELECT} WHERE ${where.join(" AND ")}
     ORDER BY f.updated_at DESC NULLS LAST, f.created_at DESC NULLS LAST`,
    params,
  );
  return rows.map(mapForm);
}

/**
 * Listado con scope: entity_admin ve toda su entidad, form_creator ve lo
 * propio, legacy (sin rol) conserva su comportamiento histórico (lo propio).
 * `super_admin` no lista aquí: su superficie es solo lectura de publicados
 * (listPublicFormsScoped, públicos y privados con `visibility` opcional).
 */
export async function listFormsScoped(actor, { search = "", filter = "all", visibility = "" } = {}) {
  const where = [];
  const params = [];
  if (actor.role === "entity_admin") {
    if (!actor.entityId) return [];
    params.push(actor.entityId);
    const entParam = params.length;
    // El gestor de entidad ve todos los publicados de su entidad, más los
    // publicados sin entidad (huérfanos), para que coincida con el escaparate
    // público.
    where.push(`(f.entity_id = $${entParam} OR f.entity_id IS NULL)`);
  } else if (actor.role === "form_creator") {
    // El gestor de formularios ve todos los publicados de su entidad, más los
    // publicados sin entidad (huérfanos), para que "Mis Formularios" quede
    // sincronizado con el escaparate público. Si no tiene entidad, ve todos
    // los publicados sin entidad.
    if (actor.entityId) {
      params.push(actor.entityId);
      const entParam = params.length;
      where.push(`(f.entity_id = $${entParam} OR f.entity_id IS NULL)`);
    } else {
      where.push(`f.entity_id IS NULL`);
    }
  } else {
    params.push(actor._id);
    where.push(`f.owner = $${params.length}`);
  }
  if (filter === "archived") where.push("f.is_archived = true");
  else where.push("f.is_archived = false");
  if (filter === "favorites") where.push("f.is_favorite = true");
  if (filter === "published") where.push("f.status = 'published'");
  if (filter === "draft") where.push("f.status = 'draft'");
  if (visibility === "public" || visibility === "unlisted" || visibility === "private") {
    params.push(visibility);
    where.push(`f.visibility = $${params.length}`);
  }
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`f.title ILIKE $${params.length}`);
  }
  const { rows } = await query(
    `${GUEST_SELECT} WHERE ${where.join(" AND ")}
     ORDER BY f.is_favorite DESC, f.updated_at DESC`,
    params,
  );
  return rows.map(mapForm);
}

/**
 * Super_admin: públicos y privados publicados. `visibility` opcional
 * ("public" | "private") restringe a un solo estado; vacío = ambos.
 * Con filtro por entidad y búsqueda.
 */
export async function listPublicFormsScoped({ search = "", entityId = "", visibility = "" } = {}) {
  const where = [
    "f.status IN ('published', 'visible', 'publico')",
    "f.is_archived = false",
  ];
  const params = [];
  if (visibility === "public" || visibility === "unlisted" || visibility === "private") {
    params.push(visibility);
    where.push(`f.visibility = $${params.length}`);
  }
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(f.title ILIKE $${params.length} OR f.description ILIKE $${params.length} OR e.name ILIKE $${params.length} OR u.username ILIKE $${params.length} OR f.id::text ILIKE $${params.length})`);
  }
  if (entityId) { params.push(entityId); where.push(`f.entity_id = $${params.length}`); }
  const { rows } = await query(
    `${GUEST_SELECT} WHERE ${where.join(" AND ")}
     ORDER BY f.created_at DESC NULLS LAST, f.updated_at DESC`,
    params,
  );
  return rows.map(mapForm);
}

/**
 * Formularios de una entidad (entity_admin: públicos + privados).
 * Filtros opcionales para el panel de entidad: búsqueda por título/slug,
 * estado, autor (owner), visibilidad y rango de fechas de creación.
 * El scope por entidad es SIEMPRE obligatorio (`entity_id = $1`).
 */
export async function listFormsByEntity(
  entityId,
  { includeArchived = false, search = "", status = "", ownerId = "", visibility = "", from = "", to = "" } = {},
) {
  const where = ["f.entity_id = $1"];
  const params = [entityId];
  if (!includeArchived) where.push("f.is_archived = false");
  if (status) { params.push(status); where.push(`f.status = $${params.length}`); }
  if (ownerId) { params.push(ownerId); where.push(`f.owner = $${params.length}`); }
  if (visibility === "public" || visibility === "unlisted" || visibility === "private") {
    params.push(visibility); where.push(`f.visibility = $${params.length}`);
  }
  if (from) { params.push(from); where.push(`f.created_at >= $${params.length}`); }
  if (to) { params.push(to); where.push(`f.created_at <= $${params.length}`); }
  if (String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    where.push(`(f.title ILIKE $${params.length} OR f.slug ILIKE $${params.length})`);
  }
  const { rows } = await query(
    `${GUEST_SELECT} WHERE ${where.join(" AND ")} ORDER BY f.updated_at DESC`,
    params,
  );
  return rows.map(mapForm);
}