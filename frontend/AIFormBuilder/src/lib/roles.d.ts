/**
 * Declaración de tipos para `src/lib/roles.js` (RBAC del rediseño).
 *
 * Describe la superficie que ya existe para que el código nuevo en TS no
 * reimplemente las comprobaciones de rol. La forma del usuario es laxa a
 * propósito: los objetos reales vienen del backend y no están modelados en TS.
 */

/** Roles del rediseño RBAC. */
export type RoleName = "super_admin" | "entity_admin" | "form_creator";

/**
 * Usuario tal como lo consumen las comprobaciones de rol. `role` puede faltar
 * (`null`/`undefined` = cuenta legacy con acceso histórico) e `isGuest` marca
 * la sesión anónima.
 */
export interface SiteUser {
  role?: RoleName | null;
  isGuest?: boolean;
  [key: string]: unknown;
}

export declare const ROLES: {
  SUPER: "super_admin";
  ENTITY: "entity_admin";
  CREATOR: "form_creator";
};

/** Etiqueta legible por rol, en español. */
export declare const ROLE_LABEL: Record<string, string>;

export declare function isSuper(user?: SiteUser | null): boolean;
export declare function isEntityAdmin(user?: SiteUser | null): boolean;
export declare function isCreator(user?: SiteUser | null): boolean;
/** Cuenta legacy: existe y NO tiene `role`. */
export declare function isLegacy(user?: SiteUser | null): boolean;
/** Invitado con sesión anónima: dueño propio, stats solo de lo público. */
export declare function isGuest(user?: SiteUser | null): boolean;

/** Páginas de estadísticas: el creador no las ve. */
export declare const STATS_PAGES: readonly string[];
export declare function canSeeStatsPage(user: SiteUser | null | undefined, key: string): boolean;

/** Páginas de gestión del sistema: `super_admin` (y `entity_admin` para usuarios). */
export declare const ADMIN_PAGES: readonly string[];
export declare function canSeeAdminPage(user: SiteUser | null | undefined, key: string): boolean;

/** Superficie del `entity_admin` dentro de su panel de entidad. */
export declare const ENTITY_PAGES: readonly string[];
export declare function canSeeEntityAdminPage(user: SiteUser | null | undefined, key: string): boolean;

/** Portada del SITIO para quien no tiene cuenta real (sin sesión o invitado). */
export declare function siteHomePath(user: SiteUser | null | undefined, language: string): string;

/** Destino post-login según rol: el super cae en su panel de públicos. */
export declare function homePathForRole(
  user: SiteUser | null | undefined,
  language: string,
  entitySlug?: string,
): string;
