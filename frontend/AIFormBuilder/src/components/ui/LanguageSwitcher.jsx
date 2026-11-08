import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { canonicalPanelPath } from "../../lib/routes.js";

export function LanguageSwitcher({ className = "" }) {
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();

  /**
   * Cambiar de idioma cambia las palabras Y la dirección, y las dos cosas en el
   * mismo clic.
   *
   * Las dos se escriben de una en una y a propósito, porque son de naturalezas
   * distintas:
   *
   *  - El texto es estado de React: se cambia ya y se ve ya.
   *  - La dirección NO lo es. El enrutado la cambia con una transición, y en una
   *    página larga (la lista de formularios) su estado llegaba más de un
   *    segundo tarde: el texto ya estaba en español con la URL todavía en
   *    inglés. Escribir el historial aquí no espera a ningún repintado.
   *
   * Por eso se hacen las dos cosas, y en este orden. La barra de direcciones se
   * escribe primero porque es lo que la persona está mirando; el enrutado se
   * avisa después, en su tiempo, para que el enlace del menú marcado como
   * activo y las rutas siguientes no se queden con la dirección anterior.
   *
   * Para decidir a dónde hay que ir se lee `window.location` y no el `pathname`
   * del enrutado, que va por detrás: la barra de direcciones es la verdad.
   *
   * Fuera del panel (una página pública compartida, la puerta de acceso) no hay
   * alias que reescribir: `canonicalPanelPath` no devuelve nada y solo cambia el
   * texto, que es lo que debe pasar en un enlace que no depende del idioma.
   */
  const elegir = (siguiente) => {
    if (siguiente === language) return;
    const destino = canonicalPanelPath(window.location.pathname + window.location.search, siguiente);
    changeLanguage(siguiente);
    if (!destino) return;
    // Se conserva el objeto de estado que el enrutado tiene guardado ahí, que
    // es lo que le permite reconocer después esta misma entrada del historial.
    window.history.replaceState(window.history.state, "", destino);
    navigate(destino, { replace: true });
  };

  return (
    <div 
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-2xl border border-default bg-surface dark:bg-slate-900/90 dark:border-slate-800 p-1.5 shadow-soft backdrop-blur-md transition-colors", 
        className
      )} 
      aria-label={t("languageSelector")}
    >
      {/* Botón Español — solo bandera en móvil/tablet, con texto en escritorio */}
      <button
        onClick={() => elegir("es")}
        type="button"
        title="Español"
        className={cn(
          "relative flex h-8 items-center gap-2 rounded-lg px-1.5 text-xs font-semibold transition-all duration-300 ease-out lg:px-3",
          language === "es"
            ? "bg-brand-500 text-on-brand-500 shadow-md shadow-brand-500/25 scale-[1.02]"
            : "text-muted dark:text-slate-400 hover:text-fg dark:hover:text-slate-200 hover:bg-surface-2 dark:hover:bg-slate-800/60"
        )}
        aria-label="Español"
        aria-pressed={language === "es"}
      >
        <span className="flag-icon flag-es scale-110 drop-shadow-sm" aria-hidden="true" />
        <span className="hidden tracking-wide lg:inline">Es</span>
      </button>

      {/* Botón Inglés — solo bandera en móvil/tablet, con texto en escritorio */}
      <button
        onClick={() => elegir("en")}
        type="button"
        title="English"
        className={cn(
          "relative flex h-8 items-center gap-2 rounded-lg px-1.5 text-xs font-semibold transition-all duration-300 ease-out lg:px-3",
          language === "en"
            ? "bg-brand-500 text-on-brand-500 shadow-md shadow-brand-500/25 scale-[1.02]"
            : "text-muted dark:text-slate-400 hover:text-fg dark:hover:text-slate-200 hover:bg-surface-2 dark:hover:bg-slate-800/60"
        )}
        aria-label="English"
        aria-pressed={language === "en"}
      >
        <span className="flag-icon flag-en scale-110 drop-shadow-sm" aria-hidden="true" />
        <span className="hidden tracking-wide lg:inline">En</span>
      </button>
    </div>
  );
}