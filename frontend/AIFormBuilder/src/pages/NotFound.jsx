import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button.jsx";
import { Logo } from "../components/Logo.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useRoleT } from "../lib/roleI18n.js";
import { siteHomePath } from "../lib/roles.js";

export default function NotFound() {
  const { t, language } = useLanguage();
  /* `backToSite` vive en el diccionario de roles, no en el general: pedirlo
     con `t()` pintaba la clave cruda en el botón. */
  const rt = useRoleT();
  const { user } = useAuth();
  /* Sin cuenta real (sin sesión o invitado) la vuelta es al SITIO: al panel
     solo vuelve quien de verdad tiene panel. */
  const destino = siteHomePath(user, language);
  const alSitio = destino === "/";
  return (
    /* Sin `min-h-screen`: la página ya vive dentro del armazón (que aporta su
       propia altura); usar 100vh aquí duplicaba el scroll y descolocaba el
       diseño del sitio. */
    <div className="animate-page-enter relative flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-app px-6 py-16 text-center">
      <Logo size={40} />
      <p className="text-7xl font-extrabold tracking-tight text-brand-600">404</p>
      <div>
        <h1 className="text-2xl font-bold text-fg">{t("pageNotFound")}</h1>
        <p className="mt-1.5 text-muted">{t("pageNotFoundDescription")}</p>
      </div>
      {/* Sin cuenta real el destino es EL SITIO, no el panel (que pediría IDP). */}
      <Link to={destino}>
        <Button size="lg">{alSitio ? rt("backToSite") : t("backToDashboard")}</Button>
      </Link>
    </div>
  );
}
