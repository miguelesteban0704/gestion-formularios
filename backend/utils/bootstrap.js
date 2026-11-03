import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { CUBAN_ENTITIES } from "../db/seedEntities.js";
import { hashPassword } from "./password.js";
import crypto from "node:crypto";

/**
 * URL fija del portal oculto del super_admin: el nombre del sitio en
 * español ("Formularios con IA") + la marca `loginadmin`, unidos por `/`.
 * Sin aleatorio: la puerta no se enlaza desde ningún sitio, pero la dirección
 * es estable para quien la conoce. El formato con slash (`/`) debe ser
 * idéntico al que verifica `services/accessUrl.service.js`.
 */
export const LOGIN_PORTAL_SLUG = "formularios-con-ia-loginadmin";

/**
 * Genera un slug aleatorio para la puerta oculta del super_admin.
 * La URL cambia en cada cierre de sesión para evitar accesos no autorizados
 * mediante enlaces conocidos previamente.
 */
export function generateRandomLoginSlug() {
  return crypto.randomBytes(12).toString("hex");
}

/**
 * Bootstrap del rediseño de roles. Idempotente y silencioso por defecto:
 * solo actúa cuando hay algo que crear y solo con valores de entorno.
 *
 * - Catálogo de entidades cubanas (sección 10): inserta las que falten por
 *   `code`. Las Asambleas Municipales (168) se gestionan por CRUD.
 * - Único super_admin: solo si SUPER_ADMIN_EMAIL + SUPER_ADMIN_PASSWORD
 *   están definidos y aún no existe un super_admin. Nunca se crea desde
 *   el panel (el registro local no admite ese rol).
 */
export async function ensureCatalog() {
  const { rows } = await query(`SELECT COUNT(*)::int AS n FROM entities`);
  if (rows[0].n >= CUBAN_ENTITIES.length) return { seeded: false, count: rows[0].n };
  let inserted = 0;
  for (const e of CUBAN_ENTITIES) {
    const r = await query(
      `INSERT INTO entities (code, name, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO NOTHING`,
      [e.code, e.name, e.category],
    );
    inserted += r.rows?.length ? 1 : 0;
  }
  return { seeded: true, inserted };
}

export async function ensureSuperAdmin() {
  const existing = await query(`SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`);
  if (existing.rows.length) return { created: false, reason: "exists" };
  if (!env.superAdminEmail || !env.superAdminPassword) {
    return { created: false, reason: "no-env" };
  }
  const passwordHash = await hashPassword(env.superAdminPassword);
  await query(
    `INSERT INTO users (name, email, password_hash, role, avatar_color)
     VALUES ($1, $2, $3, 'super_admin', '#1e3a8a')
     ON CONFLICT (email) DO NOTHING`,
    [env.superAdminName, String(env.superAdminEmail).toLowerCase(), passwordHash],
  );
  return { created: true };
}

export async function runBootstrap() {
  try {
    const catalog = await ensureCatalog();
    if (catalog.seeded) console.log(`OK Entities catalog: ${catalog.inserted} nuevas`);
  } catch (e) {
    console.warn(" catalog bootstrap:", e.message);
  }
  try {
    const admin = await ensureSuperAdmin();
    if (admin.created) console.log("OK Super admin creado desde entorno");
  } catch (e) {
    console.warn(" super-admin bootstrap:", e.message);
  }
  try {
    const portal = await ensureLoginPortal();
    if (portal.created) console.log(`OK Portal oculto: /${portal.slug}`);
  } catch (e) {
    console.warn(" portal bootstrap:", e.message);
  }
}

/**
 * Puerta oculta del super_admin (`/formularios-con-ia-loginadmin`). La URL
 * es fija: no se enlaza desde el sitio y solo la conoce quien ya la tiene.
 * El arranque sincroniza `site_settings.local_login_slug` por si algo lo lee.
 */
export async function ensureLoginPortal() {
  const { rows } = await query(`SELECT value FROM site_settings WHERE key = 'local_login_slug'`);
  const current = rows[0]?.value ? String(rows[0].value).replace(/"/g, "") : null;
  if (current) return { created: false, slug: current };
  // Valor inicial fijo: "formularios-con-ia-loginadmin"
  await query(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ('local_login_slug', $1::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(LOGIN_PORTAL_SLUG)],
  );
  return { created: true, slug: LOGIN_PORTAL_SLUG };
}

/**
 * El endpoint de rotación del panel reafirma la URL fija en vez de
 * cambiarla: la dirección del portal no depende del azar.
 */
export async function regenerateLoginPortal() {
  // Portal FIJO: siempre el mismo, nunca cambia
  return LOGIN_PORTAL_SLUG;
}

/** La verificación lee la URL actual desde la base de datos. Siempre devuelve el portal fijo. */
export async function getLoginPortalSlug() {
  // Portal del super_admin FIJO: /formularios-con-ia-loginadmin
  return LOGIN_PORTAL_SLUG;
}
