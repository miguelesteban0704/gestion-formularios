import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "../../lib/utils.js";
import { StatTooltip } from "../ui/Card.jsx";
import { motion } from "framer-motion";

// `brand` es la única entrada que sigue a la marca; el resto son acentos
// fijos para distinguir series de datos y no deben cambiar con el tema.
//
// spark/sparkDark son CLASES, no colores: caen en atributos de presentación
// SVG (stroke, stopColor) donde var() no resuelve, así que el color tiene que
// llegar por una clase que Tailwind genere contra el token. Los <stop> van
// como propiedad arbitraria porque esta versión de Tailwind no trae
// utilidades stop-*.
const ACCENTS = {
  brand: { chip: "border-brand-200/60 bg-brand-50 text-brand-700 dark:border-brand-800/50 dark:bg-brand-950/50 dark:text-brand-300 dark:shadow-[var(--shadow-brand-glow)]", spark: "stroke-brand-600", sparkDark: "[stop-color:var(--color-brand-400)]", bar: "from-brand-400 to-brand-600", barGlow: "shadow-[var(--shadow-brand-glow)]", orb: "var(--color-brand-500)" },
  gold: { chip: "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300 dark:shadow-[0_0_20px_rgba(245,158,11,0.12)]", spark: "stroke-amber-600", sparkDark: "[stop-color:var(--color-amber-400)]", bar: "from-amber-400 to-amber-600", barGlow: "shadow-[0_0_10px_rgba(212,164,58,0.25)]", orb: "#f59e0b" },
  slate: { chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300", spark: "stroke-slate-500", sparkDark: "[stop-color:var(--color-slate-400)]", bar: "from-slate-400 to-slate-600", barGlow: "shadow-[0_0_10px_rgba(100,116,139,0.25)]", orb: "#64748b" },
  green: { chip: "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300 dark:shadow-[0_0_20px_rgba(16,185,129,0.12)]", spark: "stroke-emerald-600", sparkDark: "[stop-color:var(--color-emerald-400)]", bar: "from-emerald-400 to-teal-600", barGlow: "shadow-[0_0_10px_rgba(5,150,105,0.25)]", orb: "#10b981" },
  amber: { chip: "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-300", spark: "stroke-amber-600", sparkDark: "[stop-color:var(--color-amber-400)]", bar: "from-amber-400 to-amber-600", barGlow: "shadow-[0_0_10px_rgba(212,164,58,0.25)]", orb: "#f59e0b" },
  pink: { chip: "border-pink-200/60 bg-pink-50 text-pink-600 dark:border-pink-800/30 dark:bg-pink-950/30 dark:text-pink-300", spark: "stroke-pink-600", sparkDark: "[stop-color:var(--color-pink-400)]", bar: "from-pink-400 to-pink-600", barGlow: "shadow-[0_0_10px_rgba(219,39,119,0.25)]", orb: "#ec4899" },
  violet: { chip: "border-violet-200/60 bg-violet-50 text-violet-700 dark:border-violet-800/30 dark:bg-violet-950/30 dark:text-violet-300", spark: "stroke-violet-600", sparkDark: "[stop-color:var(--color-violet-400)]", bar: "from-violet-400 to-violet-600", barGlow: "shadow-[0_0_10px_rgba(124,108,192,0.25)]", orb: "#8b5cf6" },
};

/**
 * Premium KPI tile — light airy, dark ink neon with perfect contrast.
 */
export function KpiCard({ icon: Icon, label, value, sub, accent = "brand", spark, progress, tooltip }) {
  const a = ACCENTS[accent] || ACCENTS.brand;
  const sparkData = spark?.length > 1 ? spark : null;
  // we use CSS to handle spark color via media, but keep JS simple: use spark for both, dark will be slightly lighter via opacity

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      // `overflow-visible` y NO `overflow-hidden`: el tooltip de `StatTooltip`
      // sale por arriba de la tarjeta, y con `hidden` la tarjeta lo recortaba
      // entero — en Analytics los cinco KPIs tenían un tooltip que no se veía.
      // El recorte de las capas decorativas al radio de la tarjeta lo hace
      // ahora la capa `absolute inset-0` de abajo, que está justo para eso.
      className={cn(
        "group relative overflow-visible rounded-[22px] border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_42px_-20px_rgba(16,24,40,0.14)] backdrop-blur-xl transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-14px_rgba(16,24,40,0.16),0_22px_48px_-20px_rgba(16,24,40,0.16)] hover:border-slate-200",
        "dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_16px_48px_rgba(0,0,0,0.45),0_4px_16px_rgba(0,0,0,0.35)] dark:hover:border-slate-700 dark:hover:shadow-[0_20px_56px_rgba(0,0,0,0.55)]"
      )}
    >
      {/* Capa decorativa recortada al radio de la tarjeta. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-900/[0.06] to-transparent dark:via-white/[0.07]" />
        <div className="absolute inset-0 rounded-[22px] ring-1 ring-black/[0.02] dark:ring-white/[0.06]" />
        <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-white to-transparent opacity-60 dark:from-white/[0.04] dark:opacity-100" />
        <div className="absolute -right-14 -bottom-14 h-32 w-32 rounded-full blur-2xl opacity-[0.06] transition-opacity group-hover:opacity-[0.10] dark:opacity-[0.16] dark:group-hover:opacity-[0.24]" style={{ background: a.orb }} />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-[28px] font-black leading-none tracking-tight text-slate-900 dark:text-white [font-family:'Space_Grotesk',ui-monospace,monospace] dark:[text-shadow:0_0_24px_rgba(103,232,249,0.28)]">
            {value}
          </p>
          {sub && <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:scale-105", a.chip)}>
            <Icon className="h-5 w-5" strokeWidth={1.9} />
          </div>
        )}
      </div>

      {progress != null && (
        <div className="relative z-10 mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner dark:bg-slate-800 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className={cn("h-full rounded-full bg-gradient-to-r shadow-sm dark:shadow-[0_0_12px_rgba(255,255,255,0.08)]", a.bar, a.barGlow)}
          />
        </div>
      )}

      {sparkData && (
        <div className="relative z-10 mt-4 -mb-1 h-11">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={`spark-${accent}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopOpacity={0.32} className={a.spark} />
                  <stop offset="100%" stopOpacity={0} className={a.spark} />
                </linearGradient>
                <linearGradient id={`spark-${accent}-dark`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopOpacity={0.42} className={a.sparkDark || a.spark} />
                  <stop offset="100%" stopOpacity={0} className={a.sparkDark || a.spark} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="count"
                strokeWidth={2.2}
                fill={`url(#spark-${accent})`}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
                dot={false}
                activeDot={false}
                className={cn("dark:opacity-90", a.spark)}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <StatTooltip tooltip={tooltip} />
    </motion.div>
  );
}
