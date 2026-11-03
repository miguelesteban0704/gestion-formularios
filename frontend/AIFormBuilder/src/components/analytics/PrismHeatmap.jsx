import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismHeatmap.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismHeatmap v4 — heatmap flat premium "micro-prisma" (7 días × 24h).
   Tooltip inteligente que flota JUNTO a la celda activa con reglas de
   reposicionamiento:
     · celda central  → a la derecha
     · fila superior  → debajo
     · fila inferior  → arriba
     · celda lateral  → a la derecha (izquierda si no cabe a la derecha)
   Toda la medición va en try/catch → el tooltip NUNCA puede tumbar la
   página. Celdas estáticas (cero animaciones por celda): solo se animan
   el anillo, las partículas y la entrada del tooltip.
   Datos: [{ day (DOW 0=dom), hour (0-23), count }].
   ──────────────────────────────────────────────────────────────────────── */
const ROWS = 7;
const COLS = 24;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const TEAL = [22, 200, 185];
const GOLD = [255, 197, 88];

function hLabel(h) {
  const m = h % 12 === 0 ? 12 : h % 12;
  return `${m}${h < 12 ? "a" : "p"}`;
}
const AXIS_HOURS = Array.from({ length: COLS }, (_, h) =>
  h % 2 === 0 ? hLabel(h) : "",
);

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function smooth(x) {
  return x * x * (3 - 2 * x);
}
const rgbaArr = (a, alpha) => `rgba(${a[0]},${a[1]},${a[2]},${alpha})`;

function cellPalette(v) {
  const f = smooth(clamp01(v));
  const col = mix(TEAL, GOLD, f);
  return rgbaArr(col, 0.16 + 0.8 * f);
}

/* Partículas decorativas: posiciones de arranque + vector en px.
   Solo transform + opacidad → baratas para el compositor. */
const PARTICLES = [
  { l: "4%", t: "70%", dx: 460, dy: -120, pd: "3.4s", dly: "-0.2s" },
  { l: "16%", t: "82%", dx: 380, dy: -170, pd: "3.9s", dly: "-1.1s" },
  { l: "30%", t: "60%", dx: 300, dy: -90, pd: "3.1s", dly: "-2.0s" },
  { l: "46%", t: "76%", dx: 220, dy: -150, pd: "4.2s", dly: "-0.7s" },
  { l: "58%", t: "58%", dx: 160, dy: -80, pd: "3.6s", dly: "-1.6s" },
  { l: "70%", t: "72%", dx: 90, dy: -120, pd: "4.0s", dly: "-2.4s" },
  { l: "82%", t: "62%", dx: 30, dy: -60, pd: "3.2s", dly: "-0.4s" },
  { l: "92%", t: "74%", dx: 0, dy: -90, pd: "3.7s", dly: "-1.4s" },
];

