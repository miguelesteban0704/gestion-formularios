import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useRealtimeResponses } from "../hooks/useRealtimeResponses.js";
import {
  Inbox,
  Eye,
  TrendingUp,
  CheckCircle2,
  Clock,
  BarChart3,
  Activity,
  Gauge as GaugeIcon,
  MonitorSmartphone,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { formApi, responseApi } from "../services/index.js";
import { FormPageHeader } from "../components/forms/FormPageHeader.jsx";
import { QuestionChart } from "../components/analytics/QuestionChart.jsx";
import { KpiCard } from "../components/analytics/KpiCard.jsx";
import { Funnel } from "../components/analytics/Funnel.jsx";
import { ChartCard } from "../components/analytics/ChartCard.jsx";
import PrismVolumeChart from "../components/analytics/PrismVolumeChart.jsx";
import PrismDonut from "../components/analytics/PrismDonut.jsx";
import PrismGauge from "../components/analytics/PrismGauge.jsx";
import PrismColumnBars from "../components/analytics/PrismColumnBars.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Skeleton, EmptyState } from "../components/ui/Feedback.jsx";
import { RespondentCard } from "../components/responses/RespondentCard.jsx";
import { ExportMenu } from "../components/analytics/ExportMenu.jsx";
import { formatDuration, cn } from "../lib/utils.js";
import { CHART, deviceFromUA } from "../lib/charts.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Analytics() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [form, setForm] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const a = await responseApi.analytics(id);
      setAnalytics(a);
    } catch (e) {
      const status = e?.response?.status || e?.status;
      if (status === 429) return;
      if (!e?.message?.includes("401")) toast.error(e.message);
    }
  }, [id]);

  const fetchResponses = useCallback(async () => {
    try {
      const r = await responseApi.list(id);
      setResponses(r.responses || []);
    } catch (e) {
      if (e?.response?.status === 429 || e?.status === 429) return;
    }
  }, [id]);

  useEffect(() => {
    Promise.all([formApi.get(id), responseApi.analytics(id), responseApi.list(id)])
      .then(([f, a, r]) => {
        setForm(f);
        setAnalytics(a);
        setResponses(r.responses || []);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const lastAnalyticsUpdate = useRef(0);
  useRealtimeResponses(id, {
    onCreated: () => {
      const now = Date.now();
      if (now - lastAnalyticsUpdate.current < 900) return;
      lastAnalyticsUpdate.current = now;
      fetchResponses();
      fetchAnalytics();
    },
    onDeleted: () => {
      fetchResponses();
      fetchAnalytics();
    },
  });

  useEffect(() => {
    if (!id) return;
    const iv = setInterval(() => {
      fetchResponses();
      fetchAnalytics();
    }, 7000);
    return () => clearInterval(iv);
  }, [id, fetchResponses, fetchAnalytics]);

  const stats = analytics?.stats || {};

  // Daily series + running cumulative.
  const timeline = useMemo(() => {
    let run = 0;
    return (analytics?.timeline || []).map((t) => {
      run += t.count;
      return {
        ...t,
        day: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        cumulative: run,
      };
    });
  }, [analytics]);

  // Submissions by weekday.
  const weekday = useMemo(() => {
    const counts = Array(7).fill(0);
    (analytics?.timeline || []).forEach((t) => {
      counts[new Date(t.date).getDay()] += t.count;
    });
    return [1, 2, 3, 4, 5, 6, 0].map((i) => ({ day: WD[i], count: counts[i] }));
  }, [analytics]);

  // Device breakdown from response user-agents.
  const devices = useMemo(() => {
    const counts = {};
    responses.forEach((r) => {
      const { browser } = deviceFromUA(r.meta?.userAgent || "");
      counts[browser] = (counts[browser] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [responses]);

  // Identidades verificadas por el IDP (una por `sub`, sin repetir encuestado).
  const idpRespondents = useMemo(() => {
    const seen = new Map();
    responses.forEach((r) => {
      if (r.respondentSub && !seen.has(r.respondentSub)) seen.set(r.respondentSub, r);
    });
    return [...seen.values()];
  }, [responses]);

  if (loading) {
    return (
      <div className="animate-page-enter">
        <div className="h-32 border-b border-default bg-surface" />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 lg:px-8">
          <Skeleton className="h-24" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const questions = analytics?.questions || [];
  const hasData = stats.totalResponses > 0;
  const answerableQuestions = (form?.questions || []).filter(
    (question) => !["section", "heading", "paragraph", "image"].includes(question.type)
  ).length;

  return (
    <div className="animate-page-enter min-h-full bg-app">
      <FormPageHeader form={form} right={<ExportMenu scope="form" form={form} analytics={analytics} />} />

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold tracking-wide text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> En vivo • {stats.totalResponses ?? 0} respuestas exactas
          </span>
          <span className="text-xs text-muted">Actualización automática al recibir nuevas respuestas</span>
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
          <KpiCard icon={Inbox} label={t("responses")} value={stats.totalResponses ?? 0} accent="brand" spark={timeline} tooltip={{
            title: t("responsesTooltipTitle"), description: t("responsesTooltipDescription"),
            items: [{ label: t("responseConversionResponses"), value: stats.totalResponses ?? 0 }],
          }} />
          <KpiCard icon={Eye} label={t("totalViews")} value={stats.views ?? 0} accent="slate" tooltip={{
            title: t("viewsTooltipTitle"), description: t("viewsTooltipDescription"),
            items: [{ label: t("responseConversionViews"), value: stats.views ?? 0 }],
          }} />
          <KpiCard icon={TrendingUp} label={t("responseConversionRate")} value={`${stats.conversionRate ?? 0}%`} accent="gold" progress={stats.conversionRate} tooltip={{
            title: t("responseConversionTooltipTitle"), description: t("responseConversionTooltipDescription"),
            items: [
              { label: t("responseConversionResponses"), value: stats.totalResponses ?? 0 },
              { label: t("responseConversionViews"), value: stats.views ?? 0 },
              { label: t("responseConversionFormula"), value: stats.views ? `${stats.totalResponses} / ${stats.views} x 100` : t("responseConversionNoViews") },
              { label: t("responseConversionResult"), value: `${stats.conversionRate ?? 0}%` },
            ],
          }} />
          <KpiCard icon={CheckCircle2} label={t("completion")} value={`${stats.completionRate ?? 0}%`} accent="green" progress={stats.completionRate} tooltip={{
            title: t("completionTooltipTitle"), description: t("completionTooltipDescription"),
            items: [
              { label: t("responseConversionResponses"), value: stats.totalResponses ?? 0 },
              { label: t("completionQuestions"), value: answerableQuestions },
              { label: t("responseConversionResult"), value: `${stats.completionRate ?? 0}%` },
            ],
          }} />
          <KpiCard icon={Clock} label={t("time")} value={formatDuration(stats.avgCompletionTime)} accent="slate" tooltip={{
            title: t("timeTooltipTitle"), description: t("timeTooltipDescription"),
            items: [
              { label: t("responseConversionResponses"), value: stats.totalResponses ?? 0 },
              { label: t("averageTime"), value: formatDuration(stats.avgCompletionTime) },
            ],
          }} />
        </div>

        {!hasData ? (
          <Card className="mt-6">
            <EmptyState
              icon={BarChart3}
              title={t("noAnalytics")}
              description={t("trendsDescription")}
            />
          </Card>
        ) : (
          <>
            {/* Bento row 1: timeline + completion gauge */}
            <div className="mt-5 grid gap-5 lg:grid-cols-12">
              <ChartCard
                className="lg:col-span-8"
                title={t("responseVolume")}
                subtitle={t("dailySubmissions")}
                icon={Activity}
                right={
                  <div className="hidden items-center gap-2 sm:flex">
                    <Legend color={CHART.teal} label={t("daily")} />
                    <Legend color={CHART.gold} label={t("cumulative")} />
                  </div>
                }
              >
                <PrismVolumeChart data={timeline} />
              </ChartCard>

              <ChartCard className="lg:col-span-4" title={t("completionRate")} subtitle={t("avgAnswered")} icon={GaugeIcon} bodyClass="flex flex-col justify-center">
                <PrismGauge value={stats.completionRate ?? 0} label={t("completed")} />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 text-center">
                  <MiniStat label={t("time")} value={formatDuration(stats.avgCompletionTime)} />
                  <MiniStat label={t("conversion")} value={`${stats.conversionRate ?? 0}%`} />
                </div>
              </ChartCard>
            </div>

            {/* Bento row 2: funnel + device + weekday */}
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <Funnel views={stats.views} responses={stats.totalResponses} completionRate={stats.completionRate} />

              <ChartCard title={t("devices")} subtitle={t("browserUsed")} icon={MonitorSmartphone}>
                {devices.length ? (
                  <PrismDonut data={devices} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted">{t("noDeviceData")}</p>
                )}
              </ChartCard>

              <ChartCard title={t("busiestDays")} subtitle={t("submissionsWeekday")} icon={CalendarDays}>
                <PrismColumnBars data={weekday} />
              </ChartCard>
            </div>

            {/* Encuestados verificados por el IDP (solo formularios privados) */}
            {idpRespondents.length > 0 && (
              <section className="mt-9">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-fg">{t("idpRespondents")}</h2>
                    <p className="text-sm text-muted">{t("idpRespondentsSubtitle")}</p>
                  </div>
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">{idpRespondents.length}</span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {idpRespondents.map((r) => (
                    <RespondentCard key={r._id} response={r} />
                  ))}
                </div>
              </section>
            )}

            {/* Per-question */}
            <div className="mb-3 mt-9 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-fg">{t("questionBreakdown")}</h2>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{questions.length}</span>
            </div>
            {questions.length === 0 ? (
              <p className="text-sm text-muted">{t("noAnswerableQuestions")}</p>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {questions.map((q) => (
                  <QuestionChart key={q.id} question={q} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1 text-[11px] font-bold tracking-wide text-slate-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </span>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-default bg-surface-2/60 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-base font-bold tabular-nums text-fg [font-family:'Space_Grotesk',ui-monospace,monospace] dark:[text-shadow:0_0_16px_rgba(103,232,249,0.3)]">
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}
