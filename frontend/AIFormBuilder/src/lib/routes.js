/**
 * Rutas del panel — fuente única de verdad.
 *
 * El panel es un servicio del sitio de CubaGob: vive bajo un alias propio
 * (`/panel-gestion`) en vez de en la raíz, y ese alias cambia con el idioma
 * elegido en los botones.
 *
 * El español no lleva prefijo de locale (es el idioma del sitio) y el inglés
 * sí, para que cada idioma tenga una URL canónica y no puedan colisionar.
 *
 * Se traduce TODO lo que se puede traducir, alias incluido:
 *
 *   es  /panel-gestion/configuracion              en  /en/panel-management/settings
 *   es  /panel-gestion/formularios                en  /en/panel-management/forms
 *   es  /panel-gestion/estadisticas               en  /en/panel-management/insights
 *   es  /panel-gestion/constructor/<id>           en  /en/panel-management/builder/<id>
 *   es  /panel-gestion/formularios/<id>/respuestas en /en/panel-management/forms/<id>/responses
 *
 * La tabla de más abajo es la única que sabe eso, y las dos direcciones salen
 * de ella: `formsPath("es")` la compone y `resolvePanelRoute()` la vuelve a
 * leer. No hay dos listas que puedan contradecirse.
 *
 * Reglas que sostienen el diseño:
 *
 *  - El idioma va en la URL porque es la única forma de que un enlace al panel
 *    lleve dentro: se puede mandar `/panel-gestion/formularios` por correo y
 *    lleva a los formularios, no a la portada. La dirección sigue al idioma
 *    elegido (ver `canonicalPanelPath`), nunca al revés: la URL es un espejo,
 *    no una fuente de decisiones.
 *
 *  - Los segmentos en español van SIN tilde ni ñ (`configuracion`,
 *    `estadisticas`, `diseno`): una URL es un identificador, no un texto. Se
 *    escriben como los escribe la gente en un teclado, no como en un diccionario.
 *
 *  - Las páginas públicas de formularios NO cuelgan del panel (`/f/<slug>`).
 *    Esos enlaces se comparten por correo, WhatsApp o papel: viven en la raíz
 *    y no cambian con el idioma, porque quien responde puede no tener sesión
 *    ni hablar el idioma de quien diseñó el formulario.
 *
 *  - `/login` y `/auth/callback` tampoco cuelgan del panel: son la puerta que
 *    usa el proveedor de identidad, que las llama por su cuenta con una URL
 *    registrada en el backend (`OIDC_LOGIN_REDIRECT_URI`). Moverlas rompería
 *    el inicio de sesión; dejarlas en la raíz lo mantiene funcionando.
 */

export const BRAND = "CubaGob";

/** Idiomas del panel, en el orden en que aparecen en el selector. */
export const LANGUAGES = ["es", "en"];
export const DEFAULT_LANGUAGE = "en";

/* `import.meta.env` no existe fuera de Vite (las sondas de QA importan este
   fichero con node), así que se lee con guarda y no con destructuring. */
const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};

