import { useEffect, useId, useRef } from "react";
import { Eye, MousePointerClick, CheckCircle2, Filter, TrendingDown, TrendingUp } from "lucide-react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ChartCard } from "./ChartCard.jsx";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismBars.css";

/* Las paletas por etapa (pizarra / ámbar / cian) viven como tokens CSS en
   PrismBars.css (`.fn-s-views`, `.fn-s-responses`, `.fn-s-completed`). */

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// Micro-burbujas ascendentes cerca de la punta (r = distancia al borde derecho).
const BUBBLES = [
  { r: 10, s: 2, d: 2.6, t: 0 },
  { r: 20, s: 3, d: 3.4, t: 0.9 },
  { r: 34, s: 2, d: 3.1, t: 1.7 },
  { r: 50, s: 2.5, d: 3.8, t: 0.4 },
];

/**
 * Fila de etapa: cápsula de cristal 4D con tubo de doble pared y fluido vivo.
 * La barra mide EXACTAMENTE el % mostrado (mínimo visual 3 %, como antes).
 */
function StageRow({ stage, pct, index, reduce }) {
  const uid = useId().replace(/:/g, "");
  const rowRef = useRef(null);
  const target = Math.max(pct, 3);

  // Llenado en cascada con física de resorte
  const spring = useSpring(0, { stiffness: 55, damping: 11, mass: 1.1 });
  useEffect(() => {
    if (reduce) {
      spring.jump(target);
      return undefined;
    }
    const timer = setTimeout(() => spring.set(target), 250 + index * 180);
    return () => clearTimeout(timer);
  }, [target, index, reduce, spring]);
  const width = useTransform(spring, (v) => `${clamp(v, 0, 100)}%`);

  // Reactividad al cursor: variables CSS, sin re-render
  const onMove = (e) => {
    if (reduce) return;
    const el = rowRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = clamp((e.clientX - r.left) / r.width, 0, 1);
    const y = clamp((e.clientY - r.top) / r.height, 0, 1);
    el.style.setProperty("--fn-mx", (x * 2 - 1).toFixed(3));
    el.style.setProperty("--fn-my", (y * 2 - 1).toFixed(3));
    el.style.setProperty("--fn-px", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--fn-py", `${(y * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = rowRef.current;
    if (!el) return;
    ["--fn-mx", "--fn-my", "--fn-px", "--fn-py"].forEach((k) => el.style.removeProperty(k));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        ref={rowRef}
        className={cn("pb-row fn-row", `fn-s-${stage.key}`)}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <span className="fn-icon">
          <stage.icon className="h-4 w-4" strokeWidth={1.9} />
        </span>

        <span className="pb-name">{stage.label}</span>

        {/* tubo de cristal de doble pared + fluido */}
        <span className="fn-tube" aria-hidden="true">
          <motion.span className="fn-caustic" style={{ width }} />
          <span className="fn-chan">
            <motion.span className="fn-fluid" style={{ width }}>
              <svg className="fn-flow" viewBox="0 0 200 10" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`${uid}-st`} x1="0" y1="0" x2="0.16" y2="0.35" spreadMethod="repeat">
                    <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                    <stop offset="0.5" stopColor="currentColor" stopOpacity="0.55" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                  <filter id={`${uid}-tb`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves="2" seed={3 + index} result="n">
                      {!reduce && (
                        <animate
                          attributeName="baseFrequency"
                          dur={`${10 + index * 2}s`}
                          repeatCount="indefinite"
                          values="0.012 0.09;0.022 0.13;0.014 0.08;0.012 0.09"
                        />
                      )}
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                </defs>
                <rect width="200" height="10" fill={`url(#${uid}-st)`} filter={`url(#${uid}-tb)`} />
              </svg>
              <span className="fn-sweep" />
              <span className="fn-core" />
              <span className="fn-spec" />
              <span className="fn-depth" />
              {BUBBLES.map((b, i) => (
                <span key={i} className="fn-bubble" style={{ "--r": `${b.r}px`, "--s": `${b.s}px`, "--d": `${b.d}s`, "--t": `${b.t}s` }} />
              ))}
              <span className="fn-meniscus" />
            </motion.span>
          </span>
          <span className="fn-front">
            <span className="fn-glint" />
          </span>
        </span>

        <span className="pb-count">{stage.value.toLocaleString()}</span>
        <span className="pb-pill fn-pill">{pct}%</span>
      </div>
    </motion.div>
  );
}

/**
 * Embudo de conversión: Views → Responses → Completed.
 * Cápsulas de cristal 4D con fluido luminoso por etapa; conectores con pulso
 * de energía y chips semánticos de retención (sin cambios de texto ni color).
 */
export function Funnel({ views = 0, responses = 0, completionRate = 0 }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const reduce = useReducedMotion();
  const completed = Math.round((responses * completionRate) / 100);
  const max = Math.max(views, 1);

  const stages = [
    { key: "views", label: t("totalViews"), value: views, icon: Eye },
    { key: "responses", label: t("responses"), value: responses, icon: MousePointerClick },
    { key: "completed", label: t("completed"), value: completed, icon: CheckCircle2 },
  ];

  return (
    <ChartCard title={t("conversionFunnel")} subtitle={t("funnelDescription")} icon={Filter}>
      <div className={cn("pb-list fn-list", isDark ? "pb-dark fn-dark" : "pb-light fn-light")}>
        {stages.map((s, i) => {
          const pct = Math.round((s.value / max) * 100);
          const prev = i > 0 ? stages[i - 1] : null;
          const dropPct = prev && prev.value > 0 ? Math.round((s.value / prev.value) * 100) : null;
          const isGood = dropPct != null && dropPct >= 50;

          return (
            <div key={s.key}>
              {/* conector entre etapas con pulso de energía descendente */}
              {i > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-2 ml-1 flex items-center gap-2"
                >
                  <div aria-hidden="true" className={cn("fn-link", `fn-from-${prev.key}`, `fn-to-${s.key}`)} />
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide shadow-sm backdrop-blur-sm",
                      isGood
                        ? "border-emerald-200/70 bg-emerald-50/90 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-[0_0_14px_rgba(16,185,129,0.18)]"
                        : "border-red-200/70 bg-red-50/90 text-red-600 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-400 dark:shadow-[0_0_14px_rgba(239,68,68,0.18)]",
                    )}
                  >
                    {isGood ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {dropPct}% {t("retained")}
                  </span>
                </motion.div>
              )}

              <StageRow stage={s} pct={pct} index={i} reduce={reduce} />
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
