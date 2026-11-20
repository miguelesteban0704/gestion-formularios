import { useEffect, useId, useRef } from "react";
import { useReducedMotion, animate, useMotionValue } from "framer-motion";
import { cn } from "../../lib/utils.js";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismBar.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismBar — cápsula horizontal 4D: fluido luminoso dentro de un canal de
   cristal de doble pared. Sustituye la barra plana de progreso de KpiCard
   (`Tasa de conversión de respuestas` → acento `gold`, `Finalización` →
   acento `green`).

   Qué se conserva del KpiCard original:
   · Ancho: 100 % del contenido de la tarjeta (`w-full`), sin ancho propio.
   · Colores: los del `ACCENTS[*].bar` de KpiCard (ámbar 400→600 para `gold`,
     esmeralda 400→teal 600 para `green`), leídos como tokens `--color-*`
     en PrismBar.css. Ningún color vive en este JSX.
   · Valor: `value` es 0‒100, igual que `progress` en KpiCard.

   Decisiones de implementación (el porqué):
   · Geometría 100 % CSS (no SVG con viewBox fijo): el tubo mide `height` px
     de grueso a cualquier ancho. Con viewBox 200×28 el grosor cambiaba con el
     ancho de la tarjeta y la prop `height` no hacía nada.
   · El único SVG es un <filter> de turbulencia para las ondas internas. Su id
     sale de useId(): con dos barras en la misma página (conversión y
     finalización) un id fijo hace que la segunda reutilice el filtro de la
     primera.
   · El nivel lo mueve un resorte de framer-motion (ya dependencia del
     proyecto, igual que PrismGauge) que escribe `--pb-fill` por ref: cero
     re-renders por frame y el menisco, las cáusticas y el relleno siguen la
     misma variable.
   · Reactividad: escucha el puntero sobre la tarjeta anfitriona (nunca sobre
     la barra sola) y escribe `--pb-mx/--pb-tx/--pb-ty` en el root. Sin estado
     React.
   ──────────────────────────────────────────────────────────────────────── */

// Acentos que KpiCard puede pasar. Cada uno tiene su clase `.pb-accent-*` en
// el CSS; cualquier otro valor cae en `brand` (igual que `ACCENTS.brand`).
const ACCENT_KEYS = new Set(["brand", "gold", "slate", "green", "amber", "pink", "violet"]);

// Resorte suave con una pizca de rebote (ζ ≈ 0.79): la barra "pesa", llega y
// se asienta sin oscilar de forma visible.
const SPRING = { stiffness: 90, damping: 15, mass: 1 };

// Mismo retardo que tenía la barra plana (delay 0.2) para no adelantarse a la
// entrada de la tarjeta.
const INTRO_DELAY_MS = 220;

