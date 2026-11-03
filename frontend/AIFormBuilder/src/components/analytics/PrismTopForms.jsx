import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import { analyticsPath } from "../../lib/routes.js";
import { hLabel } from "./PrismHeatmap.jsx";
import "./PrismTopForms.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismTopForms — "Formularios destacados" premium glassmorphism.
   Filas numeradas de vidrio con barras de progreso degradadas (glossy),
   halo neón por fila al hover y tooltip de vidrio con mini-histograma
   semanal REAL por formulario (día + hora pico). Datos: [{ id, title,
   responses, views, conversion, history:[{date,count,peakHour}] }].
   ──────────────────────────────────────────────────────────────────────── */

/* Paleta de referencia por nombre conocido (magenta→rosa, púrpura→índigo,
   amatista→lavanda, naranja→ámbar, zafiro→azur, cian→teal). */
const REF_COLORS = [
  { test: /newsletter/i, light: "#f0abfc", base: "#d946ef", deep: "#a21caf" },
  { test: /restaurant/i, light: "#a5b4fc", base: "#8b5cf6", deep: "#4f46e5" },
  { test: /feedback/i, light: "#c4b5fd", base: "#a78bfa", deep: "#7c3aed" },
  { test: /research/i, light: "#fdba74", base: "#f97316", deep: "#c2410c" },
  { test: /satisfaction/i, light: "#7dd3fc", base: "#3b82f6", deep: "#0369a1" },
  { test: /conf|registr/i, light: "#67e8f9", base: "#22d3ee", deep: "#0d9488" },
];
const FALLBACKS = [
  { light: "#f0abfc", base: "#d946ef", deep: "#a21caf" },
  { light: "#a5b4fc", base: "#8b5cf6", deep: "#4f46e5" },
  { light: "#c4b5fd", base: "#a78bfa", deep: "#7c3aed" },
  { light: "#fdba74", base: "#f97316", deep: "#c2410c" },
  { light: "#7dd3fc", base: "#3b82f6", deep: "#0369a1" },
  { light: "#67e8f9", base: "#22d3ee", deep: "#0d9488" },
];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const colorFor = (title, i) => {
  for (const c of REF_COLORS) {
    if (c.test.test(String(title || ""))) {
      const { test: _t, ...pal } = c;
      return pal;
    }
  }
  return FALLBACKS[i % FALLBACKS.length] || FALLBACKS[0];
};

const dayKeyOf = (date) => {
  try {
    return DAY_KEYS[new Date(`${date}T12:00:00`).getDay()] || "sun";
  } catch {
    return "sun";
  }
};

