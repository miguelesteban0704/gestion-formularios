import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismColumnBars.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismColumnBars — "Días concurridos" premium.
   Barras verticales de vidrio degradadas cian→teal; el pico máximo brilla
   en ámbar dorado con glow (misma regla que PrismAreaChart). Ejes Space
   Grotesk retroiluminados y tooltip de vidrio compacto.
   Datos: [{ day, count }].
   ──────────────────────────────────────────────────────────────────────── */
const CYAN = "#22d3ee";
const CYAN_LIGHT = "#67e8f9";
const GOLD = "#ffb84d";
const GOLD_LIGHT = "#ffe29a";

function niceCeil(v) {
  if (!v || v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : n <= 7.5 ? 7.5 : 10;
  return m * pow;
}
function buildAxis(maxVal) {
  const maxAxis = niceCeil(maxVal);
  const step =
    [1, 2, 2.5, 5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 120, 150, 200, 250, 300, 400, 500, 750, 1000].find(
      (c) => c >= maxAxis / 4 - 1e-9,
    ) || maxAxis / 4;
  const ticks = [];
  for (let v = 0; v <= maxAxis + 1e-9; v += step) {
    ticks.push(Math.round(v));
  }
  return { maxAxis, ticks };
}

export default function PrismColumnBars({ data = [], dataKey = "count", xKey = "day", height = 210, className }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const max = useMemo(() => Math.max(0, ...(data || []).map((d) => Number(d[dataKey]) || 0)), [data, dataKey]);
  const { maxAxis, ticks } = useMemo(() => buildAxis(Math.max(4, max)), [max]);

  const renderTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const value = Number(payload[0].value) || 0;
    return (
      <div className="pcb-tip" role="status">
        <div className="pcb-tip-tag">
          <i />
          {label}
        </div>
        <div className="pcb-tip-val">{value.toLocaleString()}</div>
        <div className="pcb-tip-lab">{t("responses")}</div>
      </div>
    );
  };

  return (
    <div className={cn("pcb-root", isDark ? "pcb-dark" : "pcb-light", className)}>
      <div className="pcb-glow" aria-hidden="true" />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ left: -14, right: 4, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="pcbFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CYAN_LIGHT} stopOpacity={0.98} />
              <stop offset="100%" stopColor={CYAN} stopOpacity={0.88} />
            </linearGradient>
            <linearGradient id="pcbGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity={1} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.92} />
            </linearGradient>
            <filter id="pcbGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <CartesianGrid
            stroke={isDark ? "rgba(148,179,214,0.1)" : "rgba(100,116,139,0.16)"}
            strokeDasharray="3 6"
            vertical={false}
          />

          <XAxis
            dataKey={xKey}
            stroke={isDark ? "rgba(148,179,214,0.35)" : "rgba(100,116,139,0.45)"}
            fontSize={11}
            fontWeight={600}
            tickLine={false}
            axisLine={false}
            dy={8}
            tickMargin={4}
          />
          <YAxis
            domain={[0, maxAxis]}
            ticks={ticks}
            allowDecimals={false}
            stroke={isDark ? "rgba(148,179,214,0.35)" : "rgba(100,116,139,0.45)"}
            fontSize={11}
            fontWeight={600}
            width={34}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={renderTip}
            cursor={{ fill: "rgba(34,211,238,0.06)", radius: 10 }}
          />

          <Bar dataKey={dataKey} radius={[8, 8, 3, 3]} barSize={28} isAnimationActive animationDuration={1100} animationEasing="ease-out">
            {data.map((d, i) => {
              const isPeak = max > 0 && (Number(d[dataKey]) || 0) === max;
              return (
                <Cell
                  key={i}
                  fill={isPeak ? "url(#pcbGold)" : "url(#pcbFill)"}
                  style={{
                    filter: isPeak
                      ? "drop-shadow(0 6px 14px rgba(255,184,77,0.35)) url(#pcbGlow)"
                      : "drop-shadow(0 4px 10px rgba(6,182,212,0.25))",
                  }}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}