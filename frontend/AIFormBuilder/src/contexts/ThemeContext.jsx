import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAccent,
  getStoredAccent,
  normalizeAccentHex,
  persistAccent,
  DEFAULT_ACCENT,
  MANAGED_ACCENT,
} from "../lib/accent.js";
// El nombre de la clase de tema ("dark"/"light") viene de la capa compartida:
// es la MISMA decisión que aplica `@custom-variant dark` en index.css, así que
// no se duplica el literal en el JS.
import { themeClass } from "@/shared/styles/index";

export const ThemeContext = createContext(null);

export const STORAGE_KEY = "formly_theme_v2";
// La versión binaria anterior (ThemeContext viejo) autoguardaba el valor resuelto
// ("dark"/"light") en "formly_theme", lo que "congelaba" el tema y rompía el modo
// Sistema. La limpiamos al cargar para no heredar esa preferencia falsa.
const LEGACY_STORAGE_KEY = "formly_theme";

/**
 * Orden del ciclo del botón de cambio de tema:
 * Sistema → Oscuro → Claro → Sistema
 */
export const THEME_MODES = ["system", "dark", "light"];

/** Lee la preferencia guardada. Si no hay nada → null (seguir al sistema). */
function getStoredTheme() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (THEME_MODES.includes(saved)) return saved;
  } catch {
    /* localStorage no disponible */
  }
  return null;
}

/** Tema actual del sistema operativo / navegador. */
function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Acento de arranque: sin sesión del panel (o con un rastro viejo de
 * invitado) manda el índigo de la casa (#473ce2): es lo que ven la puerta
 * de acceso requerido, las puertas `/a/<slug>` y el portal. Con sesión, el
 * guardado de la cuenta (la hidratación de PreferencesSync pone el suyo).
 * Las claves de realm viven en `lib/api.js`; aquí solo se leen.
 */
function getInitialAccent() {
  try {
    const active = localStorage.getItem("formly_active_realm");
    if (!active || active === "guest") return MANAGED_ACCENT;
  } catch {
    return MANAGED_ACCENT;
  }
  return getStoredAccent() ?? DEFAULT_ACCENT;
}

export function ThemeProvider({ children }) {
  // `theme` es la PREFERENCIA del usuario: "system" | "dark" | "light".
  // `isDark` es el valor RESUELTO que se aplica al documento.
  const [theme, setTheme] = useState(() => getStoredTheme() ?? "system");
  const [systemDark, setSystemDark] = useState(getSystemDark);
  const [accent, setAccentState] = useState(getInitialAccent);
  const firstRender = useRef(true);

  const isDark = theme === "dark" || (theme === "system" && systemDark);

  // Aplica/retira la clase .dark en <html> según el tema resuelto.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Aplica el color de acento guardado (CSS vars de la marca) al arrancar y al cambiar.
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  // Escucha cambios de tema del sistema operativo mientras la app está abierta.
  // Solo tiene efecto cuando la preferencia es "system".
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemDark(event.matches);

    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
    } else if (mql.addListener) {
      mql.addListener(onChange); // fallback Safari < 14
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else if (mql.removeListener) {
        mql.removeListener(onChange);
      }
    };
  }, []);

  // Persiste SOLO la preferencia manual del usuario (nunca el valor resuelto),
  // y nunca en la primera carga: la primera visita sigue al sistema sin guardar nada.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage no disponible */
    }
  }, [theme]);

  const changeTheme = useCallback((next) => {
    if (THEME_MODES.includes(next)) setTheme(next);
  }, []);

  /** Alterna el ciclo: system → dark → light → system */
  const toggle = useCallback(() => {
    setTheme(
      (current) => THEME_MODES[(THEME_MODES.indexOf(current) + 1) % THEME_MODES.length]
    );
  }, []);

  /**
   * Cambia el color de acento (recolorea la marca en vivo y persiste).
   *
   * Normaliza y descarta antes de tocar estado: este es el ÚNICO camino por el
   * que un acento llega a la escala `--color-brand-*`, a `localStorage` y a la
   * API, así que es aquí donde se para un valor que no sea `#rrggbb`. Sin esta
   * comprobación, un `null` o un `#abc` que se colara desde el picker dejaría
   * la escala de la marca a `NaN` —toda la interfaz sin color— y el guardado
   * rebotaría con un 400 que el usuario no puede corregir.
   */
  const setAccent = useCallback((next) => {
    const hex = normalizeAccentHex(next);
    if (!hex) return;
    setAccentState(hex);
    persistAccent(hex);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: changeTheme,
      toggle,
      isDark,
      resolvedTheme: themeClass(isDark),
      accent,
      setAccent,
    }),
    [theme, changeTheme, toggle, isDark, accent, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}