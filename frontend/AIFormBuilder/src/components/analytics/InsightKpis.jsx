import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils.js";
import { CHART } from "../../lib/charts.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

/**
 * Tiles de KPI del bento de estadísticas (super_admin y entity_admin).
 * Extraído de `pages/Insights.jsx` para que AMBAS páginas de estadísticas
 * pinten exactamente los mismos KPIs con la misma alineación de texto:
 * una sola definición, sin duplicar el markup ni los tonos de serie.
 *
 * Cada KPI: { icon, label, value, delta?, sub?, accent }.
 * `delta` pinta la píldora semana; sin él, se muestra `sub`.
 */
export function InsightKpiGrid({ kpis = [] }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:col-span-5">
      {kpis.map((k, i) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="group relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_42px_-20px_rgba(16,24,40,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_32px_-14px_rgba(16,24,40,0.18)] dark:border-slate-800/60 dark:bg-slate-900"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-900/[0.06] to-transparent" />
          <div className="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-black/[0.02]" />
          <div
            className="pointer-events-none absolute -bottom-10 -right-10 h-24 w-24 rounded-full blur-2xl opacity-[0.07] group-hover:opacity-[0.11] transition-opacity"
            style={{ background: k.accent === "teal" ? CHART.teal : k.accent === "gold" ? CHART.gold : k.accent === "violet" ? CHART.violet : CHART.slate }}
          />
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl border text-[13px] shadow-sm backdrop-blur-sm",
              k.accent === "teal" && "border-teal-200/60 bg-teal-50 text-teal-700 dark:border-teal-800/30 dark:bg-teal-950/40 dark:text-teal-300",
              k.accent === "slate" && "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              k.accent === "gold" && "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-950/30",
              k.accent === "violet" && "border-violet-200/60 bg-violet-50 text-violet-700 dark:border-violet-800/30 dark:bg-violet-950/30"
            )}
          >
            <k.icon className="h-4.5 w-4.5" strokeWidth={1.9} />
          </span>
          <p className="mt-3.5 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">{k.label}</p>
          <p className="mt-1 font-mono text-[22px] font-black tracking-tight text-slate-900 dark:text-white">
            {k.value}
          </p>
          {k.delta != null ? (
            <p className={cn("mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", k.delta >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-600 dark:border-red-800/40 dark:bg-red-950/30")}>
              {k.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(k.delta)}% <span className="font-medium opacity-70">{t("thisWeek")}</span>
            </p>
          ) : (
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{k.sub}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