/** Normaliza un alias de entorno: sin barra final, siempre con barra inicial. */
function alias(value, fallback) {
  const raw = typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
  if (!raw || raw === "/") return fallback;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Alias raíz del panel por idioma. Se pueden mover por entorno
 * (VITE_PANEL_BASE_ES / VITE_PANEL_BASE_EN) si el despliegue final vive bajo
 * otra ruta; el código no necesita cambios.
 */
export const PANEL_BASE = {
  es: alias(ENV.VITE_PANEL_BASE_ES, "/panel-gestion"),
  en: alias(ENV.VITE_PANEL_BASE_EN, "/en/panel-management"),
};

/**
 * Construye la base del panel para una entidad concreta.
 * Si no se pasa entitySlug, devuelve la base global (super_admin, legacy).
 * Si se pasa, devuelve `/panel-gestion/:entitySlug` (o equivalente en inglés).
 */
export function panelBaseForEntity(language, entitySlug) {
  const base = PANEL_BASE[language] || PANEL_BASE[DEFAULT_LANGUAGE];
  if (!entitySlug) return base;
  return `${base}/${encodeURIComponent(entitySlug)}`;
}

/** Puertas del proveedor de identidad: fuera del panel, por diseño. */
export const LOGIN_PATH = "/login";
export const CALLBACK_PATH = "/auth/callback";

/**
 * Puerta del super_admin: URL fija, fuera del panel y sin enlace visible.
 *
 * Vive AQUÍ y no en `LocalLogin` porque quien tiene que volver a ella al
 * cerrar la sesión es `AuthContext`, y meter la página de login en el
 * contexto crearía un ciclo (la página cuelga de `useAuth`, que cuelga del
 * contexto). El espejo del backend es `LOGIN_PORTAL_SLUG` en
 * `utils/bootstrap.js`: el slug lo valida el servidor, no el navegador.
 */
export const SUPER_ADMIN_LOGIN_PATH = "/formularios-con-ia-loginadmin";
/** El mismo slug sin barra inicial, para componerlo o validarlo. */
export const LOGIN_PORTAL_SLUG = SUPER_ADMIN_LOGIN_PATH.slice(1);

/**
 * Página de activación de cuenta: `/activar?token=…`.
 *
 * Ruta ESTABLE a propósito. El enlace del correo de alta apunta aquí y no al
 * slug de la puerta, porque el slug es el secreto de `/a/<slug>` y «Regenerar»
 * existe para invalidar un enlace filtrado: si el correo lo llevara, rotar una
 * puerta mataría los correos de activación ya enviados. La activación la
 * protege el token (un solo uso, con caducidad).
 *
 * Tras fijar la contraseña el backend devuelve la puerta vigente del usuario y
 * esta página lo lleva allí a iniciar sesión, así que un correo antiguo también
 * acaba en la puerta correcta. El espejo del backend es `ACTIVATION_PATH` en
 * `services/welcome.service.js`.
 */
export const ACTIVATION_PATH = "/activar";

/**
 * Puertas de acceso por entidad/rol: `/a/<slug>`.
 *
 * El slug lo genera el super_admin y lo valida el backend (sello cifrado); aquí
 * solo se compone la dirección. Vive junto a las demás puertas para que quien
 * recuerda a dónde volver al cerrar sesión (`lib/accessDoor.js`) lea de una
 * única fuente.
 */
export const ACCESS_LOGIN_BASE = "/a";
export function accessLoginPath(slug) {
  return `${ACCESS_LOGIN_BASE}/${encodeURIComponent(slug)}`;
}

/** ¿Esta URL es la puerta de acceso por entidad/rol (`/a/<slug>`)? */
export function isAccessLoginPath(url) {
  return new RegExp(`^${ACCESS_LOGIN_BASE}/[^/]+$`).test(splitUrl(url).pathname);
}

/* Las páginas del panel, en los dos idiomas.
 *
 * `es`/`en` son el segmento DENTRO del alias, sin la barra inicial. `titleKey`
 * es la clave i18n del título de la pestaña, que tampoco depende del idioma de
 * la URL: la resuelve el diccionario activo.
 *
 * `enPantalla` dice si la página se dibuja DENTRO del armazón del panel (con
 * cabecera, lateral y selector de idioma) o a pantalla completa. Solo el
 * constructor va a pantalla completa, porque se edita a dos manos y la cabecera
 * no le aporta nada. Va declarado en TODAS las filas a propósito: omitirlo no da
 * error, solo deja la página sin armazón, sin que nada se queje. Hay una
 * comprobación en qa/routes.js que lo vigila.
 *
 * El orden importa para las rutas con parametro: `formularios/:id/respuestas`
 * se prueba antes que `formularios`, que si no se la comería el prefijo. */
export const ROUTES = [
  { key: "home", es: "", en: "", titleKey: "panelHome", enPantalla: true },
  { key: "forms", es: "formularios", en: "forms", titleKey: "myForms", enPantalla: true },
  { key: "trash", es: "papelera", en: "trash", titleKey: "trashBin", enPantalla: true },
  { key: "responses", es: "formularios/:id/respuestas", en: "forms/:id/responses", titleKey: "responses", enPantalla: true },
  { key: "analytics", es: "formularios/:id/estadisticas", en: "forms/:id/analytics", titleKey: "insights", enPantalla: true },
  { key: "insights", es: "estadisticas", en: "insights", titleKey: "insights", enPantalla: true },
  { key: "inbox", es: "bandeja-de-entrada", en: "inbox", titleKey: "inbox", enPantalla: true },
  { key: "settings", es: "configuracion", en: "settings", titleKey: "settings", enPantalla: true },
  /* Páginas personales del usuario (cuenta, avisos) y de ayuda: cuelgan del
     armazón del panel y su segmento es de un solo término, como
     `configuracion`. Se abren desde el menú de identidad. */
  { key: "profile", es: "perfil", en: "profile", titleKey: "myProfile", enPantalla: true },
  { key: "security", es: "seguridad", en: "security", titleKey: "security", enPantalla: true },
  { key: "notifications", es: "notificaciones", en: "notifications", titleKey: "notifications", enPantalla: true },
  { key: "help", es: "ayuda", en: "help", titleKey: "helpCenter", enPantalla: true },
  { key: "shortcuts", es: "atajos-de-teclado", en: "keyboard-shortcuts", titleKey: "keyboardShortcuts", enPantalla: true },
  { key: "templates", es: "plantillas", en: "templates", titleKey: "templates", enPantalla: true },
  { key: "design", es: "diseno", en: "design", titleKey: "designSystem", enPantalla: true },
  { key: "builder", es: "constructor/:id", en: "builder/:id", titleKey: "build", enPantalla: false },
  /* Administración del sistema (super_admin): viven en el armazón del panel. */
  { key: "usuarios", es: "usuarios", en: "users", titleKey: "users", enPantalla: true },
  { key: "entidades", es: "entidades", en: "entities", titleKey: "entities", enPantalla: true },
  { key: "urls", es: "urls-de-acceso", en: "access-urls", titleKey: "accessUrls", enPantalla: true },
  { key: "auditoria", es: "auditoria", en: "audit", titleKey: "audit", enPantalla: true },
  { key: "publicos", es: "formularios-publicos", en: "public-forms", titleKey: "publishedForms", enPantalla: true },
];

/** Las páginas que van dentro del armazón del panel, por clave. */
export const EN_EL_ARMazon = ROUTES.filter((route) => route.enPantalla).map((route) => route.key);
/** …y las que van a pantalla completa, sin armazón. Hoy, solo el constructor. */
export const A_PANTALLA_COMPLETA = ROUTES.filter((route) => !route.enPantalla).map((route) => route.key);

const ROUTE_BY_KEY = new Map(ROUTES.map((route) => [route.key, route]));

/* Compiladores de cada patrón, uno por idioma y clave, para poder LEER una URL.
   Se hacen una vez: leer la URL ocurre en cada cambio de idioma y en cada
   navegación, y un `new RegExp` por evento no cuesta, pero tampoco hace falta. */
const MATCHERS = new Map();
function matcherFor(key, language) {
  const cacheKey = `${key}:${language}`;
  if (MATCHERS.has(cacheKey)) return MATCHERS.get(cacheKey);
  const pattern = ROUTE_BY_KEY.get(key)?.[language] ?? "";
  const ids = [];
  const source = `^${pattern.replace(/:(\w+)/g, (_, name) => {
    ids.push(name);
    return "([^/]+)";
  })}$`;
  const compiled = { re: new RegExp(source), ids };
  MATCHERS.set(cacheKey, compiled);
  return compiled;
}

/**
 * ¿`path` (ya sin el alias del panel) coincide con alguna página del panel, en
 * cualquier idioma? Es lo que distingue una ruta global de una scopeada a
 * entidad y decide si el primer segmento es un slug. Se ignora la portada
 * (`home`, cuyo patrón es vacío): un resto vacío no convierte a nadie en entidad.
 */
function matchesAnyRoute(path) {
  if (!path) return false;
  return ROUTES.some((route) => route.key !== "home" &&
    LANGUAGES.some((lang) => matcherFor(route.key, lang).re.test(path)));
}

/** Página pública de un formulario: fuera del panel, estable e independiente del idioma. */
export function publicFormPath(slug) {
  return `/f/${slug}`;
}

export function panelBase(language) {
  return PANEL_BASE[language] || PANEL_BASE[DEFAULT_LANGUAGE];
}

/**
 * `/panel-gestion` + los segmentos que le pases.
 * Si se pasa entitySlug como primer segmento, usa la base con entidad.
 */
export function panelPath(language, entitySlugOrSegments, ...restSegments) {
  const isEntitySlug = typeof entitySlugOrSegments === "string" && restSegments.length >= 0;
  const entitySlug = isEntitySlug ? entitySlugOrSegments : null;
  const segments = isEntitySlug ? restSegments : [entitySlugOrSegments, ...restSegments];
  const base = entitySlug ? panelBaseForEntity(language, entitySlug) : panelBase(language);
  return [base, ...segments.filter(Boolean).map(String)].join("/");
}

/* Constructores de cada página. Todos reciben el idioma, así que ningún
   enlace interno depende de que su autor recuerde en qué idioma está la app. */
export function buildPanelPath(key, language, params = {}, search = "", entitySlug) {
  const route = ROUTE_BY_KEY.get(key);
  // `home` tiene el segmento vacío, así que hay que preguntar si EXISTE el
  // idioma y no si el segmento es cierto: con `home` + español, un `||` sacaría
  // la portada del idioma del usuario.
  const lang = route && route[language] !== undefined ? language : DEFAULT_LANGUAGE;
  const path = (route?.[lang] ?? "").replace(/:(\w+)/g, (_, name) =>
    encodeURIComponent(params[name] ?? "")
  );
  return `${panelPath(lang, entitySlug, path)}${search}`;
}

export const homePath = (language, entitySlug) => panelBaseForEntity(language, entitySlug);
export const formsPath = (language, entitySlug) => buildPanelPath("forms", language, {}, "", entitySlug);
export const insightsPath = (language, entitySlug) => buildPanelPath("insights", language, {}, "", entitySlug);
export const inboxPath = (language, entitySlug) => buildPanelPath("inbox", language, {}, "", entitySlug);
export const settingsPath = (language, entitySlug) => buildPanelPath("settings", language, {}, "", entitySlug);
export const profilePath = (language, entitySlug) => buildPanelPath("profile", language, {}, "", entitySlug);
export const securityPath = (language, entitySlug) => buildPanelPath("security", language, {}, "", entitySlug);
export const notificationsPath = (language, entitySlug) => buildPanelPath("notifications", language, {}, "", entitySlug);
export const helpPath = (language, entitySlug) => buildPanelPath("help", language, {}, "", entitySlug);
export const shortcutsPath = (language, entitySlug) => buildPanelPath("shortcuts", language, {}, "", entitySlug);
export const templatesPath = (language, entitySlug) => buildPanelPath("templates", language, {}, "", entitySlug);
export const designPath = (language, entitySlug) => buildPanelPath("design", language, {}, "", entitySlug);
export const responsesPath = (language, id, entitySlug) => buildPanelPath("responses", language, { id }, "", entitySlug);
export const analyticsPath = (language, id, entitySlug) => buildPanelPath("analytics", language, { id }, "", entitySlug);
export const builderPath = (language, id, { ai = false } = {}, entitySlug) =>
  `${buildPanelPath("builder", language, { id }, "", entitySlug)}${ai ? "?ai=1" : ""}`;

/* El constructor en el SITIO, para quien no tiene cuenta real (invitado o sin
 * sesión): cuelga de la raíz igual que las páginas públicas (`/f/<slug>`), NO
 * del alias del panel. Un invitado está autenticado con su sesión anónima, así
 * que `isAuthenticated` no basta para decidir a qué URL llevarle: para él,
 * NINGÚN enlace debe apuntar a `/panel-gestion`.
 *
 * No lleva idioma, como el resto de rutas del sitio: el editor se comparte
 * entre quien lo abre por la portada y quien lo abre por un enlace. */
export const SITE_BUILDER_BASE = "/constructor";

export function siteBuilderPath(id, { ai = false } = {}) {
  return `${SITE_BUILDER_BASE}/${encodeURIComponent(id)}${ai ? "?ai=1" : ""}`;
}

/** ¿Esta URL es el constructor del sitio (la del invitado)? */
export function isSiteBuilderPath(url) {
  return new RegExp(`^${SITE_BUILDER_BASE}/[^/]+$`).test(splitUrl(url).pathname);
}

/**
 * `decodeURIComponent` que no lanza. Un `%` suelto en la URL (un id mal
 * escrito, un enlace antiguo) no puede tirar la app al montar una página; si no
 * se puede descifrar se devuelve tal cual, que es justo lo que había.
 */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Partes de una URL ya separada: el `?ai=1` no debe viajar en el `pathname`. */function splitUrl(url) {
  const raw = typeof url === "string" && url ? url : "/";
  const hashAt = raw.indexOf("#");
  const hash = hashAt === -1 ? "" : raw.slice(hashAt);
  const withoutHash = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const queryAt = withoutHash.indexOf("?");
  return {
    pathname: (queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt)) || "/",
    search: queryAt === -1 ? "" : withoutHash.slice(queryAt),
    hash,
  };
}

