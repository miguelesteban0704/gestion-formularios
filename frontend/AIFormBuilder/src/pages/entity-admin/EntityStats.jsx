import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Inbox as InboxIcon,
  Eye,
  TrendingUp,
  Clock,
  Activity,
  Trophy,
  Sparkles,
  CalendarClock,
  MonitorSmartphone,
} from "lucide-react";
import { entityAdminApi } from "../../services/index.js";
import { ChartCard } from "../../components/analytics/ChartCard.jsx";
import PrismHeatmap from "../../components/analytics/PrismHeatmap.jsx";
import PrismAreaChart, { VolSeg } from "../../components/analytics/PrismAreaChart.jsx";
import PrismDonut from "../../components/analytics/PrismDonut.jsx";
import PrismTopForms from "../../components/analytics/PrismTopForms.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Skeleton, EmptyState } from "../../components/ui/Feedback.jsx";
import { ExportMenu } from "../../components/analytics/ExportMenu.jsx";
import { formatDuration } from "../../lib/utils.js";
import { InsightKpiGrid } from "../../components/analytics/InsightKpis.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { analyticsPath } from "../../lib/routes.js";
import { motion } from "framer-motion";
import { PageHeader } from "../Insights.jsx";

/**
 * Estadísticas de la entidad del `entity_admin`: LA MISMA página que las
 * estadísticas del super_admin (mismos KPIs, mismos charts, misma
 * alineación), alimentada con el agregado real de SUS formularios
 * (`GET /api/admin/entity-stats`, que ya devuelve la forma del panel:
 * stats, timeline, heatmap, devices, topForms). Solo cambian el título,
 * el subtítulo y el destino de las filas (analítica scopeada a su slug).
 */
export default function EntityStats() {
  const { t, language } = useLanguage();
  const rt = useRoleT();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const entitySlug = user?.entity?.code || "";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("Day");

  useEffect(() => {
    // Sin sesión todo vacío: no se carga ningún dato
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    entityAdminApi
      .entityStats()
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  const series = useMemo(
    () => bucketTimeline(data?.timeline || [], range),
    [data, range],
  );

  const responsesDelta = useMemo(() => {
    const tl = data?.timeline || [];
    const recent = tl.slice(-7).reduce((s, x) => s + x.count, 0);
    const prev = tl.slice(-14, -7).reduce((s, x) => s + x.count, 0);
    if (!prev) return recent ? 100 : 0;
    return Math.round(((recent - prev) / prev) * 100);
  }, [data]);

  if (loading) {
    return (
      <div className="animate-page-enter mx-auto max-w-7xl space-y-4 px-4 py-8 lg:px-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const devices = data?.devices || [];
  const topForms = data?.topForms || [];

  // hasData usa el conteo real del servidor (fuente única de verdad),
  // no el contador desnormalizado que podría estar desfasado.
  const totalFromTimeline = (data?.timeline || []).reduce((s, x) => s + x.count, 0);
  const hasData = (stats.totalResponses ?? 0) > 0 || totalFromTimeline > 0;

  const kpis = [
    {
      icon: InboxIcon,
      label: t("responses"),
      value: stats.totalResponses ?? 0,
      delta: responsesDelta,
      accent: "teal",
    },
    {
      icon: Eye,
      label: t("totalViews"),
      value: (stats.totalViews ?? 0).toLocaleString(),
      sub: `${t("across")} ${stats.totalForms ?? 0} ${t("forms")}`,
      accent: "slate",
    },
    {
      icon: TrendingUp,
      label: t("conversion"),
      value: `${stats.conversion ?? 0}%`,
      sub: `${t("of")} ${(stats.totalViews ?? 0).toLocaleString()} ${t("views")}`,
      accent: "gold",
    },
    {
      icon: Clock,
      label: t("time"),
      value: formatDuration(stats.avgCompletionTime),
      sub: `${t("per")} ${t("response").toLowerCase()}`,
      accent: "violet",
    },
  ];

  return (
    <div className="animate-page-enter mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <PageHeader
        icon={Sparkles}
        title={rt("entityStats")}
        subtitle={rt("entityStatsDesc")}
        right={<ExportMenu scope="overview" insights={data} />}
      />

      {!hasData ? (
        <Card className="mt-6">
          <EmptyState
            icon={Activity}
            title={t("noResponses")}
            description={t("trendsDescription")}
          />
        </Card>
      ) : (
        <>
          {/* Row 1: KPI cards + heatmap — premium bento */}
          <div className="mt-6 grid gap-5 lg:grid-cols-12">
            <InsightKpiGrid kpis={kpis} />

            <motion.div
              initial={{ y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7"
            >
              <ChartCard
                title={t("responsesByTime")}
                subtitle={t("whenSubmit")}
                icon={CalendarClock}
              >
                <PrismHeatmap data={data?.heatmap || []} />
              </ChartCard>
            </motion.div>
          </div>

          {/* Row 2: premium area + donut */}
          <div className="mt-5 grid gap-5 lg:grid-cols-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-8"
            >
              <ChartCard
                title={t("responseVolume")}
                subtitle={t("submissionsOverTime")}
                icon={Activity}
                right={<VolSeg value={range} onChange={setRange} />}
              >
                <PrismAreaChart data={series} />
              </ChartCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-4"
            >
              <ChartCard title={t("sessionsDevice")} subtitle={t("whereResponsesCome")} icon={MonitorSmartphone}>
                <PrismDonut data={devices} />
              </ChartCard>
            </motion.div>
          </div>

          {/* Formularios destacados — premium glass leaderboard */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <ChartCard className="mt-5" title={t("topForms")} subtitle={t("rankedResponses")} icon={Trophy}>
              <PrismTopForms
                data={topForms}
                total={stats.totalResponses || 0}
                onSelect={(f) => navigate(analyticsPath(language, String(f.id), entitySlug))}
              />
            </ChartCard>
          </motion.div>
        </>
      )}
    </div>
  );
}

/** Bucket a daily timeline into Day / Week / Month granularity. */
function bucketTimeline(timeline, gran) {
  if (!timeline.length) return [];
  if (gran === "Day") {
    return timeline.map((tl) => ({
      label: new Date(tl.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      count: tl.count,
    }));
  }
  const start = new Date(timeline[0].date);
  const groups = new Map();
  for (const tl of timeline) {
    const d = new Date(tl.date);
    let key;
    let label;
    if (gran === "Week") {
      const wk = Math.floor((d - start) / (7 * 86_400_000));
      key = `w${wk}`;
      label = `Wk ${wk + 1}`;
    } else {
      key = `${d.getFullYear()}-${d.getMonth()}`;
      label = d.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
    }
    const g = groups.get(key) || { label, count: 0 };
    g.count += tl.count;
    groups.set(key, g);
  }
  return [...groups.values()];
}
