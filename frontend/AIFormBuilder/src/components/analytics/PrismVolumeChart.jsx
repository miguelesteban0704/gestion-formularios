import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismVolumeChart.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismVolumeChart — "Volumen de respuestas" por formulario.
   Área diaria con rampa vertical índigo→cian→dorado (los picos brillan en
   ámbar) + línea acumulada dorada con glow y punto final luminoso.
   Tooltip de vidrio dual (diarias + acumuladas). Mismo lenguaje que
   PrismAreaChart de Insights — mismo tipo de chart, mismo diseño.
   Datos: [{ day, count, cumulative }].
   ──────────────────────────────────────────────────────────────────────── */
const INDIGO = "#4f46e5";
const CYAN = "#22d3ee";
const GOLD = "#ffb84d";
const GOLD_LIGHT = "#ffe29a";

const LINE_STOPS = [
  { off: "0%", color: INDIGO },
  { off: "55%", color: CYAN },
  { off: "100%", color: GOLD },
];

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

/* Nodo neón activo (hover) con halo pulsante — 1 elemento animado. */
function ActiveNode({ cx, cy }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle className="pvc-node-halo" cx={cx} cy={cy} r={13} fill="none" stroke={CYAN} strokeWidth={1.4} />
      <circle cx={cx} cy={cy} r={8.5} fill="rgba(34,211,238,0.2)" />
      <circle cx={cx} cy={cy} r={4.4} fill="#ffffff" stroke={GOLD} strokeWidth={2.4} />
    </g>
  );
}

export default function PrismVolumeChart({ data = [], className }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const { maxAxis: maxDaily, ticks: ticksDaily } = useMemo(
    () => buildAxis(Math.max(4, ...(data || []).map((d) => Number(d.count) || 0))),
    [data],
  );
  const { maxAxis: maxCum, ticks: ticksCum } = useMemo(
    () => buildAxis(Math.max(4, ...(data || []).map((d) => Number(d.cumulative) || 0))),
    [data],
  );

  const last = (data || []).length > 0 ? data[data.length - 1] : null;

  const renderTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const daily = payload.find((p) => p.dataKey === "count");
    const cum = payload.find((p) => p.dataKey === "cumulative");
    return (
      <div className="pvc-tip" role="status">
        <div className="pvc-tip-tag">
          <i />
          {label}
        </div>
        <div className="pvc-tip-rows">
          <div className="pvc-tip-row">
            <em>
              <i style={{ background: CYAN, boxShadow: `0 0 8px ${CYAN}` }} />
              {t("daily")}
            </em>
            <b>{(Number(daily?.value) || 0).toLocaleString()}</b>
          </div>
          <div className="pvc-tip-row">
            <em>
              <i style={{ background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />
              {t("cumulative")}
            </em>
            <b>{(Number(cum?.value) || 0).toLocaleString()}</b>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("pvc-root", isDark ? "pvc-dark" : "pvc-light", className)}>
      <div className="pvc-glow" aria-hidden="true" />
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ left: -12, right: 8, top: 12, bottom: 2 }}>
          <defs>
            <linearGradient id="pvcLine" x1="0" y1="1" x2="0" y2="0">
              {LINE_STOPS.map((s) => (
                <stop key={s.off} offset={s.off} stopColor={s.color} />
              ))}
            </linearGradient>
            <linearGradient id="pvcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CYAN} stopOpacity={0.34} />
              <stop offset="46%" stopColor={INDIGO} stopOpacity={0.13} />
              <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pvcCum" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={GOLD_LIGHT} />
              <stop offset="100%" stopColor={GOLD} />
            </linearGradient>
            <filter id="pvcGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid
            stroke={isDark ? "rgba(148,179,214,0.1)" : "rgba(100,116,139,0.16)"}
            strokeDasharray="3 6"
            vertical={false}
          />

          <XAxis
            dataKey="day"
            stroke={isDark ? "rgba(148,179,214,0.35)" : "rgba(100,116,139,0.45)"}
            fontSize={11}
            fontWeight={600}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={26}
          />
          <YAxis
            yAxisId="l"
            domain={[0, maxDaily]}
            ticks={ticksDaily}
            allowDecimals={false}
            stroke={isDark ? "rgba(148,179,214,0.35)" : "rgba(100,116,139,0.45)"}
            fontSize={11}
            fontWeight={600}
            width={36}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="r"
            orientation="right"
            domain={[0, maxCum]}
            ticks={ticksCum}
            allowDecimals={false}
            stroke={isDark ? "rgba(148,179,214,0.25)" : "rgba(100,116,139,0.35)"}
            fontSize={11}
            fontWeight={600}
            width={36}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={renderTip}
            cursor={{ stroke: CYAN, strokeOpacity: 0.22, strokeWidth: 1.2, strokeDasharray: "4 4" }}
          />

          <Area
            yAxisId="l"
            type="monotone"
            dataKey="count"
            name={t("daily")}
            stroke="url(#pvcLine)"
            strokeWidth={3}
            fill="url(#pvcFill)"
            dot={false}
            activeDot={<ActiveNode />}
            isAnimationActive
            animationDuration={1400}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="cumulative"
            name={t("cumulative")}
            stroke="url(#pvcCum)"
            strokeWidth={2.4}
            dot={false}
            activeDot={{ r: 4.5, fill: "#ffffff", stroke: GOLD, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={1400}
            animationEasing="ease-out"
            style={{ filter: "drop-shadow(0 4px 12px rgba(255,184,77,0.4))" }}
          />

          {last && (
            <ReferenceDot
              yAxisId="r"
              x={last.day}
              y={last.cumulative}
              r={5.5}
              fill={GOLD}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={1.4}
              style={{ filter: "url(#pvcGlow)" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}