export function pathOnly(url) {
  return splitUrl(url).pathname;
}

/** ¿Esta ruta es la página pública de un formulario? */
export function isPublicFormPath(url) {
  return /^\/f\/[^/]+$/.test(splitUrl(url).pathname);
}

/** ¿El idioma de esta ruta es tal? `null` si la ruta no dice nada (es raíz o pública). */
export function languageFromPath(url) {
  return panelRelativePath(url)?.language ?? null;
}

/**
 * Qué parte de la ruta cuelga del alias del panel, ya sin el alias:
 * `/panel-gestion/formularios/42/respuestas` → `formularios/42/respuestas`.
 * `/panel-gestion/:entitySlug/formularios/42/respuestas` → `formularios/42/respuestas` (con entitySlug extraído).
 * Devuelve `null` si la ruta no es del panel.
 */
export function panelRelativePath(url, language) {
  const { pathname, search } = splitUrl(url);
  for (const lang of language ? [language] : LANGUAGES) {
    const base = panelBase(lang);
    if (pathname !== base && !pathname.startsWith(`${base}/`)) continue;
    const afterBase = pathname.slice(base.length).replace(/^\/+/, "").replace(/\/+$/, "");
    /* El slug de entidad solo existe cuando el PRIMER segmento es realmente un
       slug y lo que queda detrás es una página conocida:
         /panel-gestion/acme/configuracion  → entitySlug "acme", path "configuracion"
         /panel-gestion/configuracion       → global,          path "configuracion"
         /panel-gestion/no-existe           → global, sin página (404)
       Antes se tomaba SIEMPRE el primer segmento como slug, así que las páginas
       globales de un solo término (`configuracion`, `estadisticas`…) resolvían
       a portada y perdían su título de pestaña. */
    const parts = afterBase ? afterBase.split("/") : [];
    let entitySlug = null;
    let path = afterBase;
    if (afterBase && !matchesAnyRoute(afterBase)) {
      // Si hay un solo segmento, podría ser un entitySlug (aunque no coincida con rutas conocidas)
      if (parts.length === 1) {
        entitySlug = parts[0];
        path = '';
      } else {
        const resto = parts.slice(1).join("/");
        if (matchesAnyRoute(resto)) {
          entitySlug = parts[0];
          path = resto;
        }
      }
    }
    return entitySlug
      ? { language: lang, entitySlug, path, search }
      : { language: lang, path, search };
  }
  return null;
}

