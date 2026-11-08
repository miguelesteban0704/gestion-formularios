import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Inbox as InboxIcon, Search, Calendar, Clock, Monitor, ExternalLink, ShieldCheck } from "lucide-react";
import { insightsApi } from "../services/index.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { PageHeader } from "./Insights.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Badge, Skeleton, EmptyState } from "../components/ui/Feedback.jsx";
import { Drawer } from "../components/ui/Drawer.jsx";
import { Button } from "../components/ui/Button.jsx";
import { RespondentCard } from "../components/responses/RespondentCard.jsx";
import { timeAgo, formatDate, formatDuration } from "../lib/utils.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { responsesPath } from "../lib/routes.js";

export default function Inbox() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [formFilter, setFormFilter] = useState("all");
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setResponses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    insightsApi
      .inbox({ search })
      .then((d) => setResponses(d.responses))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [search, isAuthenticated, authLoading]);

  // Limpieza inmediata al cerrar sesión
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setResponses([]);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const forms = useMemo(() => {
    const map = new Map();
    responses.forEach((r) => map.set(r.formId, { id: r.formId, title: r.formTitle, color: r.formColor }));
    return [...map.values()];
  }, [responses]);

  const shown = useMemo(
    () => (formFilter === "all" ? responses : responses.filter((r) => r.formId === formFilter)),
    [responses, formFilter]
  );

  const primaryAnswer = (r) => {
    const named = r.answers.find((a) => a.type === "short_text" && a.value);
    const emailed = r.answers.find((a) => a.type === "email" && a.value);
    // Si la respuesta pasó por el IDP (formulario privado), la identidad
    // verificada manda sobre lo que el encuestado escribiera en los campos.
    const idp = !r.isAnonymous && r.respondentSub;
    const name = (idp && r.respondentName) || named?.value || t("anonymous");
    const email = (idp && r.respondentEmail) || emailed?.value || "";
    const snippet = r.answers
      .filter((a) => !["short_text", "email"].includes(a.type))
      .map((a) => (Array.isArray(a.value) ? a.value.join(", ") : a.value))
      .filter(Boolean)
      .join(" · ");
    return { name: String(name), email: String(email), snippet: String(snippet).slice(0, 90) };
  };

  return (
    <div className="animate-page-enter mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <PageHeader icon={InboxIcon} title={t("inbox")} subtitle={t("recentResponses")} />

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={formFilter === "all"} onClick={() => setFormFilter("all")}>
            {t("allFormsFilter")}
          </FilterChip>
          {forms.slice(0, 6).map((f) => (
            <FilterChip key={f.id} active={formFilter === f.id} onClick={() => setFormFilter(f.id)} color={f.color}>
              {f.title}
            </FilterChip>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("searchResponses")} className="h-9 pl-9" />
        </div>
      </div>

      {/* Feed */}
      <div className="mt-4 space-y-2.5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : shown.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title={searchInput ? t("noMatchingResponses") : t("inboxEmpty")}
            description={searchInput ? t("searchFormsHint") : t("responsesWillAppear")}
          />
        ) : (
          shown.map((r) => {
            const { name, email, snippet } = primaryAnswer(r);
            return (
              <button
                key={r._id}
                onClick={() => setActive(r)}
                className="group flex w-full items-center gap-4 rounded-lg border border-default bg-surface p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <Avatar name={name} color={r.formColor} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-fg">{name}</p>
                    {!r.isAnonymous && r.respondentSub && (
                      <span
                        role="img"
                        aria-label={t("idpVerified")}
                        title={t("idpVerified")}
                        className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"
                      >
                        <ShieldCheck className="h-3 w-3" strokeWidth={2.2} />
                      </span>
                    )}
                    <Badge variant="brand">{r.formTitle}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">{email || snippet || t("noAnswers")}</p>
                </div>
                <span className="hidden whitespace-nowrap text-xs text-muted sm:block">{timeAgo(r.submittedAt)}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Detail drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? primaryAnswer(active).name : t("response")}
        subtitle={active?.formTitle}
        footer={
          active && (
            <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate(responsesPath(language, active.formId))}>
              <ExternalLink className="h-4 w-4" /> {t("openInForm")}
            </Button>
          )
        }
      >
        {active && (
          <div className="space-y-5">
            {!active.isAnonymous && active.respondentSub && <RespondentCard response={active} />}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Meta icon={Calendar} label={t("submitted")} value={formatDate(active.submittedAt)} />
              <Meta icon={Clock} label={t("completion")} value={formatDuration(active.completionTime)} />
            </div>
            {active.meta?.userAgent && <Meta icon={Monitor} label={t("device")} value={device(active.meta.userAgent)} wide />}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("answers")}</p>
              {active.answers.map((a, i) => (
                <div key={i} className="rounded-xl border border-default bg-surface-2/50 p-3.5">
                  <p className="text-xs font-medium text-muted">{a.label}</p>
                  <p className="mt-1 text-sm text-fg">{Array.isArray(a.value) ? a.value.join(", ") : String(a.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function FilterChip({ active, onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
        (active ? "bg-brand-600 text-on-brand-600 shadow-soft" : "border border-default text-muted hover:text-fg")
      }
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: active ? "#fff" : color }} />}
      <span className="max-w-[10rem] truncate">{children}</span>
    </button>
  );
}

function Meta({ icon: Icon, label, value, wide }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="flex items-center gap-2.5 rounded-xl border border-default bg-surface-2/50 p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted">{label}</p>
          <p className="truncate text-sm font-medium text-fg">{value}</p>
        </div>
      </div>
    </div>
  );
}

function device(ua) {
  const b = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return [b, os].filter(Boolean).join(" · ");
}
