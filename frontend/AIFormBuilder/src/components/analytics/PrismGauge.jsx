import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import { cn } from "../../lib/utils.js";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismGauge.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismGauge — "Tasa de finalización" 4D.
   Agua coloreada dentro de un tubo de cristal semicircular de doble pared.
   · Nivel con física de resorte (framer-motion useSpring, sin re-render por frame).
   · Turbulencia viva (feTurbulence + feDisplacementMap animados con SMIL, sin JS).
   · Menisco con oleaje y micro-burbujas en la punta del nivel.
   · Inclinación 3D + brillo especular/cáusticas que siguen al cursor (CSS vars).
   Todos los colores viven como tokens CSS en PrismGauge.css (qa:brand).
   ──────────────────────────────────────────────────────────────────────── */

// Geometría del semicírculo (viewBox 200×140)
const R = 82;
const CX = 100;
const CY = 96;
const SW = 16;
const arc = (r) => `M ${CX - r} ${CY} A ${r} ${r} 0 0 1 ${CX + r} ${CY}`;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

const BUBBLES = [
  { x: -3, y: 1, r: 0.9, d: 3.2, t: 0 },
  { x: -7, y: -3, r: 0.6, d: 4.1, t: 0.7 },
  { x: -11, y: 3, r: 1.1, d: 3.7, t: 1.4 },
  { x: -5, y: 4, r: 0.5, d: 4.6, t: 2.1 },
  { x: -15, y: -1, r: 0.7, d: 3.9, t: 2.8 },
  { x: -9, y: 0, r: 0.45, d: 5, t: 0.3 },
];