/**
 * Lee una URL del panel y devuelve qué página es, con sus parámetros.
 *
 * Acepta los segmentos del idioma de la URL y también los del otro: un enlace a
 * `/panel-gestion/forms` escrito antes de que la URL se tradujera sigue
 * llevando a Mis formularios en vez de a un 404.
 *
 * @returns {{key: string|null, alias: string, language: string, entitySlug: string|null, params: object, search: string}|null}
 *   `null` si la ruta no es del panel; `key: null` si lo es pero no corresponde
 *   a ninguna página (el 404 de dentro del panel).
 *   `alias` es el idioma del alias y `language` el de los segmentos: pueden no
 *   coincidir, y esa discrepancia es justo lo que hay que corregir.
 *   `entitySlug` es el slug de la entidad si la URL está scopeada a una entidad.
 */
export function resolvePanelRoute(url) {
  const rel = panelRelativePath(url);
  if (!rel) return null;

  for (const language of [rel.language, ...LANGUAGES.filter((l) => l !== rel.language)]) {
    for (const route of ROUTES) {
      const { re, ids } = matcherFor(route.key, language);
      const match = rel.path.match(re);
      if (!match) continue;
      const params = {};
      ids.forEach((name, i) => { params[name] = safeDecode(match[i + 1]); });
      return { key: route.key, alias: rel.language, language, entitySlug: rel.entitySlug, params, search: rel.search };
    }
  }
  return { key: null, alias: rel.language, language: rel.language, entitySlug: rel.entitySlug, params: {}, search: rel.search };
}

