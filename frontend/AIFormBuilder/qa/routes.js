/* Rutas del panel: idioma ↔ URL.
 *
 * Sin red ni navegador. Esto es el contrato del que dependen el enrutado, los
 * enlaces internos, el título de la pestaña y el cambio de idioma, y su forma
 * de fallar es la peor de todas: silenciosa. Un segmento mal traducido no da
 * error, deja la página en 404 o —peor— manda al idioma contrario sin que nada
 * se queje.
 *
 * Se comprueban las invariantes que sostienen el diseño:
 *   1. cada idioma tiene su alias y las páginas cuelgan de él;
 *   2. TODO lo traducible está traducido, alias y segmentos: con el español
 *      puesto, ninguna URL dice "forms" ni "settings";
 *   3. componer y volver a leer una URL da la misma página (ida y vuelta);
 *   4. el idioma se lee de la URL, y solo del panel;
 *   5. una URL que no es la de este idioma se corrige sola (cambio de idioma,
 *      enlace ajeno, segmento en el otro idioma);
 *   6. las rutas viejas siguen llegando a la misma página y las páginas
 *      públicas NO se mueven (esos enlaces ya se compartieron).
 *
 *   node qa/routes.js
 */

import {
  BRAND,
  LANGUAGES,
  DEFAULT_LANGUAGE,
  PANEL_BASE,
  LOGIN_PATH,
  CALLBACK_PATH,
  ROUTES,
  LEGACY,
  EN_EL_ARMazon,
  A_PANTALLA_COMPLETA,
  panelBase,
  panelPath,
  homePath,
  buildPanelPath,
  formsPath,
  insightsPath,
  inboxPath,
  settingsPath,
  templatesPath,
  designPath,
  builderPath,
  responsesPath,
  analyticsPath,
  publicFormPath,
  isPublicFormPath,
  languageFromPath,
  panelRelativePath,
  resolvePanelRoute,
  canonicalPanelPath,
  titleKeyForUrl,
  legacyPanelPath,
} from "../src/lib/routes.js";
import { resolveDocumentTitle } from "../src/lib/pageTitle.js";

let fallos = 0;
let total = 0;
const eq = (real, esperado, nombre) => {
  total++;
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) console.log(`  OK    ${nombre}`);
  else {
    console.log(`  FALLO ${nombre}`);
    console.log(`          esperado ${b}`);
    console.log(`          real     ${a}`);
    fallos++;
  }
};
const ok = (cond, nombre, detalle = "") => {
  total++;
  if (cond) console.log(`  OK    ${nombre}`);
  else {
    console.log(`  FALLO ${nombre}`);
    if (detalle) console.log(`          ${detalle}`);
    fallos++;
  }
};
const seccion = (titulo) => console.log(`\n── ${titulo} ──`);

seccion("1. alias por idioma");
eq(PANEL_BASE.es, "/panel-gestion", "el español es el alias pedido, sin prefijo de locale");
eq(PANEL_BASE.en, "/en/panel-management", "el inglés lleva prefijo de locale y su propio alias");
eq(BRAND, "CubaGob", "la marca del título");
eq(LANGUAGES, ["es", "en"], "los dos idiomas del panel");
eq(DEFAULT_LANGUAGE, "en", "idioma por defecto del visitante anónimo");
ok(
  LANGUAGES.every((l) => panelBase(l).startsWith("/") && !panelBase(l).endsWith("/")),
  "ningún alias se queda con barra inicial o final",
  LANGUAGES.map((l) => `${l}=${panelBase(l)}`).join(" · "),
);
ok(
  LANGUAGES.every((l) => panelBase(l) !== "/" && panelBase(l) !== ""),
  "el panel nunca vive en la raíz",
);
ok(
  new Set(LANGUAGES.map(panelBase)).size === LANGUAGES.length,
  "los dos alias son distintos: no pueden pisarse",
);