export default function PrismTopForms({ data = [], total = 0, className, guestMode = false, onSelect = null }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isDark } = useTheme();
  const [hover, setHover] = useState(null);
  const rootRef = useRef(null);
  const tipRef = useRef(null);
  const coordsRef = useRef({ x: 0, y: 0 });

  const rows = useMemo(() => {
    const tot = Number(total) || 0;
    return (data || []).map((f, i) => {
      const pal = colorFor(f.title, i);
      const hist = Array.isArray(f.history) ? f.history : [];
      let peakIdx = -1;
      let peakCount = 0;
      hist.forEach((h, hi) => {
        const c = Number(h?.count) || 0;
        if (c > peakCount) {
          peakCount = c;
          peakIdx = hi;
        }
      });
      const peak = peakIdx >= 0 ? hist[peakIdx] : null;
      return {
        ...f,
        pal,
        hist,
        peakIdx,
        peakCount,
        dayName: peak ? t(dayKeyOf(peak.date)) : "",
        peakHour: peak ? peak.peakHour : null,
        maxHist: Math.max(0, ...hist.map((h) => Number(h?.count) || 0)),
        share: tot ? ((Number(f.responses) || 0) / tot) * 100 : 0,
      };
    });
  }, [data, total, t]);

  /* Tooltip: posición guiada y acotada al contenedor (try/catch + clamp). */
  const positionTip = useCallback((cx, cy) => {
    const tip = tipRef.current;
    const root = rootRef.current;
    if (!tip || !root) return;
    try {
      const rb = root.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const gap = 14;
      let left = cx - rb.left + gap;
      if (left + tw > rb.width - 10) left = cx - rb.left - tw - gap;
      let top = cy - rb.top - 12;
      if (top + th > rb.height - 8) top = cy - rb.top - th - 8;
      tip.style.left = `${Math.max(8, left)}px`;
      tip.style.top = `${Math.max(4, top)}px`;
    } catch {
      /* sin op */
    }
  }, []);

  const handleMove = useCallback(
    (e, i) => {
      coordsRef.current = { x: e.clientX, y: e.clientY };
      setHover((h) => (h === i ? h : i));
      positionTip(e.clientX, e.clientY);
    },
    [positionTip],
  );

  const hide = useCallback(() => {
    setHover(null);
    if (tipRef.current) tipRef.current.style.opacity = "0";
  }, []);

  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!tip) return;
    tip.style.opacity = hover != null ? "1" : "0";
    if (hover != null) positionTip(coordsRef.current.x, coordsRef.current.y);
  }, [hover, positionTip, rows]);

  /* Re-posiciona si el panel cambia de tamaño */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (hover != null) positionTip(coordsRef.current.x, coordsRef.current.y);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [hover, positionTip]);

  const active = hover != null ? rows[hover] : null;
  const activeHasHist = !!active && active.hist.length > 0;
  const activePeak = !!active && active.peakCount > 0;
  const tipKicker = active
    ? activePeak
      ? `${active.dayName.toUpperCase()}${active.peakHour != null ? ` · ${hLabel(active.peakHour).toUpperCase()}` : ""} · ${t("peakDay").toUpperCase()}`
      : String(active.title || "").toUpperCase()
    : "";

  return (
    <div
      ref={rootRef}
      className={cn("pt-root", isDark ? "pt-dark" : "pt-light", className)}
      onMouseLeave={hide}
    >
      {rows.length === 0 && (
        <p className="pt-empty">{t("noDataYet")}</p>
      )}

      {rows.map((f, i) => {
        const on = hover === i;
        /* La barra mide EXACTAMENTE el % mostrado a la derecha (conversión):
           línea y número concuerdan. Si la conversión real > 100%, el track
           (overflow:hidden) la recorta a su ancho máximo — la píldora sigue
           mostrando el % real. */
        const barPct = Math.max(0, Number(f.conversion) || 0);
        const rowStyle = on
          ? {
              borderColor: `${f.pal.base}66`,
              boxShadow: `0 0 0 1px ${f.pal.base}40, 0 0 28px -8px ${f.pal.base}99`,
            }
          : undefined;
        return (
          <button
            key={f.id}
            type="button"
            className={cn("pt-row", on && "pt-row--on")}
            style={rowStyle}
            aria-label={`${i + 1} — ${f.title}, ${f.responses} ${t("responses").toLowerCase()}, ${f.conversion}% ${t("conversion").toLowerCase()}`}
            onMouseEnter={(e) => handleMove(e, i)}
            onMouseMove={(e) => handleMove(e, i)}
            onMouseLeave={hide}
            onFocus={() => setHover(i)}
            onBlur={hide}
            onClick={() => {
              /* `onSelect` lo pone el panel de entidad: sus filas abren la
                 analítica scopeada a su slug. Sin él, el comportamiento de
                 siempre (escaparate o panel global). */
              if (onSelect) {
                onSelect(f);
                return;
              }
              /* Escaparate: la fila abre las estadísticas PÚBLICAS del
                 formulario (`/estadisticas/<slug>`), sin sesión. Apuntar al
                 panel mandaría al invitado al IDP. */
              if (guestMode) {
                if (f.slug) navigate(`/estadisticas/${f.slug}`);
                return;
              }
              navigate(analyticsPath(language, String(f.id)));
            }}
          >
            <span className="pt-rank">{i + 1}</span>
            <span
              className="pt-dot"
              style={{
                background: `linear-gradient(135deg, ${f.pal.light}, ${f.pal.base})`,
                boxShadow: `0 0 10px ${f.pal.base}${on ? "cc" : "66"}`,
              }}
            />
            <span className="pt-name" title={f.title}>
              {f.title}
            </span>
            <span className="pt-track" aria-hidden="true">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${barPct}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.06 }}
                className="pt-fill"
                style={{
                  background: `linear-gradient(90deg, ${f.pal.deep}, ${f.pal.base} 55%, ${f.pal.light})`,
                  boxShadow: on ? `0 0 14px ${f.pal.base}99` : `0 0 8px ${f.pal.base}55`,
                }}
              />
            </span>
            <span className="pt-count">{Number(f.responses).toLocaleString()}</span>
            <span
              className="pt-pill"
              style={{
                borderColor: `${f.pal.base}55`,
                color: f.pal.light,
                textShadow: `0 0 8px ${f.pal.base}88`,
              }}
            >
              {f.conversion}%
            </span>
          </button>
        );
      })}

      {/* Tooltip de vidrio — solo se muestra en hover */}
      <div ref={tipRef} className="pt-tip" role="status" style={{ opacity: 0 }}>
        {active && (
          <>
            <div className="pt-tip-kicker">
              <i
                style={{
                  background: `linear-gradient(135deg, ${active.pal.light}, ${active.pal.base})`,
                  boxShadow: `0 0 8px ${active.pal.base}`,
                }}
              />
              {tipKicker}
            </div>
            <div className="pt-tip-val">{activePeak ? active.peakCount.toLocaleString() : (Number(active.responses) || 0).toLocaleString()}</div>
            <div className="pt-tip-lab">{t("responses")}</div>

            {activeHasHist && (
              <div className="pt-mini" aria-hidden="true">
                <div className="pt-mini-bars">
                  {active.hist.map((h, hi) => {
                    const c = Number(h?.count) || 0;
                    const hgt = active.maxHist ? Math.max(3, (c / active.maxHist) * 30) : 3;
                    const isPeak = hi === active.peakIdx && activePeak;
                    return (
                      <span
                        key={h?.date || hi}
                        className={cn("pt-mini-bar", isPeak && "pt-mini-bar--peak", !isPeak && c === 0 && "pt-mini-bar--zero")}
                        style={{
                          height: `${hgt}px`,
                          ...(isPeak
                            ? { background: "linear-gradient(180deg,#ffe29a,#ffb84d)", boxShadow: "0 0 10px rgba(255,197,88,0.85)" }
                            : { background: `linear-gradient(180deg, ${active.pal.light}, ${active.pal.base})` }),
                        }}
                        title={`${h?.date || ""}: ${c}`}
                      />
                    );
                  })}
                </div>
                <div className="pt-mini-labs">
                  {active.hist.map((h, hi) => (
                    <span key={h?.date || hi}>{h?.date ? t(dayKeyOf(h.date)).slice(0, 2) : ""}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-tip-foot">
              <span style={{ color: active.pal.light }}>{active.share.toFixed(1)}% {t("ofTotal")}</span>
              <span>· {active.conversion}% {t("conversion").toLowerCase()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}