/** La clave i18n del título de una URL del panel (o null si no es del panel). */
export function titleKeyForUrl(url) {
  const found = resolvePanelRoute(url);
  if (!found) return null;
  return found.key ? ROUTE_BY_KEY.get(found.key).titleKey : "pageNotFound";
}

/**
 * La dirección correcta de esta URL en un idioma, o `null` si ya lo está.
 *
 * Es lo que usan los dos sitios que tienen que ponerse de acuerdo con la URL:
 * el cambio de idioma y la entrada a un enlace cuyo idioma no es el activo.
 * Devolver `null` y no la ruta cuando no hay nada que corregir es lo que evita
 * un ciclo de navegaciones: el que llama decide si hay que moverse.
 */
export function canonicalPanelPath(url, language) {
  const found = resolvePanelRoute(url);
  if (!found) return null;
  if (found.alias === language && found.language === language) return null;
  // Dentro del panel pero sin página detrás: tampoco se toca, porque ahí lo que
  // hay que arreglar es el enlace, no la dirección. El 404 lo dice y el menú
  // sigue siendo el de este idioma.
  if (!found.key) return null;
  return buildPanelPath(found.key, language, found.params, found.search, found.entitySlug);
}

/* Rutas anteriores al panel: la dirección de antes → la página a la que
   pertenece. Los enlaces que ya se compartieron (marcadores, correos, chats)
   siguen llevando a la misma página, ahora bajo el alias del idioma actual.
   `ids` dice qué grupos de `re` son ids, en el orden en que salen. */
