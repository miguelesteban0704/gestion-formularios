import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Sector,
  Tooltip,
  Cell,
} from "recharts";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismDonut.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismDonut — donut premium "Sesiones por dispositivo".
   · Aro biselado con segmentos luminosos + gaps; acabado glossy con
     profundidad de vidrio; Desktop en cian eléctrico, Mobile en ámbar dorado.
   · Centro retroiluminado: total + "TOTAL".
   · Hover: halo neón + sector ampliado + tooltip de vidrio compacto.
   · Leyenda de tarjetas con punto luminoso y porcentajes.
   Datos: [{ label, value }] (sessions/device).
   ──────────────────────────────────────────────────────────────────────── */
const PALETTE = {
  Desktop: { light: "#67e8f9", base: "#06b6d4", deep: "#0e7490" },
  Mobile: { light: "#ffd687", base: "#ffb84d", deep: "#d97706" },
  Tablet: { light: "#a5b4fc", base: "#7c6cc0", deep: "#5b4dab" },
};
const FALLBACK = { light: "#94a3b8", base: "#64748b", deep: "#475569" };

/**
 * gid único por label + base (idBase permite varios donuts en la misma
 * página sin que colisionen sus gradientes SVG, p.ej. preguntas con los
 * mismos textos de opciones).
 */
const makeGid = (idBase) => (label) =>
  `${idBase}-${String(label).toLowerCase().replace(/[^a-z0-9]/g, "") || "x"}`;

export default function PrismDonut({ data = [], className, palette, idBase = "pdg" }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [active, setActive] = useState(null); /* índice del sector activo */

  const gid = useMemo(() => makeGid(idBase), [idBase]);

  const rows = useMemo(() => {
    const isArray = Array.isArray(palette);
    return (data || [])
      .map((d, i) => {
        let pal;
        if (palette) {
          pal = isArray
            ? palette[i % palette.length] || FALLBACK
            : palette[d.label] || FALLBACK;
        } else {
          pal = PALETTE[d.label] || FALLBACK;
        }
        return { label: d.label, value: Number(d.value) || 0, pal };
      })
      .filter((d) => d.value > 0);
  }, [data, palette]);

  const total = useMemo(() => rows.reduce((s, d) => s + d.value, 0), [rows]);

  const withPct = rows.map((d) => ({
    ...d,
    pct: total ? (d.value / total) * 100 : 0,
  }));

  /* Halo neón del sector activo: copia desenfocada (color del sector) +
     sector ampliado con borde de luz. 1 solo elemento afectado por hover. */
  const renderGlowSector = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius + 4}
          outerRadius={outerRadius + 9}
          startAngle={startAngle}
          endAngle={endAngle}
          cornerRadius={8}
          fill={fill}
          opacity={0.9}
          style={{ filter: "url(#pdHalo)" }}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius + 1}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          cornerRadius={8}
          fill={fill}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={1.3}
        />
      </g>
    );
  };

  const renderTip = ({ active: act, payload }) => {
    if (!act || !payload?.length) return null;
    const d = payload[0];
    const row = rows.find((r) => r.label === d.name) || { pal: FALLBACK };
    const pct = total ? (Number(d.value) / total) * 100 : 0;
    return (
      <div className="pd-tip" role="status">
        <div className="pd-tip-kicker">
          <i style={{ background: row.pal.base, boxShadow: `0 0 8px ${row.pal.base}` }} />
          {d.name}
        </div>
        <div className="pd-tip-val">{(Number(d.value) || 0).toLocaleString()}</div>
        <div className="pd-tip-lab">{t("responses")}</div>
        <div className="pd-tip-pct">{pct.toFixed(1)}% {t("ofTotal")}</div>
      </div>
    );
  };

  return (
    <div className={cn("pd-root", isDark ? "pd-dark" : "pd-light", className)}>
      <div className="pd-halo-bg" aria-hidden="true" />

      <div className="pd-ring">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <defs>
              <filter id="pdHalo" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="7" />
              </filter>
              {withPct.map((d) => (
                <linearGradient key={d.label} id={gid(d.label)} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={d.pal.light} />
                  <stop offset="55%" stopColor={d.pal.base} />
                  <stop offset="100%" stopColor={d.pal.deep} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={withPct}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={79}
              paddingAngle={4}
              cornerRadius={11}
              startAngle={90}
              endAngle={-270}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
              activeIndex={active}
              activeShape={renderGlowSector}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              isAnimationActive
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {withPct.map((d) => (
                <Cell
                  key={d.label}
                  fill={`url(#${gid(d.label)})`}
                  style={{ outline: "none" }}
                />
              ))}
            </Pie>
            <Tooltip content={renderTip} cursor={{ fill: "transparent" }} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centro retroiluminado */}
        <div className="pd-center" aria-hidden="true">
          <span className="pd-total">{total.toLocaleString()}</span>
          <span className="pd-total-lab">{t("total")}</span>
        </div>
      </div>

      {/* Leyenda: tarjetas con punto luminoso */}
      <div className="pd-legend">
        {withPct.map((d, i) => (
          <div
            key={d.label}
            className={cn("pd-leg-card", active === i && "pd-leg-card--on")}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span
              className="pd-dot"
              style={{
                background: `linear-gradient(135deg, ${d.pal.light}, ${d.pal.base})`,
                boxShadow: `0 0 10px ${d.pal.base}`,
              }}
            />
            <span className="pd-leg-name">{d.label}</span>
            <span className="pd-leg-val">{d.value.toLocaleString()}</span>
            <span className="pd-leg-pct">{d.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}