const MIN_HEIGHT = 8;
const DEFAULT_HEIGHT = 14;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export default function PrismBar({ value = 0, accent = "brand", height = DEFAULT_HEIGHT, label = "Progreso" }) {
  const { isDark } = useTheme();
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const introRef = useRef(true);
  const fill = useMotionValue(0);

  // useId devuelve `:r1:` / `«r1»` según la versión de React; esos caracteres
  // no son seguros dentro de `url(#…)`.
  const filterId = `pb-flow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const pct = Number.isFinite(value) ? clamp(value, 0, 100) : 0;
  const target = pct / 100;
  const accentKey = ACCENT_KEYS.has(accent) ? accent : "brand";
  const h = Number.isFinite(height) ? Math.max(MIN_HEIGHT, height) : DEFAULT_HEIGHT;

  // ── Nivel con resorte (framer-motion, sin @react-spring/web) ─────────
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const paint = (v) => root.style.setProperty("--pb-fill", clamp(v, 0, 1).toFixed(4));

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

  // ── Reactividad al puntero (micro-elevación + brillo + cáustica) ─────
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduce) return undefined;

    // El anfitrión es la tarjeta KPI: `[data-pg-host]` (convención de
    // PrismGauge), `[data-pb-host]` o, por defecto, el `.group` de KpiCard.
    const host = root.closest("[data-pg-host], [data-pb-host]") || root.closest(".group") || root.parentElement;
    if (!host) return undefined;

    let frame = 0;
    let last = null;

    const flush = () => {
      frame = 0;
      if (!last) return;
      const bar = root.getBoundingClientRect();
      const card = host.getBoundingClientRect();
      // Posición a lo largo del tubo (0‒1) para el destello; −1‒1 en cada eje
      // para la inclinación (X sobre la barra, Y sobre toda la tarjeta).
      const along = bar.width ? (last.x - bar.left) / bar.width : 0.5;
      const down = card.height ? ((last.y - card.top) / card.height) * 2 - 1 : 0;
      root.style.setProperty("--pb-mx", clamp(along, 0, 1).toFixed(3));
      root.style.setProperty("--pb-tx", clamp(along * 2 - 1, -1, 1).toFixed(3));
      root.style.setProperty("--pb-ty", clamp(down, -1, 1).toFixed(3));
    };

    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      last = { x: e.clientX, y: e.clientY };
      if (!frame) frame = window.requestAnimationFrame(flush);
    };
    const onEnter = (e) => {
      if (e.pointerType === "touch") return;
      root.dataset.hover = "true";
      onMove(e);
    };
    const onLeave = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      last = null;
      delete root.dataset.hover;
      // Vuelve al reposo: el CSS interpola gracias a @property.
      root.style.removeProperty("--pb-mx");
      root.style.removeProperty("--pb-tx");
      root.style.removeProperty("--pb-ty");
    };

    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      delete root.dataset.hover;
    };
  }, [reduce]);

  return (
    <div
      ref={rootRef}
      className={cn("pb-root", `pb-accent-${accentKey}`, isDark ? "pb-dark" : "pb-light")}
      style={{ "--pb-h": `${h}px` }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      {/* Cáusticas proyectadas sobre la tarjeta: base (sigue al nivel) y reactiva (sigue al cursor). */}
      <span className="pb-caustic pb-caustic--base" aria-hidden="true" />
      <span className="pb-caustic pb-caustic--reactive" aria-hidden="true" />

      <div className="pb-stage" aria-hidden="true">
        <div className="pb-tube">
          {/* Canal: pared interior con sombra profunda (inset). */}
          <span className="pb-well" />

          {/* Fluido: capas de profundidad, de abajo hacia arriba. */}
          <div className="pb-water">
            <span className="pb-liquid" />
            <span className="pb-flow-wrap" style={{ filter: `url(#${filterId})` }}>
              <span className="pb-flow" />
            </span>
            <span className="pb-core" />
            <span className="pb-depth" />
            <span className="pb-spec" />
          </div>

          {/* Menisco luminoso en la punta exacta del porcentaje. */}
          <span className="pb-meniscus">
            <span className="pb-meniscus-glow" />
            <span className="pb-meniscus-bead" />
            <span className="pb-flare" />
            <span className="pb-spark pb-spark--1" />
            <span className="pb-spark pb-spark--2" />
            <span className="pb-spark pb-spark--3" />
            <span className="pb-spark pb-spark--4" />
            <span className="pb-spark pb-spark--5" />
          </span>

          {/* Pared frontal de cristal: bisel doble y reflejos por encima del fluido. */}
          <span className="pb-glass" />
          <span className="pb-glint" />
        </div>
      </div>

      {/* Turbulencia para las ondas internas. Con reduced-motion queda estática. */}
      <svg className="pb-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} x="-5%" y="-40%" width="110%" height="180%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves="2" seed="7" result="noise">
              {!reduce && (
                <animate
                  attributeName="baseFrequency"
                  dur="16s"
                  repeatCount="indefinite"
                  values="0.012 0.09;0.02 0.11;0.014 0.085;0.012 0.09"
                />
              )}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
