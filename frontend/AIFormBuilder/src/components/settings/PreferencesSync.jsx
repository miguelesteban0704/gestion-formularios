import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth.js";
import { useTheme } from "../../hooks/useTheme.js";
import { useLanguage, DEFAULT_LANGUAGE, STORAGE_KEY as LANG_STORAGE_KEY } from "../../contexts/LanguageContext.jsx";
import { STORAGE_KEY as THEME_STORAGE_KEY } from "../../contexts/ThemeContext.jsx";
import { settingsApi } from "../../services/index.js";
import { DEFAULT_ACCENT, ACCENT_KEY, MANAGED_ACCENT, isAccentHex } from "../../lib/accent.js";
import { isEntityAdmin, isCreator } from "../../lib/roles.js";
import {
  subscribeAppearanceExplicitSave,
  getAppearanceExplicitSave,
} from "./appearanceSaveGate.js";

const THEME_MODES = ["system", "dark", "light"];
const SUPPORTED_LANGUAGES = ["es", "en"];
const DEBOUNCE_MS = 400;

/**
 * Sincroniza las preferencias de interfaz del usuario (tema, color de acento e
 * idioma) con su cuenta:
 *
 *  1. Hidratación — al iniciar sesión, las preferencias guardadas en el backend
 *     se aplican a los contextos (la cuenta es la fuente de verdad), así el tema,
 *     el color y el idioma viajan entre dispositivos.
 *  2. Persistencia — cualquier cambio posterior (botón de tema de la cabecera,
 *     selector de idioma o la pestaña Apariencia de ajustes) se guarda en la
 *     cuenta con un pequeño debounce.
 *
 * No hace nada para visitantes anónimos: ahí mandan las preferencias locales.
 */
export function PreferencesSync() {
  const { user } = useAuth();
  const { theme, setTheme, accent, setAccent } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);
  const lastSentRef = useRef(null);
  // Indica si el efecto de persistencia (2) está esperando a debounce.
  const prevUserRef = useRef(user);
  // Cuando la pestaña Apariencia está abierta, el guardado es explícito (botón
  // "Guardar cambios"); PreferencesSync no autoguarda para no pisar ese flujo.
  const explicitSave = useSyncExternalStore(subscribeAppearanceExplicitSave, getAppearanceExplicitSave);
  /* Antes `t` venía en un ref porque se recreaba en cada render del
     LanguageProvider y reiniciaba el debounce de guardado. Ahora `t` sale de un
     `useCallback` y es estable, así que puede ir en las dependencias como
     cualquier otro valor: si el idioma cambia, el error se muestra en el
     idioma nuevo sin recargar. */

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    enabled: !!user,
    staleTime: 60_000,
  });

  // 1) Hidratación única desde la cuenta (no pisa elecciones hechas en vivo).
  useEffect(() => {
    if (!user || !settings || hydratedRef.current) return;
    hydratedRef.current = true;
    if (THEME_MODES.includes(settings.theme) && settings.theme !== theme) setTheme(settings.theme);
    // Gestores: acento impuesto #473ce2 (sin Apariencia no pueden cambiarlo).
    // El resto hidrata su guardado, como siempre.
    if (isEntityAdmin(user) || isCreator(user)) {
      if (accent !== MANAGED_ACCENT) setAccent(MANAGED_ACCENT);
    } else if (isAccentHex(settings.accentColor)) {
      // Hidratación explícita: sin herencia silenciosa del color del super. Si la
      // cuenta no trae un acento válido (heredado), se escribe el default.
      if (settings.accentColor !== accent) setAccent(settings.accentColor);
    } else if (accent !== DEFAULT_ACCENT) {
      setAccent(DEFAULT_ACCENT);
    }
    if (SUPPORTED_LANGUAGES.includes(settings.language) && settings.language !== language) {
      changeLanguage(settings.language);
    }
    lastSentRef.current = {
      theme: settings.theme,
      accentColor: isAccentHex(settings.accentColor) ? settings.accentColor : DEFAULT_ACCENT,
      language: settings.language,
    };
  }, [user, settings, theme, accent, language, setTheme, setAccent, changeLanguage]);

  // 2) Persistencia automática (debounce) de los cambios del usuario.
  //    Mientras la pestaña Apariencia está abierta (explicitSave) el guardado
  //    lo gestiona su botón "Guardar cambios": aquí no se envía nada.
  useEffect(() => {
    if (!user || !hydratedRef.current || explicitSave) return;
    const current = { theme, accentColor: accent, language };
    const last = lastSentRef.current;
    if (last && last.theme === current.theme && last.accentColor === current.accentColor && last.language === current.language) {
      return;
    }

    const timer = setTimeout(() => {
      lastSentRef.current = current;
      settingsApi
        .updateAppearance(current)
        .then(() => {
          // Mantén la caché de /settings al día para que la pestaña Apariencia
          // refleje el valor guardado sin recargar.
          queryClient.setQueryData(["settings"], (old) => ({ ...(old || {}), ...current }));
        })
        .catch(() => {
          lastSentRef.current = last; // reintenta con el siguiente cambio
          toast.error(t("errorSaving"));
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [theme, accent, language, user, queryClient, explicitSave, t]);

  // 3) Cierre de sesión: se vuelve a los valores por defecto (visitante anónimo).
  //    También se reinicia la hidratación y se limpia la caché de /settings para
  //    que la próxima cuenta que inicie sesión reciba SUS preferencias.
  useEffect(() => {
    // Capturar el usuario ANTERIOR antes de actualizar el ref (bug clásico si
    // se captura después: el guard siempre vería el usuario nuevo).
    const prevUser = prevUserRef.current;
    const wasLoggedIn = Boolean(prevUser);
    const isLoggedIn = Boolean(user);
    prevUserRef.current = user;
    if (!wasLoggedIn || isLoggedIn) return;

    hydratedRef.current = false;
    lastSentRef.current = null;
    queryClient.removeQueries({ queryKey: ["settings"] });

    setTheme("system");
    // Sin sesión manda el índigo de la casa (#473ce2): ni el acento que el
    // super tuviera en Apariencia ni el default sobreviven al cierre. Así la
    // puerta de acceso requerido, las puertas `/a/<slug>` y el portal abren
    // siempre con el color compartido.
    setAccent(MANAGED_ACCENT);
    localStorage.setItem(ACCENT_KEY, MANAGED_ACCENT);
    changeLanguage(DEFAULT_LANGUAGE);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, "system");
      localStorage.removeItem("formly_theme"); // legacy binario
      localStorage.setItem(LANG_STORAGE_KEY, DEFAULT_LANGUAGE);
    } catch {
      /* localStorage no disponible */
    }
  }, [user, setTheme, setAccent, changeLanguage, queryClient]);

  return null;
}