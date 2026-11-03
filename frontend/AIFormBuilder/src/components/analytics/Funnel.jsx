import { Eye, MousePointerClick, CheckCircle2, Filter, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { ChartCard } from "./ChartCard.jsx";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismBars.css";

/* Paletas por etapa — mismo lenguaje Prism (glass + glossy) */
const STAGE_PALS = {
  views: { light: "#94a3b8", base: "#64748b", deep: "#334155" },
  responses: { light: "#ffd687", base: "#ffb84d", deep: "#d97706" },
  completed: { light: "#67e8f9", base: "#06b6d4", deep: "#0e7490" },
};

/**
 * Embudo de conversión: Views → Responses → Completed.
 * Filas de vidrio con barra degradada glossy y píldora de % — la barra
 * mide EXACTAMENTE el % mostrado (regla Prism). Drop-off con chips
 * semánticos de vidrio entre etapas.
 */
export function Funnel({ views = 0, responses = 0, completionRate = 0 }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const completed = Math.round((responses * completionRate) / 100);
  const max = Math.max(views, 1);

  const stages = [
    { label: t("totalViews"), value: views, icon: Eye, pal: STAGE_PALS.views },
    { label: t("responses"), value: responses, icon: MousePointerClick, pal: STAGE_PALS.responses },
    { label: t("completed"), value: completed, icon: CheckCircle2, pal: STAGE_PALS.completed },
  ];

  return (
    <ChartCard title={t("conversionFunnel")} subtitle={t("funnelDescription")} icon={Filter}>
      <div className={cn("pb-list", isDark ? "pb-dark" : "pb-light")}>
        {stages.map((s, i) => {
          const pct = Math.round((s.value / max) * 100);
          const prev = i > 0 ? stages[i - 1].value : null;
          const dropPct = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
          const isGood = dropPct != null && dropPct >= 50;

          return (
            <div key={s.label}>
              {/* drop-off connector entre etapas */}
              {i > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-2 ml-1 flex items-center gap-2"
                >
                  <div className="h-5 w-px rounded-full bg-slate-200 dark:bg-slate-700" />
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide shadow-sm backdrop-blur-sm",
                      isGood
                        ? "border-emerald-200/70 bg-emerald-50/90 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-[0_0_14px_rgba(16,185,129,0.18)]"
                        : "border-red-200/70 bg-red-50/90 text-red-600 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-400 dark:shadow-[0_0_14px_rgba(239,68,68,0.18)]",
                    )}
                  >
                    {isGood ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {dropPct}% {t("retained")}
                  </span>
                </motion.div>
              )}

              {/* fila glass Prism */}
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 2 }}
                className="pb-row"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${s.pal.base}66`;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${s.pal.base}40, 0 0 28px -8px ${s.pal.base}99`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border shadow-sm backdrop-blur-sm"
                  style={{
                    color: s.pal.light,
                    borderColor: `${s.pal.base}55`,
                    background: `linear-gradient(160deg, ${s.pal.base}2e, ${s.pal.base}14)`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 14px ${s.pal.base}30`,
                  }}
                >
                  <s.icon className="h-4 w-4" strokeWidth={1.9} />
                </span>

                <span className="pb-name">{s.label}</span>

                <span className="pb-track" aria-hidden="true">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, 3)}%` }}
                    transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.1 }}
                    className="pb-fill"
                    style={{
                      background: `linear-gradient(90deg, ${s.pal.deep}, ${s.pal.base} 55%, ${s.pal.light})`,
                      boxShadow: `0 0 10px ${s.pal.base}55`,
                    }}
                  />
                </span>

                <span className="pb-count">{s.value.toLocaleString()}</span>
                <span
                  className="pb-pill"
                  style={{
                    borderColor: `${s.pal.base}55`,
                    color: s.pal.light,
                    textShadow: `0 0 8px ${s.pal.base}88`,
                  }}
                >
                  {pct}%
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}