seccion("2. las páginas cuelgan del alias, y en español");
eq(homePath("es"), "/panel-gestion", "portada del panel (es)");
eq(homePath("en"), "/en/panel-management", "portada del panel (en)");
eq(formsPath("es"), "/panel-gestion/formularios", "mis formularios en español (NO 'forms')");
eq(settingsPath("es"), "/panel-gestion/configuracion", "configuración en español (NO 'settings')");
eq(insightsPath("es"), "/panel-gestion/estadisticas", "estadísticas en español (NO 'insights')");
eq(inboxPath("es"), "/panel-gestion/bandeja-de-entrada", "bandeja en español (NO 'inbox')");
eq(templatesPath("es"), "/panel-gestion/plantillas", "plantillas en español (NO 'templates')");
eq(designPath("es"), "/panel-gestion/diseno", "sistema de diseño en español (NO 'design')");
eq(builderPath("es", "abc"), "/panel-gestion/constructor/abc", "constructor en español (NO 'builder')");
eq(responsesPath("es", "abc"), "/panel-gestion/formularios/abc/respuestas", "respuestas en español");
eq(analyticsPath("es", "abc"), "/panel-gestion/formularios/abc/estadisticas", "estadísticas de un formulario en español");
eq(formsPath("en"), "/en/panel-management/forms", "mis formularios (en)");
eq(settingsPath("en"), "/en/panel-management/settings", "configuración (en)");
eq(insightsPath("en"), "/en/panel-management/insights", "estadísticas (en)");
eq(inboxPath("en"), "/en/panel-management/inbox", "bandeja (en)");
eq(templatesPath("en"), "/en/panel-management/templates", "plantillas (en)");
eq(designPath("en"), "/en/panel-management/design", "sistema de diseño (en)");
eq(builderPath("en", "abc", { ai: true }), "/en/panel-management/builder/abc?ai=1", "constructor con el generador abierto");
eq(responsesPath("en", "abc"), "/en/panel-management/forms/abc/responses", "respuestas de un formulario (en)");
eq(analyticsPath("en", "abc"), "/en/panel-management/forms/abc/analytics", "estadísticas de un formulario (en)");
eq(panelPath("es", "formularios", "abc"), "/panel-gestion/formularios/abc", "panelPath compone segmentos");
eq(panelPath("en"), "/en/panel-management", "panelPath sin segmentos es el alias");
eq(buildPanelPath("home", "es"), "/panel-gestion", "la portada se compone con buildPanelPath también");
ok(
  LANGUAGES.every((l) => [formsPath, insightsPath, inboxPath, settingsPath, templatesPath, designPath]
    .every((f) => f(l).startsWith(panelBase(l) + "/"))),
  "toda página del panel empieza por su alias",
);

seccion("3. lo traducible, traducido");
const SIN_TILDE = /^[a-z0-9\-/]*$/;
ok(
  ROUTES.every((route) => SIN_TILDE.test(route.es.replace(/:[^/]+/g, "")) && SIN_TILDE.test(route.en.replace(/:[^/]+/g, ""))),
  "los segmentos no llevan tildes ni ñ: una URL es un identificador",
  ROUTES.filter((r) => !SIN_TILDE.test(r.es.replace(/:[^/]+/g, ""))).map((r) => r.key).join(" · "),
);
ok(
  ROUTES.filter((route) => route.es !== "").every((route) => route.es !== route.en),
  "ninguna página dice lo mismo en los dos idiomas",
  ROUTES.filter((r) => r.es !== "" && r.es === r.en).map((r) => r.key).join(" · "),
);
ok(
  LANGUAGES.every((l) => ROUTES.every((route) => {
    const path = buildPanelPath(route.key, l, { id: "42" });
    return resolvePanelRoute(path)?.key === route.key;
  })),
  "toda ruta compuesta vuelve a leerse como la misma página",
);
const PARAMETROS = [
  ["builder", { id: "constructor" }],
  ["responses", { id: "formulario con espacios" }],
  ["analytics", { id: "42" }],
];
ok(
  PARAMETROS.every(([key, params]) => LANGUAGES.every((l) => {
    const encontrada = resolvePanelRoute(buildPanelPath(key, l, params));
    return encontrada?.key === key && encontrada.params.id === params.id;
  })),
  "el id de la URL vuelve intacto, también con espacios",
);
ok(
  LANGUAGES.every((l) => ROUTES.every((route) => titleKeyForUrl(buildPanelPath(route.key, l, { id: "42" })) === route.titleKey)),
  "cada página tiene su clave de título y no depende del idioma",
);
ok(
  ROUTES.every((route) => typeof route.enPantalla === "boolean"),
  "toda página declara si va dentro del armazón o a pantalla completa",
  ROUTES.filter((r) => typeof r.enPantalla !== "boolean").map((r) => r.key).join(" · "),
);
eq(
  [...EN_EL_ARMazon, ...A_PANTALLA_COMPLETA].sort(),
  ROUTES.map((route) => route.key).sort(),
  "ninguna página se queda sin dibujar: todas están en una de las dos listas",
);
eq(A_PANTALLA_COMPLETA, ["builder"], "el constructor es el único que va a pantalla completa");
ok(
  EN_EL_ARMazon.includes("responses") && EN_EL_ARMazon.includes("analytics"),
  "respuestas y estadísticas van dentro del armazón, con cabecera y selector de idioma",
);