export default function PrismHeatmap({ data = [], className }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [hover, setHover] = useState(null); /* {r, c} */
  const [pos, setPos] = useState(null); /* {left, top, dir} para el tooltip */

  const rootRef = useRef(null);
  const gridRef = useRef(null);
  const tipRef = useRef(null);

  /* Matriz 7×24 desde la serie cruda (hora real, sin bucket) */
  const matrix = useMemo(() => {
    const m = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    (data || []).forEach(({ day, hour, count }) => {
      const d = Number(day);
      const h = Number(hour);
      const c = Number(count) || 0;
      if (d >= 0 && d < ROWS && h >= 0 && h < COLS && c > 0) {
        m[d][h] += c;
      }
    });
    return m;
  }, [data]);

  const max = useMemo(() => Math.max(0, ...matrix.flat()), [matrix]);
  const total = useMemo(() => matrix.flat().reduce((s, v) => s + v, 0), [matrix]);

  /* Pico real = celda seleccionada por defecto */
  const peak = useMemo(() => {
    let r = 0;
    let c = 0;
    matrix.forEach((row, i) =>
      row.forEach((v, j) => {
        if (v > matrix[r][c]) {
          r = i;
          c = j;
        }
      }),
    );
    return { r, c };
  }, [matrix]);

  const hasData = max > 0;
  const sel = hover ?? (hasData ? peak : null);
  const dayNames = DAY_KEYS.map((k) => t(k));

  const tip = sel ? matrix[sel.r][sel.c] : 0;
  const tipPct = total ? Math.round((tip / total) * 100) : 0;
  const tipLabel = sel ? `${dayNames[sel.r].toUpperCase()} · ${hLabel(sel.c).toUpperCase()}` : "";
  const rowBars = sel ? matrix[sel.r] : [];

  /* ── Posicionamiento seguro del tooltip (nunca crashea la página) ── */
  const selRef = useRef(sel);
  selRef.current = sel;

  const place = useCallback(() => {
    const root = rootRef.current;
    const grid = gridRef.current;
    const tipEl = tipRef.current;
    const s = selRef.current;
    if (!root || !grid || !tipEl || !s) return;
    try {
      const cell = grid.querySelector(`[data-rc="${s.r}-${s.c}"]`);
      if (!cell) return;
      const cellR = cell.getBoundingClientRect();
      const rootR = root.getBoundingClientRect();
      const tw = tipEl.offsetWidth || 220;
      const th = tipEl.offsetHeight || 170;
      const cx = cellR.left - rootR.left + cellR.width / 2;
      const cy = cellR.top - rootR.top + cellR.height / 2;

      let left;
      let top;
      let dir;
      if (s.r === 0) {
        /* fila superior → debajo de la celda */
        dir = "below";
        left = cx - tw / 2;
        top = cellR.bottom - rootR.top + 12;
      } else if (s.r === ROWS - 1) {
        /* fila inferior → arriba de la celda */
        dir = "above";
        left = cx - tw / 2;
        top = cellR.top - rootR.top - th - 12;
      } else {
        /* celdas centrales/laterales → a la derecha (izquierda si no cabe) */
        dir = "right";
        left = cellR.right - rootR.left + 12;
        top = cy - th / 2;
        if (left + tw > rootR.width - 8) {
          dir = "left";
          left = cellR.left - rootR.left - tw - 12;
        }
      }

      /* Clamp: el tooltip siempre queda dentro del panel */
      left = Math.max(8, Math.min(left, rootR.width - tw - 8));
      top = Math.max(8, Math.min(top, root.offsetHeight - th - 8));
      setPos({ left, top, dir });
    } catch {
      /* nunca romper la página por medición fallida */
    }
  }, []);

  useLayoutEffect(() => {
    place();
  }, [sel, place]);

  /* Re-posiciona cuando cambia el tamaño del panel (ventana/colapso) */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    let ro;
    try {
      ro = new ResizeObserver(() => place());
      ro.observe(root);
    } catch {
      /* sin observador → el posicionamiento por hover sigue funcionando */
    }
    return () => {
      try {
        if (ro) ro.disconnect();
      } catch {
        /* noop */
      }
    };
  }, [place]);

  return (
    <div
      ref={rootRef}
      className={cn("pm-root", isDark ? "pm-root--dark" : "pm-root--light", className)}
      onMouseLeave={() => setHover(null)}
    >
      <div className="pm-gloss" aria-hidden="true" />
      <div className="pm-vignette" aria-hidden="true" />

      {/* Tooltip: flota junto a la celda activa (reglas de reposicionamiento) */}
      {hasData && sel && (
        <div
          ref={tipRef}
          className="pm-tip"
          data-dir={(pos && pos.dir) || "right"}
          style={
            pos
              ? { left: pos.left, top: pos.top, opacity: 1 }
              : { left: 12, top: 8, opacity: 0 }
          }
          role="status"
        >
          <span className="pm-arrow" aria-hidden="true" />
          <div className="pm-kicker">
            <i />
            {tipLabel}
          </div>
          <div className="pm-value">{tip.toLocaleString()}</div>
          <div className="pm-label">{t("responses")}</div>
          <div className="pm-bars">
            {rowBars.map((v, i) => (
              <i
                key={i}
                className={i === sel.c ? "pm-bar--hl" : undefined}
                style={{ height: 4 + (max ? (v / max) * 18 : 4) }}
              />
            ))}
          </div>
          <div className="pm-ctx">
            <span>
              {hLabel(sel.c).toUpperCase()} · {tip.toLocaleString()}
            </span>
            <b>
              {tipPct}% {t("ofTotal")}
            </b>
          </div>
          <div className="pm-tip-legend">
            <small>{t("less")}</small>
            <div className="pm-tip-sw" aria-hidden="true">
              {[0.08, 0.3, 0.62, 0.95].map((v, i) => (
                <i key={i} style={{ background: cellPalette(v) }} />
              ))}
            </div>
            <small>{t("more")}</small>
          </div>
        </div>
      )}

      <div className="pm-grid" ref={gridRef}>
        {matrix.map((row, r) => (
          <div key={r} className="pm-row">
            <span className="pm-day">{dayNames[r]}</span>
            <div className="pm-cells">
              {row.map((v, c) => {
                const empty = v <= 0;
                const isSel = sel && sel.r === r && sel.c === c;
                return (
                  <div
                    key={c}
                    data-rc={`${r}-${c}`}
                    className={cn(
                      "pm-cell",
                      empty && "pm-cell--empty",
                      isSel && "pm-cell--sel",
                    )}
                    style={empty ? undefined : { "--c": cellPalette(max ? v / max : 0) }}
                    title={
                      v > 0
                        ? `${dayNames[r]} ${hLabel(c)} — ${v} ${t("responses").toLowerCase()}`
                        : undefined
                    }
                    onMouseEnter={() => setHover({ r, c })}
                  >
                    {!empty && <span className="pm-tile" />}
                    {isSel && <span className="pm-ring" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="pm-hours">
        {AXIS_HOURS.map((lab, h) => (
          <span key={h}>{lab}</span>
        ))}
      </div>

      <div className="pm-legend" aria-hidden="true">
        <small>{t("less")}</small>
        <div className="pm-swatches">
          {[0.08, 0.3, 0.62, 0.95].map((v, i) => (
            <i key={i} style={{ background: cellPalette(v) }} />
          ))}
        </div>
        <small>{t("more")}</small>
      </div>

      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="pm-part"
          style={{
            left: p.l,
            top: p.t,
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
            "--pd": p.pd,
            "--dly": p.dly,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export { hLabel };