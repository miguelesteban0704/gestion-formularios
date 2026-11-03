import { NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Inbox, BarChart3, ExternalLink } from "lucide-react";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Feedback.jsx";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { analyticsPath, builderPath, publicFormPath, responsesPath } from "../../lib/routes.js";
import { homePathForRole, isSuper } from "../../lib/roles.js";
import { useAuth } from "../../hooks/useAuth.js";

/** Header shared by the Responses and Analytics views of a form. */
export function FormPageHeader({ form, right }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const published = form?.status === "published";
  /* El super_admin llega aquí de solo lectura: no edita (nunca escribe) ni
     ve las respuestas en bruto (vetadas en `canSeeStatsPage`), así que las
     pestañas Editar/Respuestas solo le prometerían un rebote. La flecha de
     volver, en cambio, sí tiene adónde llevarle: su panel de públicos. */
  const soloLectura = isSuper(user);

  const tabClass = ({ isActive }) =>
    cn(
      "flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
      isActive ? "border-brand-600 text-brand-600" : "border-transparent text-muted hover:text-fg"
    );

  return (
    <div className="border-b border-default bg-surface">
      <div className="mx-auto max-w-7xl px-4 pt-5 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(homePathForRole(user, language))}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-fg">{form?.title}</h1>
                <Badge variant={published ? "green" : "gray"}>{published ? t("published") : t("drafts")}</Badge>
              </div>
              <p className="text-xs text-muted">{form?.responseCount || 0} {t("responses").toLowerCase()} · {form?.views || 0} {t("totalViews").toLowerCase()}</p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {published && (
              <Button variant="secondary" size="sm" onClick={() => window.open(publicFormPath(form.slug), "_blank")}>
                <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">{t("view")}</span>
              </Button>
            )}
            {right}
          </div>
        </div>

        <nav className="mt-4 flex max-w-full gap-5 overflow-x-auto scrollbar-thin">
          {!soloLectura && (
            <NavLink to={builderPath(language, form?._id, {}, user?.entity?.code)} className={tabClass}>
              <Pencil className="h-4 w-4" /> {t("edit")}
            </NavLink>
          )}
          {!soloLectura && (
            <NavLink to={responsesPath(language, form?._id, user?.entity?.code)} className={tabClass}>
              <Inbox className="h-4 w-4" /> {t("responses")}
            </NavLink>
          )}
          <NavLink to={analyticsPath(language, form?._id, user?.entity?.code)} className={tabClass}>
            <BarChart3 className="h-4 w-4" /> {t("insights")}
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