/* Rutas anteriores al panel: la dirección de antes → la página a la que
   pertenece. La raíz `/` muestra el escaparate de invitados y redirige al
   panel cuando hay sesión (inicio intacto); la entrada legacy se conserva
   por compatibilidad (la fija `qa/routes.js`). */
export const LEGACY = [
  { ruta: "/", re: /^\/$/, key: "home" },
  { ruta: "/dashboard", re: /^\/dashboard$/, key: "home" },
  { ruta: "/forms", re: /^\/forms$/, key: "forms" },
  { ruta: "/forms/:id/responses", re: /^\/forms\/([^/]+)\/responses$/, key: "responses", ids: ["id"] },
  { ruta: "/forms/:id/analytics", re: /^\/forms\/([^/]+)\/analytics$/, key: "analytics", ids: ["id"] },
  { ruta: "/insights", re: /^\/insights$/, key: "insights" },
  { ruta: "/inbox", re: /^\/inbox$/, key: "inbox" },
  { ruta: "/settings", re: /^\/settings$/, key: "settings" },
  { ruta: "/templates", re: /^\/templates$/, key: "templates" },
  { ruta: "/design", re: /^\/design$/, key: "design" },
  { ruta: "/builder/:id", re: /^\/builder\/([^/]+)$/, key: "builder", ids: ["id"] },
];

/**
 * Traduce una ruta anterior al panel a la página equivalente en un idioma, o
 * `null` si esa ruta no era del panel. `/` cuenta: la raíz era el panel.
 * Las puertas del IDP y las páginas públicas se dejan como están.
 */
export function legacyPanelPath(url, language = DEFAULT_LANGUAGE) {
  const { pathname, search } = splitUrl(url);
  if (pathname === LOGIN_PATH || pathname.startsWith(CALLBACK_PATH)) return null;
  if (isPublicFormPath(pathname)) return null;
  for (const entry of LEGACY) {
    const match = pathname.match(entry.re);
    if (!match) continue;
    const params = {};
    (entry.ids || []).forEach((name, i) => {
      // El grupo sale de `pathname`, que ya está codificado. Se descodifica para
      // tratar el id como lo que es, y lo vuelve a codificar `buildPanelPath`:
      // pasarlo tal cual convertiría "%20" en "%2520" y el enlace se rompería.
      params[name] = safeDecode(match[i + 1]);
    });
    return { key: entry.key, params, path: buildPanelPath(entry.key, language, params, search), search };
  }
  return null;
}
