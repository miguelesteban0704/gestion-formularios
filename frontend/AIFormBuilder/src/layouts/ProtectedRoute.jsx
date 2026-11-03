import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { PageLoader } from "../components/ui/Feedback.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { recordarDestino } from "../lib/authReturn.js";

export function ProtectedRoute({ children }) {
  const { t } = useLanguage();
  const { isAuthenticated, loading, transition } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label={t("restoringSession")} />;

  /* Traspaso con el IDP en marcha: este guard se aparta.
   *
   * `logout()` cierra la sesión ANTES de navegar (si no, el backend no puede
   * cerrar la sesión en el IDP). Ese `setUser(null)` dejaba `isAuthenticated` en
   * false con la página todavía viva, así que este guard respondía
   * `<Navigate to="/login">` y caía en `LoginPage`, que veía "sin token" y
   * lanzaba una SEGUNDA ida al IDP con su propio temporizador.
   *
   * El síntoma era exactamente el que se veía: dos navegaciones de página
   * completa a 60ms de distancia —la de `/auth/login` a 320ms y la de
   * `/auth/logout` a 380ms—, y entre medias `initiateLogin()` cambiaba
   * `transition.type` de "logout" a "login", así que el splash mutaba de
   * "Cerrando sesión…" a "Redirigiendo…" sin llegar a taparse. De ahí el
   * parpadeo y la recarga, y de paso la posibilidad de acabar en la pantalla de
   * inicio del IDP en vez de en la de cierre.
   *
   * `logout()` ya tiene el destino decidido, así que aquí no hay nada que
   * decidir: solo dejar de competir con él. */
  if (transition.active) return <PageLoader />;

  if (!isAuthenticated) {
    /* Se guarda antes de redirigir, y no en el `state` del `<Navigate>`: el
       login termina en una navegación de página completa (el salto al IDP y el
       callback), y ese estado no sobrevive. Con `search` incluido para que un
       constructor abierto con filtros no los pierda. La escritura es
       idempotente, así que un render doble no cambia nada. */
    recordarDestino(location.pathname + location.search);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

