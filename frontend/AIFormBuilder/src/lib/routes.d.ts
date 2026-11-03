/**
 * Declaración de tipos para `src/lib/routes.js` — fuente única de verdad de las
 * rutas del panel.
 *
 * Describe la superficie pública (constantes + generadores + lectores de URL)
 * para que el código nuevo en TS reuse estos helpers en vez de componer rutas a
 * mano. La tabla `ROUTES` sigue viviendo en el `.js`: aquí solo se tipa.
 */

/** Idiomas soportados por el panel. El español no lleva prefijo de locale. */
export type PanelLanguage = "es" | "en";

/** Claves de página del panel (una por fila de `ROUTES`). */
export type RouteKey =
  | "home"
  | "forms"
  | "responses"
  | "analytics"
  | "insights"
  | "inbox"
  | "settings"
  | "templates"
  | "design"
  | "builder"
  | "usuarios"
  | "entidades"
  | "urls"
  | "auditoria"
  | "publicos";

/** Una fila de la tabla `ROUTES`: segmento por idioma, título i18n y armazón. */
export interface RouteRow {
  key: RouteKey;
  es: string;
  en: string;
  titleKey: string;
  enPantalla: boolean;
}

/** Resultado de trocear una URL del panel (sin el alias). */
export interface PanelRelative {
  language: PanelLanguage;
  entitySlug: string | null;
  path: string;
  search: string;
}

/** Página resuelta de una URL del panel. `key: null` = 404 del panel. */
export interface ResolvedPanelRoute {
  key: RouteKey | null;
  alias: PanelLanguage;
  language: PanelLanguage;
  entitySlug: string | null;
  params: Record<string, string>;
  search: string;
}

/** Ruta anterior al panel (`/dashboard`, `/forms`…) y su destino. */
export interface LegacyRoute {
  ruta: string;
  re: RegExp;
  key: RouteKey;
  ids?: string[];
}

export declare const BRAND: string;

/** Idiomas del panel, en orden de aparición en el selector. */
export declare const LANGUAGES: readonly PanelLanguage[];
export declare const DEFAULT_LANGUAGE: PanelLanguage;

/** Alias raíz del panel por idioma (movible por entorno). */
export declare const PANEL_BASE: Record<PanelLanguage, string>;
export declare function panelBaseForEntity(language: PanelLanguage, entitySlug?: string | null): string;

export declare const LOGIN_PATH: string;
export declare const CALLBACK_PATH: string;
export declare const SUPER_ADMIN_LOGIN_PATH: string;
export declare const LOGIN_PORTAL_SLUG: string;

export declare const ROUTES: readonly RouteRow[];
export declare const EN_EL_ARMazon: readonly RouteKey[];
export declare const A_PANTALLA_COMPLETA: readonly RouteKey[];

/** Página pública de un formulario: fuera del panel, estable e independiente del idioma. */
export declare function publicFormPath(slug: string): string;

export declare function panelBase(language: PanelLanguage): string;
export declare function panelPath(
  language: PanelLanguage,
  entitySlugOrSegments?: string,
  ...restSegments: string[]
): string;
export declare function buildPanelPath(
  key: RouteKey,
  language: PanelLanguage,
  params?: Record<string, string>,
  search?: string,
  entitySlug?: string | null,
): string;

export declare const homePath: (language: PanelLanguage, entitySlug?: string | null) => string;
export declare const formsPath: (language: PanelLanguage, entitySlug?: string | null) => string;
export declare const insightsPath: (language: PanelLanguage, entitySlug?: string | null) => string;
export declare const inboxPath: (language: PanelLanguage, entitySlug?: string | null) => string;
export declare const settingsPath: (language: PanelLanguage, entitySlug?: string | null) => string;
export declare const templatesPath: (language: PanelLanguage, entitySlug?: string | null) => string;
export declare const designPath: (language: PanelLanguage, entitySlug?: string | null) => string;
export declare const responsesPath: (language: PanelLanguage, id: string, entitySlug?: string | null) => string;
export declare const analyticsPath: (language: PanelLanguage, id: string, entitySlug?: string | null) => string;
export declare const builderPath: (
  language: PanelLanguage,
  id: string,
  options?: { ai?: boolean },
  entitySlug?: string | null,
) => string;

/** Constructor del SITIO, para quien no tiene cuenta real (invitado o sin sesión). */
export declare const SITE_BUILDER_BASE: string;
export declare function siteBuilderPath(id: string, options?: { ai?: boolean }): string;
export declare function isSiteBuilderPath(url: string): boolean;

export declare function pathOnly(url: string): string;
export declare function isPublicFormPath(url: string): boolean;
/** ¿Esta URL es la puerta de acceso por entidad/rol (`/a/<slug>`)? */
export declare function isAccessLoginPath(url: string): boolean;
/** `null` si la ruta no dice nada (es raíz o pública). */
export declare function languageFromPath(url: string): PanelLanguage | null;
/** `null` si la ruta no es del panel. */
export declare function panelRelativePath(url: string, language?: PanelLanguage): PanelRelative | null;
export declare function resolvePanelRoute(url: string): ResolvedPanelRoute | null;
/** Clave i18n del título de una URL del panel (o `null` si no es del panel). */
export declare function titleKeyForUrl(url: string): string | null;
/** Dirección correcta de la URL en un idioma, o `null` si ya lo está. */
export declare function canonicalPanelPath(url: string, language: PanelLanguage): string | null;

export declare const LEGACY: readonly LegacyRoute[];
export declare function legacyPanelPath(
  url: string,
  language?: PanelLanguage,
): { key: RouteKey; params: Record<string, string>; path: string; search: string } | null;
