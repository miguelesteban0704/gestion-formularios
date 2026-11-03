import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import { PRISM_PALS } from "./PrismPalette.js";
import "./PrismBars.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismBars — barras horizontales premium "desglose por respuesta".
   Filas de vidrio con barra degradada (glossy), halo neón por fila al hover
   y píldora de %: la barra mide EXACTAMENTE el % mostrado a la derecha.
   · La píldora se ilumina con el color de la fila (como PrismTopForms).
   Datos: [{ label, value }] — el % se calcula sobre el total de la serie.
   ──────────────────────────────────────────────────────────────────────── */
export function PrismBars({ data = [], palette = PRISM_PALS, className }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [hover, setHover] = useState(null);

  const rows = useMemo(
    () =>
      (data || [])
        .map((d, i) => ({
          label: d.label,
          value: Number(d.value) || 0,
          pal: palette[i % palette.length] || palette[0],
        }))
        .filter((d) => d.value > 0),
    [data, palette],
  );

  const total = useMemo(() => rows.reduce((s, d) => s + d.value, 0), [rows]);

  if (!rows.length) {
    return <p className={cn("pb-empty", isDark ? "pb-dark" : "pb-light")}>{t("noDataYet")}</p>;
  }

  return (
    <div className={cn("pb-list", isDark ? "pb-dark" : "pb-light", className)}>
      {rows.map((d, i) => {
        const on = hover === i;
        const pct = total ? (d.value / total) * 100 : 0;
        return (
          <motion.div
            key={d.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pb-row"
            style={
              on
                ? {
                    borderColor: `${d.pal.base}66`,
                    boxShadow: `0 0 0 1px ${d.pal.base}40, 0 0 28px -8px ${d.pal.base}99`,
                  }
                : undefined
            }
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="pb-dot"
              style={{
                background: `linear-gradient(135deg, ${d.pal.light}, ${d.pal.base})`,
                boxShadow: `0 0 10px ${d.pal.base}${on ? "cc" : "66"}`,
              }}
            />
            <span className="pb-name" title={d.label}>
              {d.label}
            </span>
            <span className="pb-track" aria-hidden="true">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.06 }}
                className="pb-fill"
                style={{
                  background: `linear-gradient(90deg, ${d.pal.deep}, ${d.pal.base} 55%, ${d.pal.light})`,
                  boxShadow: on ? `0 0 14px ${d.pal.base}99` : `0 0 8px ${d.pal.base}55`,
                }}
              />
            </span>
            <span className="pb-count">{d.value.toLocaleString()}</span>
            <span
              className="pb-pill"
              style={{
                borderColor: `${d.pal.base}55`,
                color: d.pal.light,
                textShadow: `0 0 8px ${d.pal.base}88`,
              }}
            >
              {Math.round(pct)}%
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}