seccion("4. el idioma se lee de la URL");
eq(languageFromPath("/panel-gestion"), "es", "el alias español dice español");
eq(languageFromPath("/en/panel-management"), "en", "el alias inglés dice inglés");
eq(languageFromPath("/panel-gestion/formularios/42/respuestas"), "es", "una página honda sigue siendo española");
eq(languageFromPath("/en/panel-management/settings"), "en", "ajustes en inglés");
eq(languageFromPath("/"), null, "la raíz no dice nada: no es del panel");
eq(languageFromPath("/f/mi-encuesta"), null, "una página pública no declara idioma");
eq(languageFromPath(LOGIN_PATH), null, "la puerta de acceso no declara idioma");
eq(languageFromPath("/panel-gestionX/formularios"), null, "un prefijo que solo empieza igual no cuenta");
eq(languageFromPath("/en"), null, "el locale suelto no es el panel");
eq(languageFromPath("/en/panel-managementes"), null, "y un alias que solo empieza igual tampoco");
eq(
  languageFromPath(publicFormPath("mi-encuesta")),
  null,
  "ni siquiera el enlace público construido con la ruta pública se puede atribuir a un idioma",
);

seccion("5. quitar el alias deja la misma página");
eq(panelRelativePath("/panel-gestion/formularios", "es"), { language: "es", path: "formularios", search: "" }, "relativa de una página (es)");
eq(panelRelativePath("/panel-gestion/constructor/nuevo?ai=1", "es"), { language: "es", path: "constructor/nuevo", search: "?ai=1" }, "la query no viaja en la ruta");
eq(panelRelativePath("/en/panel-management", "en"), { language: "en", path: "", search: "" }, "la portada no tiene resto");
eq(panelRelativePath("/en/panel-management/forms/42/analytics", "en"), { language: "en", path: "forms/42/analytics", search: "" }, "relativa de una página honda (en)");
eq(panelRelativePath("/f/mi-encuesta", "es"), null, "una página pública no es del panel");
eq(panelRelativePath("/otro-sitio/formularios", "es"), null, "algo que no es el panel no se toca");
eq(
  LANGUAGES.map((l) => panelRelativePath(homePath(l), l).path),
  ["", ""],
  "las dos portadas comparten la misma página",
);
eq(
  ROUTES.map((route) => resolvePanelRoute(buildPanelPath(route.key, "es", { id: "42" })).alias),
  ROUTES.map(() => "es"),
  "todo lo compuesto en español lleva el alias español",
);
eq(
  ROUTES.map((route) => resolvePanelRoute(buildPanelPath(route.key, "en", { id: "42" })).alias),
  ROUTES.map(() => "en"),
  "y en inglés, el inglés",
);

seccion("6. una URL que no es la de este idioma se corrige sola");
ok(
  LANGUAGES.every((l) => ROUTES.every((route) => {
    const path = buildPanelPath(route.key, l, { id: "42" });
    return canonicalPanelPath(path, l) === null;
  })),
  "una URL ya correcta no se toca (y así no hay bucle de navegaciones)",
);
ok(
  LANGUAGES.every((l) => {
    const otro = LANGUAGES.find((x) => x !== l);
    return ROUTES.every((route) => {
      const canonica = buildPanelPath(route.key, otro, { id: "42" });
      const corregida = canonicalPanelPath(canonica, l);
      return corregida === buildPanelPath(route.key, l, { id: "42" });
    });
  }),
  "cambiar de idioma conserva la página y traduce toda la URL",
);
eq(canonicalPanelPath("/panel-gestion/forms", "es"), "/panel-gestion/formularios", "un segmento en inglés debajo del alias español se corrige");
eq(canonicalPanelPath("/en/panel-management/configuracion", "en"), "/en/panel-management/settings", "y al revés");
eq(canonicalPanelPath("/en/panel-management/forms/42/responses", "es"), "/panel-gestion/formularios/42/respuestas", "cambiar de idioma en una página honda conserva el formulario");
eq(canonicalPanelPath("/panel-gestion/constructor/nuevo?ai=1", "en"), "/en/panel-management/builder/nuevo?ai=1", "y conserva la query");
eq(canonicalPanelPath(publicFormPath("mi-encuesta"), "en"), null, "la página pública no se toca al cambiar de idioma");
eq(canonicalPanelPath(LOGIN_PATH, "en"), null, "la puerta de acceso tampoco");
eq(canonicalPanelPath("/panel-gestion/no-existe", "es"), null, "dentro del panel pero sin página no se corrige: lo dice el 404");
eq(canonicalPanelPath("/otro-sitio", "es"), null, "fuera del panel no se corrige");
eq(resolvePanelRoute("/panel-gestion/forms").key, "forms", "un enlace viejo con segmento inglés sigue llegando a la página");
eq(resolvePanelRoute("/en/panel-management/configuracion").key, "settings", "y en el otro idioma también");
eq(resolvePanelRoute("/panel-gestion/no-existe").key, null, "una ruta que no existe se distingue de una que sí");
eq(resolvePanelRoute("/f/mi-encuesta"), null, "la página pública no resuelve a una página del panel");

