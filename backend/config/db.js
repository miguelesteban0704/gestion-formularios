import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

if (!env.databaseUrl) {
  console.error(
    "x DATABASE_URL is not set. Add your PostgreSQL connection string to .env",
  );
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return { rows: result.rows };
}

async function migrate() {
  await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name         text NOT NULL,
      email        text UNIQUE,
      external_id  text UNIQUE,
      avatar_color text NOT NULL DEFAULT '#0c8b7c',
      avatar_url   text,
      created_at   timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Keep existing installations compatible with OIDC users.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id text;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS idp_profile jsonb;`);
  await query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`);
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS password;`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS users_external_id_unique ON users(external_id);`);

  await query(`
    CREATE TABLE IF NOT EXISTS forms (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title          text NOT NULL DEFAULT 'Untitled form',
      description    text NOT NULL DEFAULT '',
      theme          text NOT NULL DEFAULT 'modern',
      status         text NOT NULL DEFAULT 'draft',
      slug           text UNIQUE NOT NULL,
      questions      jsonb NOT NULL DEFAULT '[]'::jsonb,
      settings       jsonb NOT NULL DEFAULT '{}'::jsonb,
      views          integer NOT NULL DEFAULT 0,
      response_count integer NOT NULL DEFAULT 0,
      is_favorite    boolean NOT NULL DEFAULT false,
      is_archived    boolean NOT NULL DEFAULT false,
      published_at   timestamptz,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now(),
      creation_source text NOT NULL DEFAULT 'blank'
    );
  `);

  await query(`ALTER TABLE forms ADD COLUMN IF NOT EXISTS creation_source text NOT NULL DEFAULT 'blank';`);

  await query(`
    CREATE TABLE IF NOT EXISTS responses (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      form            uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      answers         jsonb NOT NULL DEFAULT '[]'::jsonb,
      completion_time integer NOT NULL DEFAULT 0,
      meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
      submitted_at    timestamptz NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      form_id     uuid UNIQUE REFERENCES forms(id) ON DELETE CASCADE,
      type        text NOT NULL,
      source      text NOT NULL,
      title       text NOT NULL,
      description text NOT NULL DEFAULT '',
      is_read     boolean NOT NULL DEFAULT false,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
  `);

  // ── user_settings ────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id             uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      -- Perfil extendido
      username            text UNIQUE,
      last_name           text NOT NULL DEFAULT '',
      bio                 text NOT NULL DEFAULT '',
      timezone            text NOT NULL DEFAULT 'UTC',
      language            text NOT NULL DEFAULT 'es',
      date_format         text NOT NULL DEFAULT 'DD/MM/YYYY',
      -- Apariencia
      theme               text NOT NULL DEFAULT 'system',
      accent_color        text NOT NULL DEFAULT '#15a18b',
      -- Notificaciones (jsonb para flexibilidad de categorías)
      notification_prefs  jsonb NOT NULL DEFAULT '{
        "new_response":   {"email": true,  "push": true,  "in_app": true},
        "form_milestone": {"email": true,  "push": false, "in_app": true},
        "weekly_summary": {"email": true,  "push": false, "in_app": false},
        "security_alert": {"email": true,  "push": true,  "in_app": true},
        "product_updates":{"email": false, "push": false, "in_app": true}
      }'::jsonb,
      email_digest        text NOT NULL DEFAULT 'weekly',
      -- 2FA / TOTP
      totp_enabled        boolean NOT NULL DEFAULT false,
      totp_secret         text,
      totp_verified_at    timestamptz,
      -- Timestamps
      created_at          timestamptz NOT NULL DEFAULT now(),
      updated_at          timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Columnas nuevas en users (perfil extendido)
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio      text NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username text UNIQUE;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;`);

  // Contraseña local (cambio de contraseña desde Ajustes)
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set_at timestamptz;`);

  // ── user_sessions: columnas extra ────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      jti         text UNIQUE NOT NULL,
      device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
      ip          text,
      user_agent  text,
      is_active   boolean NOT NULL DEFAULT true,
      last_active timestamptz NOT NULL DEFAULT now(),
      expires_at  timestamptz,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, is_active, last_active DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_jti  ON user_sessions(jti);`);

  // ── Política de sesiones: idle real y vida absoluta ───────────────────────
  // `last_active` marca el último request (para mostrar); `last_user_activity`
  // es la última INTERACCIÓN del usuario (heartbeat del frontend) y es lo que
  // mide la inactividad; `absolute_expires_at` es el techo duro de la sesión.
  // (`last_reauth_at` se conserva por compatibilidad de esquema; ya no se usa:
  // las acciones críticas no piden reautenticación.)
  await query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_user_activity timestamptz NOT NULL DEFAULT now();`);
  await query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS absolute_expires_at timestamptz;`);
  await query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_reauth_at timestamptz;`);
  // Rellena la vida absoluta de las sesiones anteriores a esta versión (una vez).
  await query(
    `UPDATE user_sessions SET absolute_expires_at = created_at + ($1 || ' minutes')::interval WHERE absolute_expires_at IS NULL`,
    [env.sessionAbsoluteMinutes],
  );
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(absolute_expires_at);`);

  // ── Índices principales ───────────────────────────────────────────────────
  await query(
    `CREATE INDEX IF NOT EXISTS idx_forms_owner ON forms(owner, is_archived, updated_at DESC);`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_responses_form ON responses(form, submitted_at DESC);`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);`,
  );

  // ── RBAC + entidades + URLs de acceso + auditoría ─────────────────────────
  // Tablas del rediseño de roles (super_admin / entity_admin / form_creator).
  // Todo IF NOT EXISTS / ON CONFLICT DO NOTHING: reejecutar es seguro.
  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      code        text PRIMARY KEY,
      name_es     text NOT NULL,
      name_en     text NOT NULL DEFAULT '',
      description text NOT NULL DEFAULT '',
      is_system   boolean NOT NULL DEFAULT true
    );
  `);
  await query(`
    INSERT INTO roles (code, name_es, name_en, description) VALUES
      ('super_admin', 'Super Administrador', 'Super Administrator', 'Gestión del sistema. No gestiona formularios.'),
      ('entity_admin', 'Gestor de Entidad', 'Entity Manager', 'Autoridad total sobre los formularios de su entidad.'),
      ('form_creator', 'Gestor de Formularios', 'Form Manager', 'Crea y edita formularios en el alcance de su entidad. Sin estadísticas.')
    ON CONFLICT (code) DO UPDATE SET name_es = EXCLUDED.name_es, name_en = EXCLUDED.name_en;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS entities (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code       text UNIQUE NOT NULL,
      name       text NOT NULL,
      category   text NOT NULL DEFAULT 'organos_estatales',
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_entities_category ON entities(category, is_active);`);
  // Nombre corto (siglas) de la entidad: opcional, añadido después de crear la tabla.
  await query(`ALTER TABLE entities ADD COLUMN IF NOT EXISTS short_name text;`);

  await query(`
    CREATE TABLE IF NOT EXISTS form_categories (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code       text UNIQUE NOT NULL,
      name_es    text NOT NULL,
      name_en    text NOT NULL DEFAULT '',
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await query(`
    INSERT INTO form_categories (code, name_es, name_en) VALUES
      ('general', 'General', 'General'),
      ('salud', 'Salud', 'Health'),
      ('educacion', 'Educación', 'Education'),
      ('economia', 'Economía', 'Economy'),
      ('empleo', 'Empleo', 'Employment'),
      ('medioambiente', 'Medio ambiente', 'Environment')
    ON CONFLICT (code) DO NOTHING;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS access_urls (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id   uuid REFERENCES entities(id) ON DELETE CASCADE,
      role        text NOT NULL,
      slug        text UNIQUE NOT NULL,
      context     text NOT NULL,
      is_active   boolean NOT NULL DEFAULT true,
      use_count   integer NOT NULL DEFAULT 0,
      last_used_at timestamptz,
      created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_access_urls_entity ON access_urls(entity_id, is_active);`);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
      actor_role  text,
      action      text NOT NULL,
      entity_type text,
      entity_id   text,
      ip          text,
      user_agent  text,
      details     jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);`);

  await query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash text UNIQUE NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at    timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key        text PRIMARY KEY,
      value      jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Columnas nuevas: usuarios con rol/entidad y control de bloqueo,
  // formularios con entidad/categoría/visibilidad, respuestas con encuestado.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES entities(id) ON DELETE SET NULL;`);
  // Correlación cuenta ↔ URL de acceso: qué enlace de qué entidad/rol dio de
  // alta la cuenta. ON DELETE SET NULL: borrar la URL no borra el usuario.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS access_url_id uuid REFERENCES access_urls(id) ON DELETE SET NULL;`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_access_url ON users(access_url_id);`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz;`);
  // Variante B del correo de bienvenida: contraseña temporal que debe cambiarse
  // en el primer inicio de sesión, con caducidad propia.
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password_expires_at timestamptz;`);
  await query(`ALTER TABLE forms ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES entities(id) ON DELETE SET NULL;`);
  await query(`ALTER TABLE forms ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES form_categories(id) ON DELETE SET NULL;`);
  await query(`ALTER TABLE forms ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';`);
  await query(`ALTER TABLE forms ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id) ON DELETE SET NULL;`);
  await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_sub text;`);
  await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_name text;`);
  await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_email text;`);
  await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_username text;`);
  await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT true;`);
  await query(`CREATE INDEX IF NOT EXISTS idx_forms_entity ON forms(entity_id, status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_forms_visibility ON forms(visibility, status);`);

  // ── Regla de administrador único ─────────────────────────────────────────
  // Antes se lanzaba un error si había entity_admin sin entity_id o con
  // entity_id duplicado. Eso paraba el arranque del server. Ahora la
  // migración repara automáticamente estos casos heredados de pruebas QA:
  //  - entity_admin sin entity_id → se le asigna la primera entidad
  //  - entity_admin duplicados → el más antiguo se conserva, el resto
  //    cambia a 'form_creator' (rol seguro, sin pérdida de acceso al builder)
  const { rows: adminPreflight } = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE role = 'entity_admin' AND entity_id IS NULL) AS unassigned_admins,
      (SELECT COUNT(*)::int FROM (
        SELECT entity_id FROM users
        WHERE role = 'entity_admin' AND entity_id IS NOT NULL
        GROUP BY entity_id HAVING COUNT(*) > 1
      ) duplicates) AS duplicate_entities
  `);
  const { unassigned_admins: unassignedAdmins, duplicate_entities: duplicateEntities } = adminPreflight[0];

  if (unassignedAdmins || duplicateEntities) {
    console.warn(`⚠ Reparando regla de administrador único: ${duplicateEntities} entidades duplicadas, ${unassignedAdmins} administradores sin entidad.`);

    // 1. Asignar entity_id a entity_admin que no lo tienen (usando la primera entidad disponible)
    const { rows: entities } = await query(`SELECT id FROM entities LIMIT 1`);
    if (entities.length && unassignedAdmins) {
      await query(
        `UPDATE users SET entity_id = $1 WHERE role = 'entity_admin' AND entity_id IS NULL`,
        [entities[0].id],
      );
    }

    // 2. Resolver duplicados: mantener al más antiguo como entity_admin, el resto a form_creator
    if (duplicateEntities) {
      const { rows: dupEntities } = await query(`
        SELECT entity_id FROM users
        WHERE role = 'entity_admin' AND entity_id IS NOT NULL
        GROUP BY entity_id HAVING COUNT(*) > 1
      `);
      for (const { entity_id } of dupEntities) {
        const { rows: dupUsers } = await query(`
          SELECT id FROM users
          WHERE role = 'entity_admin' AND entity_id = $1
          ORDER BY created_at ASC
        `, [entity_id]);
        // El primero (más antiguo) se conserva; el resto cambia a form_creator
        for (let i = 1; i < dupUsers.length; i++) {
          await query(`UPDATE users SET role = 'form_creator' WHERE id = $1`, [dupUsers[i].id]);
        }
      }
    }
  }
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_entity_admin_entity_unique_idx
    ON users(entity_id)
    WHERE role = 'entity_admin' AND entity_id IS NOT NULL
  `);
}

export async function connectDB() {
  try {
    const { rows } = await query("SELECT current_database() AS db");
    console.log(`OK Postgres connected: ${rows[0].db}`);
    await migrate();
    console.log("OK Schema ready");
  } catch (error) {
    console.error("x Postgres connection error:", error.message);
    process.exit(1);
  }
}
