/** Roles del rediseño RBAC. `null` = cuenta legacy (acceso histórico). */
import { buildPanelPath, homePath } from "./routes.js";

export const ROLES = {
  SUPER: "super_admin",
  ENTITY: "entity_admin",
  CREATOR: "form_creator",
};

export const ROLE_LABEL = {
  super_admin: "Super Administrador",
  entity_admin: "Gestor de Entidad",
  form_creator: "Gestor de Formularios",
};

export const isSuper = (user) => user?.role === ROLES.SUPER;
export const isEntityAdmin = (user) => user?.role === ROLES.ENTITY;
export const isCreator = (user) => user?.role === ROLES.CREATOR;
export const isLegacy = (user) => !!user && !user.role;
/** Invitado con sesión anónima: dueño propio, stats solo de lo público. */
export const isGuest = (user) => user?.isGuest === true;

/** El creador no ve estadísticas (respuestas, analíticas, insights, inbox). */
export const STATS_PAGES = ["responses", "analytics", "insights", "inbox"];
export function canSeeStatsPage(user, key) {
  if (!STATS_PAGES.includes(key)) return true;
  if (isLegacy(user) && !isGuest(user)) return true;
  if (isGuest(user)) return false;
  if (isCreator(user)) return false;
  /* El super_admin NO es dueño de nada, pero su superficie —el panel de
     públicos— abarca el agregado general, la analítica de UN formulario
     público y la bandeja GENERAL de públicos de todas las entidades. Siguen
     vetadas las respuestas en bruto de un formulario concreto. */
  if (user?.role === ROLES.SUPER)
    return key === "insights" || key === "analytics" || key === "inbox";
  return true;
}

/**
 * Páginas de gestión del sistema. Son del super_admin salvo `usuarios`, que el
 * entity_admin también gestiona —pero SIEMPRE acotado a su entidad por la URL
 * `/panel-gestion/<entitySlug>/...` y por el backend (`req.user.entityId`)—.
 */
export const ADMIN_PAGES = ["usuarios", "entidades", "urls", "auditoria", "publicos"];
export function canSeeAdminPage(user, key) {
  if (!ADMIN_PAGES.includes(key)) return true;
  if (isSuper(user)) return true;
  if (isEntityAdmin(user) && key === "usuarios") return true;
  return false;
}

/**
 * Superficie del entity_admin dentro de su panel de entidad: formularios de la
 * entidad, sus usuarios, la página de estadísticas globales (`insights`), la
 * analítica de un formulario (`analytics`) y la bandeja general de su entidad
 * (`inbox`). Sin página de configuración (petición del usuario). La puerta
 * solo aplica a ese rol; el form_creator conserva su panel normal.
 */
export const ENTITY_PAGES = ["home", "forms", "usuarios", "insights", "analytics", "inbox", "profile", "security", "notifications", "help", "shortcuts", "trash"];
export function canSeeEntityAdminPage(user, key) {
  if (!isEntityAdmin(user)) return true;
  return ENTITY_PAGES.includes(key);
}

/**
 * Portada a la que vuelve alguien SIN CUENTA REAL (sin sesión o invitado):
 * el SITIO (`/`), nunca `/panel-gestion`.
 *
 * Un invitado está autenticado con su sesión anónima, así que decidir por
 * `isAuthenticated` lo mandaba al panel: por eso la pregunta es por el rol.
 */
export function siteHomePath(user, language) {
  return !user || isGuest(user) ? "/" : homePath(language);
}

/** Destino post-login según rol: el super cae en su panel de públicos. */
export function homePathForRole(user, language, entitySlug) {
  /* El invitado no tiene panel: su casa es la portada del sitio. */
  if (isGuest(user)) return "/";
  if (isSuper(user)) return buildPanelPath("publicos", language, {}, "");
  /* El entity_admin aterriza en los formularios de su entidad, no en el
     dashboard genérico (que no le aporta nada). */
  if (isEntityAdmin(user)) {
    return buildPanelPath("forms", language, {}, "", entitySlug || user?.entity?.code);
  }
  /* Los usuarios de entidad (entity_admin y form_creator) viven atados a SU
     entidad: si no llega slug (post-login, cerrar sesión y relevo), se deriva
     del propio usuario para no aterrizar en una ruta global que el guard de
     `RoleRoute` rebotaría a home. */
  return homePath(language, entitySlug || user?.entity?.code);
}