seccion("7. las rutas viejas siguen llegando");
eq(legacyPanelPath("/").path, homePath("en"), "la raíz era el panel");
eq(legacyPanelPath("/", "es").path, homePath("es"), "y lleva al idioma activo");
eq(legacyPanelPath("/dashboard", "es").path, homePath("es"), "/dashboard era el panel privado, ahora el alias");
eq(legacyPanelPath("/forms", "es").path, formsPath("es"), "/forms");
eq(legacyPanelPath("/insights", "es").path, insightsPath("es"), "/insights");
eq(legacyPanelPath("/inbox", "es").path, inboxPath("es"), "/inbox");
eq(legacyPanelPath("/settings", "es").path, settingsPath("es"), "/settings");
eq(legacyPanelPath("/templates", "es").path, templatesPath("es"), "/templates");
eq(legacyPanelPath("/design", "es").path, designPath("es"), "/design");
eq(legacyPanelPath("/builder/42", "es").path, builderPath("es", "42"), "/builder/42");
eq(legacyPanelPath("/forms/42/responses", "es").path, responsesPath("es", "42"), "/forms/42/responses");
eq(legacyPanelPath("/forms/42/analytics", "es").path, analyticsPath("es", "42"), "/forms/42/analytics");
eq(legacyPanelPath("/builder/new?ai=1", "es").path, builderPath("es", "new") + "?ai=1", "una ruta vieja con query conserva la query");
eq(legacyPanelPath("/builder/nuevo%20con%20espacios", "es").path, "/panel-gestion/constructor/nuevo%20con%20espacios", "un id con espacios no se codifica dos veces");
eq(legacyPanelPath("/f/mi-encuesta"), null, "el enlace público no se redirige");
eq(legacyPanelPath(LOGIN_PATH), null, "la puerta de acceso no se redirige");
eq(legacyPanelPath(CALLBACK_PATH), null, "el callback del IDP no se redirige");
eq(legacyPanelPath(CALLBACK_PATH + "?token=abc"), null, "el callback con token no se redirige");
eq(legacyPanelPath("/panel-gestion/formularios"), null, "una ruta ya migrada no se redirige otra vez");
eq(legacyPanelPath("/en/panel-management/forms"), null, "una ruta inglesa ya migrada tampoco");
eq(legacyPanelPath("/no-existe"), null, "una ruta que no era del panel no se toca");
eq(isPublicFormPath("/f/mi-encuesta"), true, "la página pública se reconoce");
eq(isPublicFormPath("/f/mi-encuesta?x=1"), true, "la query no la esconde");
eq(isPublicFormPath("/panel-gestion/formularios"), false, "el panel no es una página pública");
eq(isPublicFormPath("/f/"), false, "un slug vacío no es una página pública");
ok(
  LEGACY.every((entrada) => {
    const probada = entrada.ruta.replace(":id", "42");
    const llegadas = LANGUAGES.map((l) => legacyPanelPath(probada, l)?.path);
    return llegadas.every((path) => path && resolvePanelRoute(path)?.key === entrada.key);
  }),
  "cada ruta vieja llega a la misma página en los dos idiomas",
);
ok(
  LEGACY.every((entrada) => LANGUAGES.every((l) => canonicalPanelPath(legacyPanelPath(entrada.ruta.replace(":id", "42"), l)?.path, l) === null)),
  "y la dirección a la que llega es la correcta, sin correcciones pendientes",
);

