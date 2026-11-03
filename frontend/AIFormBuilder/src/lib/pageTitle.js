/**
 * Título de la pestaña — fuente única de verdad.
 *
 * Regla del producto: el título es `CubaGob - <la página de destino>`.
 *
 * El panel es un servicio del sitio de CubaGob, así que la pestaña tiene que
 * decir a qué se entra y de quién es, no solo el nombre suelto de la página: si
 * hay veinte pestañas abiertas del panel, "Mis formularios" no dice nada.
 *
 * El idioma se encarga solo: la clave sale de la ruta (que ya lleva el idioma en
 * el alias y en los segmentos) y el diccionario activo responde en el que se está
 * viendo. Por eso aquí no hay dos tablas de rutas: la de `routes.js`.
 *
 * Durante el traspaso con el proveedor de identidad el destino también es una
 * página, así que el título nunca queda obsoleto ni contradictorio:
 *   - overlay de login  → la pantalla de acceso del IDP
 *   - overlay de logout → la portada del panel
 *   - /auth/callback    → el panel (a donde regresa el usuario)
 *
 * Las páginas públicas de formulario quedan fuera: su título es el del
 * formulario, porque es lo que se comparte y lo que se busca.
 */

import { BRAND, CALLBACK_PATH, LOGIN_PATH, SUPER_ADMIN_LOGIN_PATH, isAccessLoginPath, isPublicFormPath, isSiteBuilderPath, resolvePanelRoute, ROUTES } from "./routes.js";

const ROUTE_BY_KEY = new Map(ROUTES.map((route) => [route.key, route]));

/**
 * Calcula el título sin escribirlo (fácil de testear).
 * @param {{pathname: string, t: (k: string) => string, authPhase?: "login"|"logout"|"callback"|null}} args
 * @returns {string|null} null en las páginas públicas: su título ya lo puso quien las sirve
 */
export function resolveDocumentTitle({ pathname, t, authPhase = null }) {
  if (isPublicFormPath(pathname)) return null;

  const conMarca = (clave) => `${BRAND} - ${t(clave)}`;

  // Traspaso con el IDP: el destino es la pantalla de acceso o el panel.
  if (authPhase === "login") return conMarca("logIn");
  if (authPhase === "logout") return conMarca("panelHome");

  if (pathname === LOGIN_PATH) return conMarca("logIn");
  if (pathname.startsWith(CALLBACK_PATH)) return conMarca("panelHome");

  // Portal de acceso local (`/formularios-con-ia-loginadmin`, la URL fija del
  // super_admin): es el login de super, entidad y gestores, así que se rotula
  // como autenticación y no cae al 404.
  if (pathname === SUPER_ADMIN_LOGIN_PATH) return conMarca("authenticate");

  // Puerta de acceso por entidad/rol (`/a/<slug>`): su nombre es «Acceso».
  // Se prioriza este caso aunque authPhase sea nulo, porque isAccessLoginPath
  // revisa exclusivamente la estructura de la URL (/a/<slug>).
  if (isAccessLoginPath(pathname)) return conMarca("accessLogin");

  // El constructor del sitio (el del invitado) es el mismo editor que el del
  // panel, así que lleva su título aunque no cuelgue del alias.
  if (isSiteBuilderPath(pathname)) return conMarca("build");

  const encontrada = resolvePanelRoute(pathname);
  // Dentro del panel pero sin página detrás: el 404 de dentro, no el de la raíz.
  // Si la ruta tiene entidad (entitySlug), mostramos el título de la entidad en lugar de pageNotFound.
  if (encontrada && encontrada.entitySlug) {
    // Entidad scopeada: mostramos el título de la entidad (puede ser 'entities' o similar)
    const entityTitleKey = encontrada.key ? ROUTE_BY_KEY.get(encontrada.key).titleKey : null;
    if (entityTitleKey) return conMarca(entityTitleKey);
  }
  if (encontrada) return conMarca(encontrada.key ? ROUTE_BY_KEY.get(encontrada.key).titleKey : "pageNotFound");

  // La raíz es la portada pública del sitio: sin sesión solo enseña todos los
  // formularios publicados, así que su pestaña es «Formularios» y no el panel
  // (que es a donde se entra ya autenticado, vía logout/callback).
  if (pathname === "/") return conMarca("siteForms");

  return conMarca("pageNotFound");
}

/** Escribe el título de la pestaña. No-op si la ruta no es proprietaria. */
export function applyDocumentTitle(args) {
  if (typeof document === "undefined") return null;
  const title = resolveDocumentTitle(args);
  if (title) document.title = title;
  return title;
}
