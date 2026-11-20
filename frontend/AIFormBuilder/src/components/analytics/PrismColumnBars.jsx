import { useCallback, useEffect, useId, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismColumnBars.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismColumnBars — «Días con más actividad». Cada columna es un canal
   RECTANGULAR de cristal de doble pared con fluido luminoso (diseño 4D de
   PrismBar, en vertical).

   Layout fluido (v3):
   · El gráfico ocupa el 100 % del ancho de la tarjeta. Las columnas se reparten
     ese ancho con flexbox (`flex: 1 1 0`) para cualquier número de días; ya no
     hay un viewBox fijo ni un ancho de tubo fijo.
   · Alto = prop `height` (230 por defecto). Ejes, cuadrícula y etiquetas son
     HTML (no SVG escalado), así que el texto no se deforma al cambiar el ancho.
   · Los efectos (pared de cristal, halo, radio de esquina) se miden con
     unidades de contenedor de CADA columna (`cqw`, con tope), de modo que se
     ven igual de bien con 3 columnas anchas que con 7 estrechas.

   Qué se conserva: colores (tokens `--pcb-*` en el CSS), resorte, menisco,
   cáusticas, reactividad al puntero, tooltip y accesibilidad.
   ──────────────────────────────────────────────────────────────────────── */

const DEFAULT_HEIGHT = 230;

// Mismo resorte que PrismBar (ζ ≈ 0.79) y mismo retardo de entrada.
const SPRING = { stiffness: 90, damping: 15, mass: 1 };
const INTRO_DELAY_MS = 220;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

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

/* ── Una columna: canal rectangular con fluido ──────────────────────── */
function Column({ target, label, value, align, caption, reduce, filterId }) {
  const colRef = useRef(null);
  const introRef = useRef(true);
  const fill = useMotionValue(0);
  const [active, setActive] = useState(false);

  // Nivel con resorte (framer-motion nativo, sin @react-spring/web).
  useEffect(() => {
    const col = colRef.current;
    if (!col) return undefined;

    const paint = (v) => col.style.setProperty("--pcb-fill", clamp(v, 0, 1).toFixed(4));

    // Sin movimiento: el nivel salta directo al valor final.
    if (reduce) {
      paint(target);
      return undefined;
    }

    // fill.on devuelve una función de cancelación en framer-motion moderno.
    const cancel = fill.on("change", paint);

    const animation = animate(fill, target, {
      type: "spring",
      stiffness: SPRING.stiffness,
      damping: SPRING.damping,
      mass: SPRING.mass,
      delay: introRef.current ? INTRO_DELAY_MS / 1000 : 0,
    });

    introRef.current = false;

    return () => {
      animation.stop();
      if (typeof cancel === "function") cancel();
    };
  }, [reduce, target]);

  return (
    <div
      ref={colRef}
      className={cn("pcb-col", active ? "pcb-col--active" : undefined)}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
    >
      {/* Cáusticas proyectadas: base (sigue al nivel) y reactiva (sigue al cursor). */}
      <span className="pcb-caustic pcb-caustic--base" aria-hidden="true" />
      <span className="pcb-caustic pcb-caustic--reactive" aria-hidden="true" />

      <div className="pcb-stage" aria-hidden="true">
        <div className="pcb-tube">
          {/* Canal: pared interior con sombra profunda (inset). */}
          <span className="pcb-well" />

          {/* Fluido: capas de profundidad, de abajo hacia arriba. */}
          <div className="pcb-water">
            <span className="pcb-liquid" />
            <span className="pcb-flow-wrap" style={{ filter: `url(#${filterId})` }}>
              <span className="pcb-flow" />
            </span>
            <span className="pcb-core" />
            <span className="pcb-depth" />
            <span className="pcb-spec" />
          </div>

          {/* Menisco luminoso en la punta exacta del valor. */}
          <span className="pcb-meniscus">
            <span className="pcb-meniscus-glow" />
            <span className="pcb-meniscus-bead" />
            <span className="pcb-flare" />
            <span className="pcb-spark pcb-spark--1" />
            <span className="pcb-spark pcb-spark--2" />
            <span className="pcb-spark pcb-spark--3" />
            <span className="pcb-spark pcb-spark--4" />
            <span className="pcb-spark pcb-spark--5" />
          </span>

          {/* Pared frontal de cristal: bisel doble y reflejos por encima del fluido. */}
          <span className="pcb-glass" />
          <span className="pcb-glint" />
        </div>
      </div>

      {/* Tooltip anclado a su columna (solo visible cuando está activa). */}
      {active && (
        <div className="pcb-tip" role="status" data-align={align} style={{ top: `max(${(1 - target) * 100}%, 70px)` }}>
          <div className="pcb-tip-tag"><i />{label}</div>
          <div className="pcb-tip-val">{value.toLocaleString()}</div>
          <div className="pcb-tip-lab">{caption}</div>
        </div>
      )}
    </div>
  );
}

export default function PrismColumnBars({ data = [], dataKey = "count", xKey = "day", height = DEFAULT_HEIGHT, className }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const plotRef = useRef(null);

  // useId devuelve `:r1:` / `«r1»` según la versión de React; esos caracteres
  // no son seguros dentro de `url(#…)`.
  const filterId = `pcb-flow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const rows = (data || []).map((d) => ({
    label: d?.[xKey],
    value: Number(d?.[dataKey]) || 0,
  }));
  const max = Math.max(0, ...rows.map((r) => r.value));
  const { maxAxis, ticks } = buildAxis(Math.max(4, max));
  const h = Number.isFinite(height) ? Math.max(120, height) : DEFAULT_HEIGHT;

  // ── Reactividad al puntero (micro-elevación + brillo + cáustica) ─────
  // Usa refs en lugar de estado para evitar re-renders de todas las columnas
  // al pasar el mouse sobre una sola.
  const lastRef = useRef(null);
  const frameRef = useRef(0);

  const flush = useCallback(() => {
    frameRef.current = 0;
    const root = rootRef.current;
    const plot = plotRef.current;
    const last = lastRef.current;
    if (!last || !root || !plot) return;
    const box = root.getBoundingClientRect();
    const area = plot.getBoundingClientRect();
    const card = root.closest("[data-pg-host], [data-pb-host], [data-pcb-host], .group") || root.parentElement;
    if (!card) return;
    const cbox = card.getBoundingClientRect();
    // Posición a lo largo del tubo (0 = base, 1 = punta) para el destello;
    // −1‒1 en cada eje para la inclinación (X sobre el gráfico, Y sobre la tarjeta).
    const along = area.height ? (area.bottom - last.y) / area.height : 0.5;
    const across = box.width ? ((last.x - box.left) / box.width) * 2 - 1 : 0;
    const down = cbox.height ? ((last.y - cbox.top) / cbox.height) * 2 - 1 : 0;
    root.style.setProperty("--pcb-ma", clamp(along, 0, 1).toFixed(3));
    root.style.setProperty("--pcb-tx", clamp(across, -1, 1).toFixed(3));
    root.style.setProperty("--pcb-ty", clamp(down, -1, 1).toFixed(3));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduce) return undefined;

    const host =
      root.closest("[data-pg-host], [data-pb-host], [data-pcb-host]") || root.closest(".group") || root.parentElement;
    if (!host) return undefined;

    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      lastRef.current = { x: e.clientX, y: e.clientY };
      if (!frameRef.current) {
        frameRef.current = window.requestAnimationFrame(flush);
      }
    };
    const onEnter = (e) => {
      if (e.pointerType === "touch") return;
      root.dataset.hover = "true";
      onMove(e);
    };
    const onLeave = () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      lastRef.current = null;
      delete root.dataset.hover;
      // Vuelve al reposo: el CSS interpola gracias a @property.
      root.style.removeProperty("--pcb-ma");
      root.style.removeProperty("--pcb-tx");
      root.style.removeProperty("--pcb-ty");
    };

    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      delete root.dataset.hover;
    };
  }, [reduce, flush]);

  const last = rows.length - 1;

  return (
    <div
      ref={rootRef}
      className={cn("pcb-root", isDark ? "pcb-dark" : "pcb-light", className)}
      style={{ "--pcb-h": `${h}px` }}
      role="img"
      aria-label={t("busiestDays") || "busiestDays"}
    >
      {/* Ejes y cuadrícula (HTML: el texto no se deforma con el ancho). */}
      <div className="pcb-grid" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} className="pcb-gridline" style={{ bottom: `${(clamp(tick / maxAxis, 0, 1)) * 100}%` }}>
            <span className="pcb-ytick">{tick}</span>
          </span>
        ))}
      </div>

      <div ref={plotRef} className="pcb-plot">
        {rows.map((r, i) => (
          <Column
            key={i}
            target={clamp(r.value / maxAxis, 0, 1)}
            label={r.label}
            value={r.value}
            caption={t("responses")}
            align={i === 0 && last > 0 ? "start" : i === last && last > 0 ? "end" : "center"}
            reduce={reduce}
            filterId={filterId}
          />
        ))}
      </div>

      <div className="pcb-labels" aria-hidden="true">
        {rows.map((r, i) => (
          <span key={i} className="pcb-label">{r.label}</span>
        ))}
      </div>

      {/* Turbulencia para las ondas internas. Con reduced-motion queda estática.
          Frecuencias de PrismBar giradas 90°: lento a lo largo del tubo (y),
          fino a lo ancho (x). */}
      <svg className="pcb-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} x="-40%" y="-5%" width="180%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.045 0.012" numOctaves="2" seed="7" result="noise">
              {!reduce && (
                <animate
                  attributeName="baseFrequency"
                  dur="16s"
                  repeatCount="indefinite"
                  values="0.045 0.012;0.055 0.02;0.043 0.014;0.045 0.012"
                />
              )}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
