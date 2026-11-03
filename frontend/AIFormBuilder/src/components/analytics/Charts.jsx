import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { CHART, CHART_PALETTE, tooltipStyle } from "../../lib/charts.js";
import { shade, hexToRgba } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { motion } from "framer-motion";
import { FuturisticTooltip } from "./FuturisticTooltip.jsx";

/**
 * Tooltip para donuts/pie — sólido, con cuerpo, sin transparencias.
 * Detecta dark mode en runtime para cambiar el fondo correctamente.
 */
export function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const color = item.payload?.fill || item.color || "#0e9384";
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div
      style={{
        background: isDark
          ? "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)"
          : "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
        border: `2px solid ${isDark ? "#334155" : "#e2e8f0"}`,
        borderRadius: 18,
        padding: "14px 18px",
        minWidth: 148,
        boxShadow: isDark
          ? `0 0 0 1px rgba(255,255,255,0.06) inset, 0 24px 56px rgba(0,0,0,0.72), 0 0 24px ${color}44`
          : `0 0 0 1px rgba(255,255,255,0.9) inset, 0 20px 48px rgba(16,24,40,0.22), 0 0 20px ${color}28`,
        position: "relative",
      }}
    >
      {/* Banda de color accent en el top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 16,
          right: 16,
          height: 3,
          borderRadius: "0 0 4px 4px",
          background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)`,
        }}
      />

      {/* Etiqueta */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: isDark ? "#94a3b8" : "#64748b",
          marginBottom: 10,
          marginTop: 4,
        }}
      >
        {item.name || item.payload?.label}
      </p>

      {/* Valor */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
            boxShadow: `0 0 14px ${color}cc`,
            border: `2px solid ${isDark ? "#1e293b" : "#fff"}`,
          }}
        />
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 900,
            fontSize: 22,
            lineHeight: 1,
            color: isDark ? "#f1f5f9" : "#0f172a",
            letterSpacing: "-0.02em",
          }}
        >
          {item.value}
        </span>
      </div>
    </div>
  );
}

const HEAT_HOURS = ["12a", "", "4a", "", "8a", "", "12p", "", "4p", "", "8p", ""];

