-- =============================================================
--  Timely Forms AI — Esquema PostgreSQL (DDL canónico de referencia)
-- -------------------------------------------------------------
--  El backend ejecuta estas mismas sentencias de forma idempotente
--  desde config/db.js → migrate() (CREATE TABLE IF NOT EXISTS /
--  ALTER TABLE ... ADD COLUMN IF NOT EXISTS). Este archivo es la
--  versión "limpia" documentada del esquema real en producción.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Usuarios ────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  email                 text UNIQUE,                -- puede ser NULL con OIDC puro
  external_id           text UNIQUE,                -- subject del proveedor OIDC
  avatar_color          text NOT NULL DEFAULT '#0c8b7c',
  avatar_url            text,                       -- URL / avatares/<file>
  idp_profile           jsonb,                      -- claims completos del proveedor OIDC
  last_name             text NOT NULL DEFAULT '',
  bio                   text NOT NULL DEFAULT '',
  username              text UNIQUE,                -- @handle público
  is_active             boolean NOT NULL DEFAULT true,
  deleted_at            timestamptz,                -- soft-delete (desactivación)
  password_hash         text,                       -- contraseña local (bcrypt)
  password_set_at       timestamptz,
  role                  text,                       -- super_admin | entity_admin | form_creator | NULL (legacy)
  entity_id             uuid REFERENCES entities(id) ON DELETE SET NULL,
  access_url_id         uuid REFERENCES access_urls(id) ON DELETE SET NULL, -- enlace de entidad/rol que originó la cuenta
  failed_login_attempts integer NOT NULL DEFAULT 0, -- bloqueo temporal login local
  locked_until          timestamptz,                -- hasta cuándo está bloqueado
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ── Configuración del usuario (1:1) ─────────────────────────────────────────
CREATE TABLE user_settings (
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
  theme               text NOT NULL DEFAULT 'system',      -- system | light | dark
  accent_color        text NOT NULL DEFAULT '#15a18b',     -- hex #RRGGBB

  -- Notificaciones (matriz categoría × canal en jsonb)
  notification_prefs  jsonb NOT NULL DEFAULT '{
    "new_response":   {"email": true,  "push": true,  "in_app": true},
    "form_milestone": {"email": true,  "push": false, "in_app": true},
    "weekly_summary": {"email": true,  "push": false, "in_app": false},
    "security_alert": {"email": true,  "push": true,  "in_app": true},
    "product_updates":{"email": false, "push": false, "in_app": true}
  }'::jsonb,
  email_digest        text NOT NULL DEFAULT 'weekly',      -- immediate | daily | weekly | none

  -- 2FA / TOTP
  totp_enabled        boolean NOT NULL DEFAULT false,
  totp_secret         text,               -- secreto base32 (pendiente o activo)
  totp_verified_at    timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Sesiones multi-dispositivo ──────────────────────────────────────────────
CREATE TABLE user_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti          text UNIQUE NOT NULL,          -- id del token JWT
  device_info  jsonb NOT NULL DEFAULT '{}'::jsonb, -- { device, browser, os, location }
  ip           text,
  user_agent   text,
  is_active    boolean NOT NULL DEFAULT true,
  last_active  timestamptz NOT NULL DEFAULT now(), -- último request (display)
  last_user_activity timestamptz NOT NULL DEFAULT now(), -- última interacción (idle)
  absolute_expires_at timestamptz,             -- techo duro de la sesión
  last_reauth_at timestamptz,                  -- ventana de reautenticación
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Roles del sistema (catálogo fijo) ────────────────────────────────────────
CREATE TABLE roles (
  code        text PRIMARY KEY,
  name_es     text NOT NULL,
  name_en     text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  is_system   boolean NOT NULL DEFAULT true
);

INSERT INTO roles (code, name_es, name_en, description) VALUES
  ('super_admin', 'Super Administrador', 'Super Administrator', 'Gestión del sistema. No gestiona formularios.'),
  ('entity_admin', 'Gestor de Entidad', 'Entity Manager', 'Autoridad total sobre los formularios de su entidad.'),
  ('form_creator', 'Gestor de Formularios', 'Form Manager', 'Crea y edita formularios en el alcance de su entidad. Sin estadísticas.')
ON CONFLICT (code) DO UPDATE SET name_es = EXCLUDED.name_es, name_en = EXCLUDED.name_en;

