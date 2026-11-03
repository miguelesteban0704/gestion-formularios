import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useRealtimeResponses } from "../hooks/useRealtimeResponses.js";
import {
  Search,
  Trash2,
  Inbox,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Monitor,
  ArrowUpRight,
} from "lucide-react";
import { formApi, responseApi } from "../services/index.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { FormPageHeader } from "../components/forms/FormPageHeader.jsx";
import { KpiCard } from "../components/analytics/KpiCard.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Skeleton, EmptyState } from "../components/ui/Feedback.jsx";
import { ConfirmModal } from "../components/ui/Modal.tsx";
import { Drawer } from "../components/ui/Drawer.jsx";
import { DownloadDoneIcon } from "../components/ui/animated-state-icons";
import { formatDate, formatDuration, downloadBlob } from "../lib/utils.js";
import { isStatic } from "../lib/fieldTypes.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function Responses() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [active, setActive] = useState(null); // response shown in the drawer
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const exportTimer = useRef(null);

  useEffect(() => () => clearTimeout(exportTimer.current), []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const a = await responseApi.analytics(id);
      setAnalytics(a);
    } catch (e) {
      const status = e?.response?.status || e?.status;
      if (status === 429) return; // rate limit — reintento silencioso en próximo poll
      if (!e?.message?.includes("401")) toast.error(e.message);
    }
  }, [id]);

  const fetchResponses = useCallback(async () => {
    try {
      const data = await responseApi.list(id, { search });
      setResponses(data.responses);
    } catch (e) {
      if (e?.response?.status === 429 || e?.status === 429) return;
    }
  }, [id, search]);

  useEffect(() => {
    Promise.all([formApi.get(id), responseApi.analytics(id)])
      .then(([f, a]) => {
        setForm(f);
        setAnalytics(a);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  // Tiempo real con exactitud: SSE + fallback polling 5s, reconexión automática
  const lastUpdateRef = useRef(0);
  useRealtimeResponses(id, {
    onCreated: () => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 900) return; // debounce ráfagas
      lastUpdateRef.current = now;
      fetchResponses();
      fetchAnalytics();
    },
    onDeleted: () => {
      fetchResponses();
      fetchAnalytics();
    },
  });

  // Fallback polling adicional por si SSE cae y el hook no reconectó a tiempo (cada 7s)
  useEffect(() => {
    if (!id) return;
    const iv = setInterval(() => {
      fetchResponses();
      fetchAnalytics();
    }, 7000);
    return () => clearInterval(iv);
  }, [id, fetchResponses, fetchAnalytics]);

  const answerable = useMemo(
    () => (form?.questions || []).filter((q) => !isStatic(q.type)),
    [form]
  );
  // Identity columns for the respondent cell.
  const nameQ = useMemo(() => answerable.find((q) => q.type === "short_text"), [answerable]);
  const emailQ = useMemo(() => answerable.find((q) => q.type === "email"), [answerable]);
  const extraCols = useMemo(
    () => answerable.filter((q) => q !== nameQ && q !== emailQ).slice(0, 2),
    [answerable, nameQ, emailQ]
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await responseApi.exportCsv(id);
      downloadBlob(csv, `${form.title.replace(/\s+/g, "_")}_responses.csv`, "text/csv");
      // El botón se confirma en sí mismo, no solo con el toast: la flecha
      // cae en la bandeja y se dibuja el tick.
      setExported(true);
      clearTimeout(exportTimer.current);
      exportTimer.current = setTimeout(() => setExported(false), 1800);
      toast.success(t("csvExported"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    const target = toDelete;
    if (!target) return;
    setDeleting(true);
    setActive((a) => (a?._id === target._id ? null : a));
    setResponses((prev) => prev.filter((r) => r._id !== target._id));
    try {
      await responseApi.remove(target._id);
      toast.success(t("responseDeleted"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const identity = (r) => {
    const byId = new Map(r.answers.map((a) => [a.questionId, a.value]));
    const name = nameQ && byId.get(nameQ.id);
    const email = emailQ && byId.get(emailQ.id);
    return { name: name || "Anonymous", email: email || "", byId };
  };

  if (loading) {
    return (
      <div className="animate-page-enter">
        <div className="h-32 border-b border-default bg-surface" />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 lg:px-8">
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const stats = analytics?.stats || {};

  return (
    <div className="animate-page-enter min-h-full bg-app">
      <FormPageHeader
        form={form}
        right={
          <Button size="sm" onClick={handleExport} loading={exporting} disabled={!responses.length}>
            {/* Durante la carga el Button ya pone su spinner: mostrar a la vez la
                flecha era un icono duplicado. Fuera de la carga, el tick confirma. */}
            {exporting ? null : <DownloadDoneIcon active={exported} size={16} strokeWidth={3.4} />}
            <span className="hidden sm:inline">{t("exportCSV")}</span>
          </Button>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
          <KpiCard icon={Inbox} label={t("responses")} value={stats.totalResponses ?? 0} accent="brand" />
          <KpiCard icon={Eye} label={t("totalViews")} value={stats.views ?? 0} accent="amber" />
          <KpiCard icon={TrendingUp} label={t("conversion")} value={`${stats.conversionRate ?? 0}%`} accent="pink" progress={stats.conversionRate} />
          <KpiCard icon={CheckCircle2} label={t("completion")} value={`${stats.completionRate ?? 0}%`} accent="green" progress={stats.completionRate} />
          <KpiCard icon={Clock} label={t("time")} value={formatDuration(stats.avgCompletionTime)} accent="violet" />
        </div>

        {/* Table card — tiempo real con exactitud */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-default bg-surface shadow-soft">
          <div className="flex flex-col gap-3 border-b border-default p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
                {t("allResponses")}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> En vivo
                </span>
              </h2>
              <p className="text-xs text-muted">{responses.length} {t("shown")} • {t("total")} {stats.totalResponses ?? responses.length} • exactitud total</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("searchResponses")}
                className="h-9 pl-9"
              />
            </div>
          </div>

          {responses.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={searchInput ? t("noMatchingResponses") : t("noResponsesYet")}
              description={
                searchInput
                  ? t("searchFormsHint")
                  : t("shareToCollect")
              }
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="border-b border-default text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{t("respondents")}</th>
                    {extraCols.map((c) => (
                      <th key={c.id} className="hidden px-4 py-3 font-semibold lg:table-cell">
                        {c.label}
                      </th>
                    ))}
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t("submitted")}</th>
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t("time")}</th>
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r) => {
                    const { name, email, byId } = identity(r);
                    return (
                      <tr
                        key={r._id}
                        onClick={() => setActive(r)}
                        className="group cursor-pointer border-b border-default transition-colors last:border-0 hover:bg-surface-2"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-fg">{name}</p>
                              {email && <p className="truncate text-xs text-muted">{email}</p>}
                            </div>
                          </div>
                        </td>
                        {extraCols.map((c) => (
                          <td key={c.id} className="hidden max-w-[12rem] truncate px-4 py-3 text-muted lg:table-cell">
                            {formatValue(byId.get(c.id)) || "—"}
                          </td>
                        ))}
                        <td className="hidden whitespace-nowrap px-4 py-3 text-muted sm:table-cell">
                          {formatDate(r.submittedAt)}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-muted sm:table-cell">
                          {formatDuration(r.completionTime)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-muted opacity-0 transition group-hover:opacity-100">
                              <ArrowUpRight className="h-4 w-4" />
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setToDelete(r);
                              }}
                              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? identity(active).name : t("response")}
        subtitle={active ? identity(active).email || t("anonymousRespondent") : ""}
        footer={
          active && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">
                {active.answers.length} {t("of")} {answerable.length} {t("answered")}
              </span>
              <Button variant="danger" size="sm" onClick={() => setToDelete(active)}>
                <Trash2 className="h-4 w-4" /> {t("delete")}
              </Button>
            </div>
          )
        }
      >
        {active && <ResponseDetail response={active} questions={answerable} />}
      </Drawer>

      <ConfirmModal
        open={!!toDelete}
        loading={deleting}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={handleDelete}
        title={t("deleteResponseQuestion")}
        description={t("responseRemoved")}
        confirmText={t("delete")}
        danger
      />
    </div>
  );
}

function ResponseDetail({ response, questions }) {
  const { t } = useLanguage();
  const byId = new Map(response.answers.map((a) => [a.questionId, a.value]));
  return (
    <div className="space-y-5">
      {/* Meta */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetaTile icon={Calendar} label={t("submitted")} value={formatDate(response.submittedAt)} />
        <MetaTile icon={Clock} label={t("completion")} value={formatDuration(response.completionTime)} />
      </div>
      {response.meta?.userAgent && (
        <MetaTile icon={Monitor} label={t("device")} value={shortUA(response.meta.userAgent)} wide />
      )}

      {/* Answers */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("answers")}</p>
        {questions.map((q) => {
          const val = formatValue(byId.get(q.id));
          return (
            <div key={q.id} className="rounded-xl border border-default bg-surface-2/50 p-3.5">
              <p className="text-xs font-medium text-muted">{q.label}</p>
              <p className="mt-1 text-sm text-fg">{val || <span className="text-muted/70">{t("noAnswer")}</span>}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetaTile({ icon: Icon, label, value, wide }) {
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

function shortUA(ua) {
  const m = ua.match(/(Chrome|Firefox|Safari|Edg|Edge|Opera)[/ ]?([\d.]+)?/);
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return [m?.[1], os].filter(Boolean).join(" · ") || "Unknown";
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