/** Premium heatmap — staggered reveal, glass cells, hover lift + glow. */
export function Heatmap({ data = [], color = CHART.teal }) {
  const { t } = useLanguage();
  const heatDays = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")];
  const matrix = Array.from({ length: 7 }, () => Array(12).fill(0));
  data.forEach(({ day, hour, count }) => {
    if (day >= 0 && day < 7) matrix[day][Math.floor(hour / 2)] += count;
  });
  const max = Math.max(1, ...matrix.flat());

  return (
    <div className="relative">
      <div className="space-y-1.5">
        {matrix.map((row, d) => (
          <div key={d} className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              {heatDays[d]}
            </span>
            {row.map((c, h) => {
              const intensity = max ? c / max : 0;
              const bg = c
                ? hexToRgba(color, 0.14 + 0.78 * intensity)
                : "rgba(248,250,252,1)";
              const glow = c ? `0 2px 10px ${hexToRgba(color, 0.18 * intensity)}, 0 0 0 1px ${hexToRgba(color, 0.08 * intensity)} inset` : "0 0 0 1px rgba(226,232,240,0.7) inset";
              return (
                <motion.div
                  key={h}
                  initial={{ opacity: 0, scale: 0.86, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                    delay: (d * 12 + h) * 0.016,
                  }}
                  title={`${heatDays[d]} ${h * 2}:00 — ${c} ${t("responses").toLowerCase()}`}
                  className="group/cell relative h-[26px] flex-1 cursor-pointer overflow-hidden rounded-[8px] border border-white/50 shadow-sm backdrop-blur-sm transition-all duration-300 hover:z-10 hover:scale-[1.08] hover:shadow-md hover:brightness-[1.08] dark:border-white/10"
                  style={{
                    background: bg,
                    boxShadow: glow,
                  }}
                >
                  {/* inner highlight when populated */}
                  {c > 0 && (
                    <span className="pointer-events-none absolute inset-0 rounded-[8px] bg-gradient-to-b from-white/30 to-transparent opacity-60" />
                  )}
                  {/* hover rim */}
                  <span className="pointer-events-none absolute inset-0 rounded-[8px] ring-1 ring-black/[0.04] group-hover/cell:ring-black/10 dark:ring-white/10" />
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex gap-1.5 pl-[2.6rem]">
        {HEAT_HOURS.map((h, i) => (
          <span key={i} className="flex-1 text-center font-mono text-[9px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
            {h}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
        <span className="text-slate-400">{t("less")}</span>
        <div className="flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/50">
          {[0.14, 0.38, 0.66, 0.92].map((o) => (
            <span key={o} className="h-3 w-5 rounded-md border border-white/60 shadow-sm" style={{ background: hexToRgba(color, o) }} />
          ))}
        </div>
        <span className="text-slate-600 dark:text-slate-300">{t("more")}</span>
      </div>
    </div>
  );
}

/** Premium holographic gauge — conic aura, animated arc, crisp numerals. */
export function Gauge({ value = 0, suffix = "%", label, from = "#2ec4b6", to = "#0e9384" }) {
  const pct = Math.min(100, Math.max(0, value)) / 100;
  const R = 82;
  const cx = 100;
  const cy = 96;
  const sw = 16;
  const circ = Math.PI * R;
  const arc = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;

  return (
    <div className="relative mx-auto flex w-full max-w-[230px] flex-col items-center justify-center">
      {/* aura */}
      <div className="pointer-events-none absolute inset-0 rounded-full bg-teal-500/10 blur-2xl dark:bg-teal-400/10" />
      <div className="pointer-events-none absolute left-1/2 top-6 h-20 w-32 -translate-x-1/2 rounded-full bg-amber-400/10 blur-2xl dark:bg-amber-300/10" />

      <svg viewBox="0 0 200 116" className="relative z-10 w-full drop-shadow-[0_6px_18px_rgba(14,147,132,0.18)]">
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 0" />
          </filter>
        </defs>
        {/* track */}
        <path d={arc} fill="none" stroke="rgba(241,245,249,1)" strokeWidth={sw} strokeLinecap="round" className="dark:stroke-slate-800" />
        {/* glow underlay */}
        <path
          d={arc}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          opacity="0.32"
          style={{ filter: "url(#gauge-glow)", transition: "stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)" }}
        />
        {/* crisp arc */}
        <path
          d={arc}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)" }}
        />
        {/* cap dot */}
        {pct > 0.02 && (
          <circle
            r="4.5"
            fill="white"
            stroke={to}
            strokeWidth="2.2"
            style={{
              offsetPath: `path('${arc}')`,
              offsetDistance: `${pct * 100}%`,
              transition: "offset-distance 1.1s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        )}
      </svg>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-0 bottom-1 z-10 text-center"
      >
        <p className="font-mono text-[30px] font-black tracking-tighter text-slate-900 dark:text-white">
          {Math.round(value)}
          <span className="ml-0.5 text-[16px] font-bold text-teal-600 dark:text-teal-400">{suffix}</span>
        </p>
        {label && <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>}
      </motion.div>
    </div>
  );
}

/** Premium donut — gradient segments, soft shadow, animated entrance, glass legend. */
export function Donut({ data, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[170px] w-[170px] shrink-0">
        <div className="pointer-events-none absolute inset-4 rounded-full bg-teal-500/[0.06] blur-xl dark:bg-teal-400/[0.08]" />
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((_, i) => {
                const base = CHART_PALETTE[i % CHART_PALETTE.length];
                return (
                  <linearGradient key={i} id={`donut-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={shade(base, 18)} />
                    <stop offset="100%" stopColor={shade(base, -14)} />
                  </linearGradient>
                );
              })}
              <filter id="donut-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="10" floodOpacity="0.12" />
              </filter>
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={78}
              paddingAngle={3}
              cornerRadius={10}
              stroke="white"
              strokeWidth={2}
              className="dark:stroke-slate-900"
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationDuration={1100}
              animationEasing="ease-out"
              style={{ filter: "url(#donut-shadow)" }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#donut-${i})`} style={{ cursor: "pointer", outline: "none" }} />
              ))}
            </Pie>
            <Tooltip
              content={<DonutTooltip />}
              cursor={{ fill: "transparent" }}
              wrapperStyle={{ zIndex: "var(--z-tooltip, 80)", outline: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centerValue != null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center"
          >
            <span className="font-mono text-[22px] font-black tracking-tight text-slate-900 dark:text-white">{centerValue}</span>
            {centerLabel && <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{centerLabel}</span>}
          </motion.div>
        )}
      </div>
      <ul className="flex-1 space-y-3">
        {data.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          const color = CHART_PALETTE[i % CHART_PALETTE.length];
          return (
            <motion.li
              key={d.label}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="group flex items-center gap-3"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full shadow-sm ring-1 ring-white/60 transition-transform group-hover:scale-125 dark:ring-slate-900"
                style={{ background: color, boxShadow: `0 0 12px ${hexToRgba(color, 0.35)}` }}
              />
              <span className="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{d.label}</span>
              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{d.value}</span>
              <span className="grid min-w-[42px] place-items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {pct}%
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/** Tooltip adaptativo: glass en light, futurístico en dark */
function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const isDark = document.documentElement.classList.contains("dark");
  if (isDark) return <FuturisticTooltip active={active} payload={payload} label={label} />;
  return (
    <div className="min-w-[110px] rounded-2xl px-3.5 py-2.5 text-xs" style={tooltipStyle}>
      <p className="mb-1.5 border-b border-slate-100 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-teal-600">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-teal-500" style={{ boxShadow: "0 0 6px rgba(14,147,132,0.5)" }} />
        <span className="font-mono font-extrabold text-slate-900">{payload[0].value}</span>
      </div>
    </div>
  );
}

/** Premium vertical bars — glow, rounded top, gold peak, tooltip adaptativo. */
export function ActivityBars({ data, dataKey = "count", xKey = "day", height = 210 }) {
  const max = Math.max(...data.map((d) => d[dataKey]), 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -18, right: 4, top: 10 }}>
        <defs>
          <linearGradient id="bars-teal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.tealLight} stopOpacity={0.95} />
            <stop offset="100%" stopColor={CHART.teal} stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id="bars-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.goldLight} stopOpacity={1} />
            <stop offset="100%" stopColor={CHART.gold} stopOpacity={0.9} />
          </linearGradient>
          <filter id="bar-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <CartesianGrid
          stroke="rgba(226,232,240,0.7)"
          vertical={false}
          strokeDasharray="4 4"
          className="dark:stroke-slate-700/40"
        />
        <XAxis
          dataKey={xKey}
          stroke="rgba(100,116,139,0.8)"
          fontSize={11}
          fontWeight={500}
          tickLine={false}
          axisLine={false}
          dy={8}
          tickMargin={4}
        />
        <YAxis
          allowDecimals={false}
          stroke="rgba(100,116,139,0.8)"
          fontSize={11}
          fontWeight={500}
          width={32}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ActivityTooltip />}
          cursor={{
            fill: "rgba(14,147,132,0.06)",
            radius: 10,
          }}
        />
        <Bar
          dataKey={dataKey}
          radius={[10, 10, 3, 3]}
          barSize={26}
          isAnimationActive
          animationDuration={1100}
          animationEasing="ease-out"
        >
          {data.map((d, i) => {
            const isPeak = d[dataKey] === max && max > 0;
            return (
              <Cell
                key={i}
                fill={isPeak ? "url(#bars-gold)" : "url(#bars-teal)"}
                style={{
                  filter: isPeak
                    ? "drop-shadow(0 6px 14px rgba(212,164,58,0.32)) url(#bar-glow)"
                    : "drop-shadow(0 4px 10px rgba(14,147,132,0.22))",
                }}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Ranked horizontal bars — position badge, gradient fill + glow, stagger animation. */
export function RankedBars({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  // Medallas para el top-3
  const MEDAL = ["🥇", "🥈", "🥉"];

  return (
    <ul className="space-y-3">
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        const color = CHART_PALETTE[i % CHART_PALETTE.length];
        const isTop = i < 3;

        return (
          <motion.li
            key={d.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="group"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {/* badge de posición */}
                {isTop ? (
                  <span className="shrink-0 text-base leading-none">{MEDAL[i]}</span>
                ) : (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {i + 1}
                  </span>
                )}
                {d.icon && <d.icon className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />}
                <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{d.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{d.value}</span>
                <span
                  className="rounded-full border px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    color,
                    borderColor: hexToRgba(color, 0.28),
                    background: hexToRgba(color, 0.09),
                  }}
                >
                  {pct}%
                </span>
              </span>
            </div>

            {/* track */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner dark:bg-slate-800/70">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 2)}%` }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.18 + i * 0.07 }}
                className="relative h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${shade(color, -6)}, ${color})`,
                  boxShadow: `0 0 14px ${hexToRgba(color, 0.34)}, inset 0 1px 0 rgba(255,255,255,0.22)`,
                }}
              >
                {/* cap glow dot */}
                <span
                  className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:border-slate-900"
                  style={{ background: color, boxShadow: `0 0 10px ${hexToRgba(color, 0.6)}` }}
                />
              </motion.div>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
