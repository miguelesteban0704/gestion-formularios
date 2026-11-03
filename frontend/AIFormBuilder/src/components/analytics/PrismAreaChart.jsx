import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismAreaChart.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismAreaChart — área/línea premium "Volumen de respuestas".
   · Curva continua con gradiente vertical índigo→cian→dorado: los picos
     altos brillan en ámbar dorado (peak = ReferenceDot con glow).
   · Relleno bioluminiscente que se funde con el vidrio del panel.
   · Tooltip de vidrio (fecha + valor exacto) flotando sobre el nodo.
   · Segmented control Día | Semana | Mes exportado como <VolSeg />.
   Datos: [{ label: "Sep 5", count: 118 }] (serie ya agrupada por día).
   ──────────────────────────────────────────────────────────────────────── */
const INDIGO = "#4f46e5";
const CYAN = "#22d3ee";
const GOLD = "#ffb84d";

/* Rampa vertical de la línea: abajo índigo → medio cian → arriba dorado.
   Como el eje Y sube, los picos de la curva se ven dorados. */
const LINE_STOPS = [
  { off: "0%", color: INDIGO },
  { off: "55%", color: CYAN },
  { off: "100%", color: GOLD },
];

function niceCeil(v) {
  if (!v || v <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : n <= 7.5 ? 7.5 : 10;
  return m * pow;
}
function buildAxis(maxVal) {
  const maxAxis = niceCeil(maxVal);
  const step =
    [10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 120, 150, 200, 250, 300, 400, 500, 750, 1000].find(
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
      <circle className="pv-node-halo" cx={cx} cy={cy} r={13} fill="none" stroke={CYAN} strokeWidth={1.4} />
      <circle cx={cx} cy={cy} r={8.5} fill="rgba(34,211,238,0.2)" />
      <circle cx={cx} cy={cy} r={4.4} fill="#ffffff" stroke={GOLD} strokeWidth={2.4} />
    </g>
  );
}

/* Marca dorada sobre el pico máximo — un único elemento con glow. */
function PeakMark({ cx, cy }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={11.5} fill="rgba(255,184,77,0.2)" />
      <circle cx={cx} cy={cy} r={5.2} fill={GOLD} stroke="rgba(255,255,255,0.9)" strokeWidth={1.4} style={{ filter: "url(#pvGlow)" }} />
    </g>
  );
}

export default function PrismAreaChart({ data = [], className }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const peakIndex = useMemo(() => {
    let pi = -1;
    let pv = -1;
    (data || []).forEach((p, i) => {
      if (p.count > pv) {
        pv = p.count;
        pi = i;
      }
    });
    return pi;
  }, [data]);

  const { maxAxis, ticks } = useMemo(
    () => buildAxis(Math.max(4, ...(data || []).map((p) => p.count))),
    [data],
  );

  const peak = peakIndex >= 0 ? data[peakIndex] : null;

  const renderTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const value = Number(payload[0].value) || 0;
    return (
      <div className="pv-tip" role="status">
        <div className="pv-tip-tag">
          <i />
          {label}
        </div>
        <div className="pv-tip-val">{value.toLocaleString()}</div>
        <div className="pv-tip-lab">{t("responses")}</div>
      </div>
    );
  };

  return (
    <div className={cn("pv-root", isDark ? "pv-dark" : "pv-light", className)}>
      <div className="pv-glow" aria-hidden="true" />
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ left: -12, right: 8, top: 14, bottom: 2 }}>
          <defs>
            <linearGradient id="pvLine" x1="0" y1="1" x2="0" y2="0">
              {LINE_STOPS.map((s) => (
                <stop key={s.off} offset={s.off} stopColor={s.color} />
              ))}
            </linearGradient>
            <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CYAN} stopOpacity={0.34} />
              <stop offset="46%" stopColor={INDIGO} stopOpacity={0.13} />
              <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
            </linearGradient>
            <filter id="pvGlow" x="-80%" y="-80%" width="260%" height="260%">
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
            dataKey="label"
            stroke={isDark ? "rgba(148,179,214,0.35)" : "rgba(100,116,139,0.45)"}
            fontSize={11}
            fontWeight={600}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={26}
          />
          <YAxis
            domain={[0, maxAxis]}
            ticks={ticks}
            allowDecimals={false}
            stroke={isDark ? "rgba(148,179,214,0.35)" : "rgba(100,116,139,0.45)"}
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
            type="monotone"
            dataKey="count"
            name={t("responses")}
            stroke="url(#pvLine)"
            strokeWidth={3}
            fill="url(#pvFill)"
            dot={false}
            activeDot={<ActiveNode />}
            isAnimationActive
            animationDuration={1400}
            animationEasing="ease-out"
          />

          {peak && (
            <ReferenceDot
              x={peak.label}
              y={peak.count}
              r={4}
              fill={GOLD}
              stroke="none"
              shape={<PeakMark />}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Toggle segmentado Día | Semana | Mes (activo retroiluminado cian) ── */
const SEG_KEYS = ["day", "week", "month"];

export function VolSeg({ value, onChange, className }) {
  const { t } = useLanguage();
  return (
    <div className={cn("pv-seg", className)} role="tablist" aria-label={t("responseVolume")}>
      {SEG_KEYS.map((k) => {
        const active = value.toLowerCase().startsWith(k);
        return (
          <button
            key={k}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(k.charAt(0).toUpperCase() + k.slice(1))}
            className={cn("pv-seg-btn", active && "pv-seg-on")}
          >
            {t(k)}
          </button>
        );
      })}
    </div>
  );
}