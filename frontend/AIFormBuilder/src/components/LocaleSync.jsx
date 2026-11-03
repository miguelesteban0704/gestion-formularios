import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { canonicalPanelPath } from "../lib/routes.js";

/**
 * La URL es un espejo del idioma elegido, y aquí se hace encajar.
 *
 * El alias del panel dice en qué idioma se está (`/panel-gestion` es español,
 * `/en/panel-management` es inglés) y los segmentos de debajo también van
 * traducidos (`/panel-gestion/configuracion`). Cuando el idioma y la dirección
 * no coinciden, manda el idioma y se corrige la dirección:
 *
 *  - La preferencia de la cuenta manda sobre el alias: se entra con el español
 *    puesto y se abre un enlace en inglés, la URL se pone en español. Es lo que
 *    espera cualquiera que ya haya elegido idioma.
 *  - Una URL con el alias de un idioma y los segmentos del otro (por ejemplo
 *    `/panel-gestion/forms`, escrita antes de traducir los segmentos) se corrige
 *    sola en vez de dar "no encontrada".
 *
 * El caso de pulsar los botones NO pasa por aquí: el propio botón cambia el
 * idioma y la URL en la misma actualización, porque dejarla para un efecto
 * hacía que la URL fuera un paso por detrás de la pantalla. Este componente
 * queda como la red que cubre todo lo demás (preferencias de la cuenta, ajustes,
 * carga directa de un enlace).
 *
 * De las dos cosas se encarga `canonicalPanelPath`: devuelve a dónde hay que
 * estar, o `null` si ya se está ahí. Que devuelva `null` cuando no hay nada que
 * hacer es lo que impide el bucle de navegaciones.
 *
 * Solo se toca lo que ya está dentro del panel. Las páginas públicas de
 * formularios y las puertas del proveedor de identidad no cuelgan del alias y
 * se quedan donde están: cambiar de idioma ahí solo cambia el texto.
 *
 * Las rutas viejas (`/`, `/forms`, …) no se migran aquí sino en el enrutado,
 * con <Navigate>, para que no llegue a pintarse ni un frame de "no encontrada".
 */
export function LocaleSync() {
  const { language } = useLanguage();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    /* Se lee `window.location` y no el `pathname` del enrutado: React Router
       escribe el historial en el acto pero aplaza su estado a una transición,
       y en una página larga su estado llega más de un segundo tarde. Quien
       tiene que poner de acuerdo idioma y dirección necesita la dirección de
       verdad, no la que todavía va por detrás. El `pathname` del enrutado
       queda como dependencia, que es lo que marca cuándo hay que revisar. */
    const destino = canonicalPanelPath(window.location.pathname + window.location.search, language);
    if (destino) navigate(destino, { replace: true });
  }, [pathname, search, language, navigate]);

  return null;
}