-- ── Entidades (catálogo cubano: 81 + 168 municipales gestionables) ─────────────
CREATE TABLE entities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text UNIQUE NOT NULL,
  name       text NOT NULL,
  short_name text,
  category   text NOT NULL DEFAULT 'organos_estatales',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entities_category ON entities(category, is_active);

-- Un administrador de entidad como maximo por entidad.
CREATE UNIQUE INDEX IF NOT EXISTS users_entity_admin_entity_unique_idx
  ON users(entity_id)
  WHERE role = 'entity_admin' AND entity_id IS NOT NULL;

-- Correlación cuenta ↔ URL de acceso (una URL puede vincular varias cuentas).
CREATE INDEX IF NOT EXISTS idx_users_access_url ON users(access_url_id);

-- ── Categorías de formularios ────────────────────────────────────────────────
CREATE TABLE form_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text UNIQUE NOT NULL,
  name_es    text NOT NULL,
  name_en    text NOT NULL DEFAULT '',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO form_categories (code, name_es, name_en) VALUES
  ('general', 'General', 'General'),
  ('salud', 'Salud', 'Health'),
  ('educacion', 'Educación', 'Education'),
  ('economia', 'Economía', 'Economy'),
  ('empleo', 'Empleo', 'Employment'),
  ('medioambiente', 'Medio ambiente', 'Environment')
ON CONFLICT (code) DO NOTHING;

-- ── URLs de acceso por entidad y rol ─────────────────────────────────────────
CREATE TABLE access_urls (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     uuid REFERENCES entities(id) ON DELETE CASCADE,
  role          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  context       text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  use_count     integer NOT NULL DEFAULT 0,
  last_used_at  timestamptz,
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_urls_entity ON access_urls(entity_id, is_active);

-- ── Auditoría ────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ── Recuperación de contraseña (tokens de un solo uso) ───────────────────────
CREATE TABLE password_resets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Configuración global del sitio ───────────────────────────────────────────
CREATE TABLE site_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Formularios y respuestas ────────────────────────────────────────────────
CREATE TABLE forms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Untitled form',
  description     text NOT NULL DEFAULT '',
  theme           text NOT NULL DEFAULT 'modern',
  status          text NOT NULL DEFAULT 'draft',
  slug            text UNIQUE NOT NULL,
  questions       jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  views           integer NOT NULL DEFAULT 0,
  response_count  integer NOT NULL DEFAULT 0,
  is_favorite     boolean NOT NULL DEFAULT false,
  is_archived     boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  creation_source text NOT NULL DEFAULT 'blank',
  entity_id       uuid REFERENCES entities(id) ON DELETE SET NULL,
  category_id     uuid REFERENCES form_categories(id) ON DELETE SET NULL,
  visibility      text NOT NULL DEFAULT 'public',    -- public | unlisted | private
  updated_by      uuid REFERENCES users(id) ON DELETE SET NULL,  -- último autor de la edición
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form            uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  answers         jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_time integer NOT NULL DEFAULT 0,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  respondent_sub      text,                          -- sub del IDP (privados)
  respondent_name     text,                          -- nombre del encuestado
  respondent_email    text,                          -- correo del IDP del encuestado
  respondent_username text,                          -- usuario del IDP del encuestado
  is_anonymous        boolean NOT NULL DEFAULT true  -- false si respondió con IDP
);

CREATE TABLE notifications (
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

-- ── Alternativa normalizada para preferencias de notificación ───────────────
-- La app usa notification_prefs (jsonb) dentro de user_settings, pero si se
-- prefiere una tabla relacional por categoría, este es el modelo equivalente:
--
-- CREATE TABLE notification_preferences (
--   id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   category text NOT NULL,               -- new_response | form_milestone | ...
--   email    boolean NOT NULL DEFAULT true,
--   push     boolean NOT NULL DEFAULT true,
--   in_app   boolean NOT NULL DEFAULT true,
--   UNIQUE (user_id, category)
-- );

-- ── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_forms_owner            ON forms(owner, is_archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_entity           ON forms(entity_id, status);
CREATE INDEX IF NOT EXISTS idx_forms_visibility       ON forms(visibility, status);
CREATE INDEX IF NOT EXISTS idx_responses_form         ON responses(form, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user     ON user_sessions(user_id, is_active, last_active DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_jti      ON user_sessions(jti);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry   ON user_sessions(absolute_expires_at);

-- Trigger de updated_at (opcional; la app también lo mantiene manualmente)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forms_updated         BEFORE UPDATE ON forms         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_settings_updated BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();