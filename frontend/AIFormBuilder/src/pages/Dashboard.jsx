import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  LayoutTemplate,
  FolderOpen,
  Globe,
  FileEdit,
  Inbox,
  Eye,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { formApi } from "../services/index.js";
import { Button } from "../components/ui/Button.jsx";
import { StatCard } from "../components/ui/Card.jsx";
import { FormsBrowser } from "../components/forms/FormsBrowser.jsx";
import { NavCard } from "../components/dashboard/NavCard.jsx";
import { AuthRequiredModal } from "../components/auth/AuthRequiredModal.jsx";
import { builderPath, templatesPath } from "../lib/routes.js";
import { accents } from "@/shared/styles/tokens";

const ACCENT = accents;

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [allForms, setAllForms] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const listRef = useRef(null);
  const userId = user?._id || "";

  // Unfiltered snapshot powering the hero stats and card counts.
  const loadAll = useCallback(
    () => {
      // Dashboard stats are private account metrics, never public catalog metrics.
      if (authLoading || !isAuthenticated) {
        setAllForms([]);
        return Promise.resolve();
      }

      setAllForms([]);
      return formApi.list().then(setAllForms).catch(() => setAllForms([]));
    },
    [authLoading, isAuthenticated, userId],
  );
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const counts = useMemo(() => {
    const active = allForms.filter((f) => !f.isArchived);
    return {
      total: active.length,
      published: active.filter((f) => f.status === "published").length,
      draft: active.filter((f) => f.status === "draft").length,
      responses: allForms.reduce((s, f) => s + (f.responseCount || 0), 0),
      views: allForms.reduce((s, f) => s + (f.views || 0), 0),
    };
  }, [allForms]);

  const conversion = counts.views ? Math.round((counts.responses / counts.views) * 100) : 0;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? t("goodMorning") : h < 18 ? t("goodAfternoon") : t("goodEvening");
  }, [t]);

  const jumpTo = (nextFilter) => {
    setFilter(nextFilter);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="animate-page-enter mx-auto max-w-7xl px-4 py-8 lg:px-8">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          {isAuthenticated ? `${greeting}, ${user?.name?.split(" ")[0]}!` : t("publicDashboard")}
        </h1>
        <Button onClick={() => isAuthenticated ? navigate(builderPath(language, "new", {}, user?.entity?.code)) : setAuthModalOpen(true)} className="shadow-glow self-start sm:self-auto">
          <Plus className="h-4 w-4" /> {t("newForm")}
        </Button>
      </div>

      {/* Decorative card grid */}
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Sin `shadow-glow`: la insignia ya pasa por `card-surface`, que es
            quien pone la sombra y el glow del hover. Con las dos, ganaba una y
            el hover de la insignia se quedaba a medio hacer. */}
        <NavCard hero icon={FolderOpen} title={t("createForm")} description={t("createFormDescription")} onClick={() => isAuthenticated ? navigate(builderPath(language, "new", {}, user?.entity?.code)) : setAuthModalOpen(true)} />
        {/* AI feature hidden - retained in code: the "AI Generator" NavCard used to
            live here (Sparkles → builderPath(..., { ai: true })). The AIGenerateModal
            is still mounted in Builder, but nothing in the UI can open it anymore. */}
        <NavCard icon={LayoutTemplate} accent={ACCENT.gold} decor="c" title={t("templates")} description={t("templatesDescription")} onClick={() => isAuthenticated ? navigate(templatesPath(language, user?.entity?.code)) : setAuthModalOpen(true)} />
        <NavCard icon={FolderOpen} accent={ACCENT.coral} decor="a" title={t("allForms")} description={t("allFormsDescription")} badge={`${counts.total} ${t("totalForms")}`} onClick={() => jumpTo("all")} />
        <NavCard icon={Globe} accent={ACCENT.blue} decor="e" title={t("published")} description={t("publishedDescription")} badge={`${counts.published} ${t("live")}`} onClick={() => jumpTo("published")} />
        <NavCard icon={FileEdit} accent={ACCENT.teal} decor="d" title={t("drafts")} description={t("draftsDescription")} badge={`${counts.draft} ${t("draftsCount")}`} onClick={() => jumpTo("draft")} />
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Inbox}
          label={t("responses")}
          value={counts.responses}
          accent="green"
          tooltip={{
            title: t("responsesTooltipTitle"),
            description: t("responsesTooltipDescription"),
            items: [{ label: t("responseConversionResponses"), value: counts.responses }],
          }}
        />
        <StatCard
          icon={Eye}
          label={t("totalViews")}
          value={counts.views}
          accent="amber"
          tooltip={{
            title: t("viewsTooltipTitle"),
            description: t("viewsTooltipDescription"),
            items: [{ label: t("responseConversionViews"), value: counts.views }],
          }}
        />
        <StatCard
          icon={TrendingUp}
          label={t("responseConversionRate")}
          value={`${conversion}%`}
          accent="pink"
          tooltip={{
            title: t("responseConversionTooltipTitle"),
            description: t("responseConversionTooltipDescription"),
            items: [
              { label: t("responseConversionResponses"), value: counts.responses },
              { label: t("responseConversionViews"), value: counts.views },
              {
                label: t("responseConversionFormula"),
                value: counts.views
                  ? `${counts.responses} / ${counts.views} x 100`
                  : t("responseConversionNoViews"),
              },
              { label: t("responseConversionResult"), value: `${conversion}%` },
            ],
          }}
        />
        <StatCard
          icon={CheckCircle2}
          label={t("published")}
          value={counts.published}
          sublabel={`${counts.total} ${t("totalForms")}`}
          tooltip={{
            title: t("publishedTooltipTitle"),
            description: t("publishedTooltipDescription"),
            items: [
              { label: t("publishedForms"), value: counts.published },
              { label: t("totalForms"), value: counts.total },
            ],
          }}
        />
      </div>

      {/* Forms list — solo se cargan formularios si hay sesión; sin autenticación permanece vacío */}
      <div className="mt-10">
        <FormsBrowser ref={listRef} filter={filter} onFilterChange={setFilter} onMutate={loadAll} publicOnly={false} />
      </div>
      <AuthRequiredModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