seccion("8. el título de la pestaña");
const TITULOS = {
  es: { panelHome: "Panel de Gestión", siteForms: "Formularios", dashboard: "Panel", myForms: "Mis formularios", insights: "Estadísticas", inbox: "Bandeja de entrada", settings: "Configuración", templates: "Plantillas", designSystem: "Sistema de diseño", build: "Construir", responses: "Respuestas", logIn: "Iniciar sesión", pageNotFound: "Página no encontrada" },
  en: { panelHome: "Management Panel", siteForms: "Forms", dashboard: "Dashboard", myForms: "My Forms", insights: "Insights", inbox: "Inbox", settings: "Settings", templates: "Templates", designSystem: "Design System", build: "Build", responses: "Responses", logIn: "Log in", pageNotFound: "Page not found" },
};
const t = (lenguaje) => (clave) => TITULOS[lenguaje][clave] ?? clave;
const titulo = (pathname, lenguaje = "es", authPhase = null) =>
  resolveDocumentTitle({ pathname, t: t(lenguaje), authPhase });

eq(titulo("/panel-gestion"), "CubaGob - Panel de Gestión", "la portada del panel en español");
eq(titulo("/en/panel-management", "en"), "CubaGob - Management Panel", "la portada del panel en inglés");
eq(titulo("/panel-gestion/formularios"), "CubaGob - Mis formularios", "mis formularios en español");
eq(titulo("/en/panel-management/forms", "en"), "CubaGob - My Forms", "mis formularios en inglés");
eq(titulo("/panel-gestion/configuracion"), "CubaGob - Configuración", "configuración en la URL española");
eq(titulo("/en/panel-management/settings", "en"), "CubaGob - Settings", "configuración en la URL inglesa");
eq(titulo("/panel-gestion/bandeja-de-entrada"), "CubaGob - Bandeja de entrada", "la bandeja en español");
eq(titulo("/panel-gestion/constructor/42"), "CubaGob - Construir", "el constructor");
eq(titulo("/panel-gestion/formularios/42/respuestas"), "CubaGob - Respuestas", "las respuestas de un formulario");
eq(titulo("/panel-gestion/formularios/42/estadisticas"), "CubaGob - Estadísticas", "las estadísticas de un formulario");
eq(titulo("/panel-gestion/forms"), "CubaGob - Mis formularios", "un enlace con el segmento viejo no pierde el título");
eq(titulo(LOGIN_PATH), "CubaGob - Iniciar sesión", "la puerta de acceso");
eq(titulo(CALLBACK_PATH), "CubaGob - Panel de Gestión", "el callback del IDP vuelve al panel");
eq(titulo(CALLBACK_PATH, "es", "login"), "CubaGob - Iniciar sesión", "durante el traspaso de acceso manda el destino");
eq(titulo(CALLBACK_PATH, "es", "logout"), "CubaGob - Panel de Gestión", "al cerrar sesión el destino es el panel");
eq(titulo("/"), "CubaGob - Formularios", "la raíz sin sesión es la portada de formularios");
eq(titulo("/no-existe"), "CubaGob - Página no encontrada", "una ruta desconocida lo dice");
eq(titulo("/panel-gestion/no-existe"), "CubaGob - Página no encontrada", "y dentro del panel también");
eq(titulo("/f/mi-encuesta"), null, "la página pública conserva el título del formulario");
eq(titulo("/f/mi-encuesta", "en"), null, "y también en inglés: es su SEO, no el del panel");
ok(
  ["/panel-gestion", "/panel-gestion/formularios", "/en/panel-management/settings", LOGIN_PATH, "/no-existe"]
    .every((ruta) => titulo(ruta).startsWith(`${BRAND} - `)),
  "toda página del panel lleva la marca delante",
);
ok(
  ROUTES.every((route) => LANGUAGES.every((l) => titulo(buildPanelPath(route.key, l, { id: "42" }), l)
    === `${BRAND} - ${t(l)(route.titleKey)}`)),
  "el título sale de la tabla de rutas, sin una lista de rutas aparte",
);

console.log("\n─────────────────────────────────────────");
console.log(`comprobaciones: ${total} · fallos: ${fallos}`);
if (fallos === 0) console.log("TODO CORRECTO");
else process.exit(1);