export default function PrismGauge({ value = 0, suffix = "%", label }) {
  const { isDark } = useTheme();
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const id = (n) => `pg-${uid}-${n}`;
  const ref = (n) => `url(#${id(n)})`;

  const pct = clamp(value, 0, 100) / 100;

  const rootRef = useRef(null);
  const dashEls = useRef([]); // trazos que comparten el progreso del líquido
  const capRef = useRef(null); // traslación a la punta del nivel
  const rotRef = useRef(null); // orientación tangente al arco

  /* ── Nivel con resorte ── */
  const spring = useSpring(0, { stiffness: 60, damping: 11, mass: 1.1 });

  useEffect(() => {
    const apply = (v) => {
      const p = clamp(v, 0, 1);
      const dash = `${p} 2`;
      dashEls.current.forEach((el) => el && el.setAttribute("stroke-dasharray", dash));
      const a = -Math.PI + p * Math.PI;
      const x = CX + R * Math.cos(a);
      const y = CY + R * Math.sin(a);
      capRef.current?.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      rotRef.current?.setAttribute("transform", `rotate(${(((a + Math.PI / 2) * 180) / Math.PI).toFixed(2)})`);
      capRef.current?.setAttribute("opacity", p > 0.012 ? "1" : "0");
      const gold = clamp((p - 0.38) / 0.3, 0, 1) * 100; // mismo recorrido que el degradado
      capRef.current?.style.setProperty("--pg-tip", gold.toFixed(1));
    };
    apply(spring.get());
    return spring.on("change", apply);
  }, [spring]);

  useEffect(() => {
    if (reduce) spring.jump(pct);
    else spring.set(pct);
  }, [pct, reduce, spring]);

  /* ── Reactividad al cursor (CSS vars, sin estado React) ── */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduce) return undefined;
    const host = root.closest("[data-pg-host]") || root.parentElement || root;
    const move = (e) => {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      const y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      root.style.setProperty("--pg-mx", x.toFixed(3));
      root.style.setProperty("--pg-my", y.toFixed(3));
    };
    const enter = () => root.setAttribute("data-hover", "true");
    const leave = () => {
      root.removeAttribute("data-hover");
      root.style.setProperty("--pg-mx", "0");
      root.style.setProperty("--pg-my", "0");
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
    };
  }, [reduce]);

  const dashRef = (i) => (el) => {
    dashEls.current[i] = el;
  };
  const stopStyle = (token, opacity = 1) => ({ stopColor: `var(${token})`, stopOpacity: opacity });
  const FILTER_AREA = { filterUnits: "userSpaceOnUse", x: 0, y: 0, width: 200, height: 140 };

  return (
    <div
      ref={rootRef}
      className={cn("pg-root", isDark ? "pg-dark" : "pg-light")}
      style={{ "--pg-pct": pct }}
    >
      {/* Cáusticas proyectadas sobre el fondo de la tarjeta */}
      <div className="pg-caustic pg-caustic--base" aria-hidden="true" />
      <div className="pg-caustic pg-caustic--reactive" aria-hidden="true" />

      <div className="pg-stage">
        <svg
          viewBox="0 0 200 140"
          className="pg-svg"
          role="img"
          aria-label={`${label ?? ""} ${Math.round(value)}${suffix}`.trim()}
        >
          <defs>
            {/* Agua: gradiente fijo en el espacio (cian → verde agua → ámbar) */}
            <linearGradient id={id("liquid")} gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="186" y2="0">
              <stop offset="0%" style={stopStyle("--pg-cyan", 0.96)} />
              <stop offset="38%" style={stopStyle("--pg-teal", 0.93)} />
              <stop offset="68%" style={stopStyle("--pg-gold", 0.98)} />
              <stop offset="100%" style={stopStyle("--pg-gold", 1)} />
            </linearGradient>
            <linearGradient id={id("deep")} gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="186" y2="0">
              <stop offset="0%" style={stopStyle("--pg-teal-deep", 0.8)} />
              <stop offset="40%" style={stopStyle("--pg-teal-deep", 0.7)} />
              <stop offset="70%" style={stopStyle("--pg-gold-deep", 0.85)} />
              <stop offset="100%" style={stopStyle("--pg-gold-deep", 0.9)} />
            </linearGradient>
            <linearGradient id={id("core")} gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="186" y2="0">
              <stop offset="0%" style={stopStyle("--pg-cyan-light", 0.9)} />
              <stop offset="40%" style={stopStyle("--pg-cyan-light", 0.7)} />
              <stop offset="70%" style={stopStyle("--pg-gold", 0.85)} />
              <stop offset="100%" style={stopStyle("--pg-gold", 0.95)} />
            </linearGradient>

            {/* Cristal: brillo de cara superior y relleno neutro del canal */}
            <linearGradient id={id("sheen")} gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="100">
              <stop offset="0%" style={stopStyle("--pg-white", 0.38)} />
              <stop offset="45%" style={stopStyle("--pg-white", 0.08)} />
              <stop offset="100%" style={stopStyle("--pg-white", 0)} />
            </linearGradient>
            <linearGradient id={id("track")} gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="100">
              <stop offset="0%" style={stopStyle("--pg-track-a")} />
              <stop offset="100%" style={stopStyle("--pg-track-b")} />
            </linearGradient>
            <linearGradient id={id("wall")} gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="100">
              <stop offset="0%" style={stopStyle("--pg-glass-hi")} />
              <stop offset="100%" style={stopStyle("--pg-glass-lo")} />
            </linearGradient>
            <radialGradient id={id("dome")} cx="35%" cy="30%" r="75%">
              <stop offset="0%" style={stopStyle("--pg-white", 0.75)} />
              <stop offset="55%" style={stopStyle("--pg-white", 0.22)} />
              <stop offset="100%" style={stopStyle("--pg-white", 0.04)} />
            </radialGradient>

            {/* Elevación flotante + sombra del tubo (feDropShadow) */}
            <filter id={id("float")} {...FILTER_AREA}>
              <feDropShadow dx="0" dy="4" stdDeviation="3.2" style={{ floodColor: "var(--pg-drop)" }} />
            </filter>

            {/* Sombra interior del canal */}
            <filter id={id("inset")} {...FILTER_AREA}>
              <feComponentTransfer in="SourceAlpha" result="inv">
                <feFuncA type="table" tableValues="1 0" />
              </feComponentTransfer>
              <feGaussianBlur in="inv" stdDeviation="2.2" />
              <feOffset dy="2.4" result="sh" />
              <feFlood style={{ floodColor: "var(--pg-inset)" }} />
              <feComposite in2="sh" operator="in" />
              <feComposite in2="SourceAlpha" operator="in" result="ins" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="ins" />
              </feMerge>
            </filter>

            {/* Turbulencia viva del agua (corrientes internas) */}
            <filter id={id("water")} {...FILTER_AREA} colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="2" seed="7" result="n">
                {!reduce && (
                  <animate
                    attributeName="baseFrequency"
                    dur="14s"
                    repeatCount="indefinite"
                    values="0.02 0.05;0.034 0.072;0.022 0.046;0.02 0.05"
                  />
                )}
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
            </filter>

            {/* Dispersión subsuperficial: halo suave del núcleo */}
            <filter id={id("sss")} {...FILTER_AREA}>
              <feGaussianBlur stdDeviation="1.8" />
            </filter>
            <filter id={id("soft")} {...FILTER_AREA}>
              <feGaussianBlur stdDeviation="0.9" />
            </filter>
            <filter id={id("glow")} {...FILTER_AREA}>
              <feGaussianBlur stdDeviation="7" />
            </filter>

            {/* Máscara: el agua queda confinada al canal interior */}
            <mask id={id("mask")} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="140">
              <path d={arc(R)} fill="none" stroke="white" strokeWidth={SW - 1.5} strokeLinecap="round" />
            </mask>
          </defs>

          {/* ───── 1. TUBO DE CRISTAL (doble pared) ───── */}
          <g className="pg-tube">
            <path
              className="pg-tube-outer"
              d={arc(R)}
              fill="none"
              stroke={ref("wall")}
              strokeWidth={SW + 6}
              strokeLinecap="round"
              filter={ref("float")}
            />
            <path
              className="pg-tube-channel"
              d={arc(R)}
              fill="none"
              stroke={ref("track")}
              strokeWidth={SW}
              strokeLinecap="round"
              filter={ref("inset")}
            />
            {/* punta derecha del tubo: vidrio teñido de ámbar/dorado */}
            <path
              className="pg-tip-tint"
              d={arc(R)}
              pathLength="1"
              fill="none"
              strokeWidth={SW}
              strokeLinecap="round"
              strokeDasharray="0.2 2"
              strokeDashoffset="-0.8"
              filter={ref("soft")}
            />
            {/* bordes biselados: pared exterior e interior */}
            <path className="pg-bevel pg-bevel--out" d={arc(R + SW / 2 + 3)} fill="none" strokeWidth="0.9" />
            <path className="pg-bevel pg-bevel--in" d={arc(R + SW / 2)} fill="none" strokeWidth="0.7" />
            <path className="pg-bevel pg-bevel--in" d={arc(R - SW / 2)} fill="none" strokeWidth="0.7" />
            <path className="pg-bevel pg-bevel--out" d={arc(R - SW / 2 - 3)} fill="none" strokeWidth="0.9" />
          </g>

          {/* ───── 2. AGUA VIVA ───── */}
          <g className="pg-water" mask={ref("mask")}>
            <g filter={ref("water")}>
              <path
                ref={dashRef(0)}
                d={arc(R)}
                pathLength="1"
                fill="none"
                stroke={ref("deep")}
                strokeWidth={SW + 4}
                strokeDasharray="0 2"
              />
              <path
                ref={dashRef(1)}
                d={arc(R)}
                pathLength="1"
                fill="none"
                stroke={ref("liquid")}
                strokeWidth={SW - 2}
                strokeDasharray="0 2"
              />
            </g>
            {/* núcleo translúcido iluminado (subsurface scattering) */}
            <path
              ref={dashRef(2)}
              className="pg-core"
              d={arc(R + 1)}
              pathLength="1"
              fill="none"
              stroke={ref("core")}
              strokeWidth="5"
              strokeDasharray="0 2"
              filter={ref("sss")}
            />
            {/* sombra de profundidad (borde interior) */}
            <path
              ref={dashRef(3)}
              className="pg-depth"
              d={arc(R - SW / 2 + 1.6)}
              pathLength="1"
              fill="none"
              strokeWidth="3"
              strokeDasharray="0 2"
              filter={ref("soft")}
            />
            {/* reflejo especular curvo en el borde superior */}
            <path
              ref={dashRef(4)}
              className="pg-spec"
              d={arc(R + SW / 2 - 2.6)}
              pathLength="1"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="0 2"
            />

            {/* ───── 3. MENISCO + BURBUJAS ───── */}
            <g ref={capRef} className="pg-cap" opacity="0">
              <g ref={rotRef}>
                <path className="pg-meniscus" d="M -3 -7.5 Q 6 -4 3 0 T -3 7.5 Z">
                  {!reduce && (
                    <animate
                      attributeName="d"
                      dur="3.6s"
                      repeatCount="indefinite"
                      calcMode="spline"
                      keyTimes="0;0.33;0.66;1"
                      keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1"
                      values="M -3 -7.5 Q 6 -4 3 0 T -3 7.5 Z;M -3 -7.5 Q 4 -5 4.6 0 T -3 7.5 Z;M -3 -7.5 Q 7 -3 2.4 0 T -3 7.5 Z;M -3 -7.5 Q 6 -4 3 0 T -3 7.5 Z"
                    />
                  )}
                </path>
                <path className="pg-meniscus-sheen" fill={ref("dome")} d="M -3 -7.5 Q 6 -4 3 0 T -3 7.5 Z" />
                <ellipse className="pg-meniscus-spec" cx="1" cy="-3.6" rx="2.6" ry="0.9" />
                <g aria-hidden="true">
                  {BUBBLES.map((b, i) => (
                    <circle
                      key={i}
                      className="pg-bubble"
                      cx={b.x}
                      cy={b.y}
                      r={b.r}
                      style={{ animationDuration: `${b.d}s`, animationDelay: `${b.t}s` }}
                    />
                  ))}
                </g>
              </g>
            </g>
          </g>

          {/* resplandor de color bajo el tubo */}
          <path
            ref={dashRef(5)}
            className="pg-underglow"
            d={arc(R)}
            pathLength="1"
            fill="none"
            stroke={ref("liquid")}
            strokeWidth={SW + 6}
            strokeDasharray="0 2"
            filter={ref("glow")}
          />

          {/* ───── 4. VIDRIO FRONTAL: brillo y reflejo que sigue al cursor ───── */}
          <path
            className="pg-front"
            d={arc(R)}
            fill="none"
            stroke={ref("sheen")}
            strokeWidth={SW + 2}
            strokeLinecap="round"
          />
          <path
            className="pg-glint pg-glint--wide"
            d={arc(R + SW / 2 - 1)}
            pathLength="1"
            fill="none"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="0.26 2"
            filter={ref("soft")}
          />
          <path
            className="pg-glint"
            d={arc(R + SW / 2 - 1)}
            pathLength="1"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="0.12 2"
          />
        </svg>
      </div>

      {/* ───── CENTRO: VALOR + ETIQUETA (sin cambios) ───── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pg-center"
      >
        <p className="pg-val">
          {Math.round(value)}
          <span className="pg-suffix">{suffix}</span>
        </p>
        {label && <p className="pg-lab">{label}</p>}
      </motion.div>
    </div>
  );
}
