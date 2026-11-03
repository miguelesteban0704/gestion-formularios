import { Navigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { isGuest, homePathForRole } from "../lib/roles.js";
import { useRoleT } from "../lib/roleI18n.js";
import { FormsBrowser } from "../components/forms/FormsBrowser.jsx";
import { PageLoader } from "../components/ui/Feedback.jsx";

/**
 * Portada pública: SOLO encuestas publicadas (de todas las entidades), con
 * buscador y sin filtros. Sin sesión y sin usuario: nadie se autentica para
 * verla. Responder es público en las públicas y por IDP en las privadas
 * (flujo de `PublicForm`); las respuestas sin identidad salen como anónimo.
 */
export default function PublishedForms() {
  const { t, language } = useLanguage();
  const rt = useRoleT();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  if (authLoading) return <PageLoader label={t("loadingForm")} />;

  // Con sesión de panel, la raíz es su panel.
  if (isAuthenticated && user && !isGuest(user)) {
    return <Navigate to={homePathForRole(user, language)} replace />;
  }

  return (
    <div className="animate-page-enter mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        {rt("guestTitle")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm font-medium text-muted">
        {rt("guestSubtitle")}
      </p>
      <div className="mt-8">
        <FormsBrowser title="" guestMode hideFilters publishedOnly />
      </div>
    </div>
  );
}
