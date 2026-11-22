import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Flame,
  Layers,
  Radio,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { cn } from "../../lib/utils.js";
import { usePublicInsights } from "../../hooks/usePublicInsights.js";

/**
 * Contador numérico con interpolación física suave
 */
function CountUp({ end = 0, duration = 1800, className, suffix = "", prefix = "", decimals = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentVal = eased * end;
      setCount(decimals > 0 ? Number(currentVal.toFixed(decimals)) : Math.floor(currentVal));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, decimals]);

  return (
    <span className={className}>
      {prefix}
      {count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/**
 * Tarjeta Espacial con Spotlight Magnético que sigue el cursor
 */
function SpotlightCard({ children, className, delay = 0 }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative rounded-2xl border transition-all duration-300 overflow-hidden",
        "border-slate-200/80 bg-white/75 shadow-[0_8px_32px_rgba(0,48,135,0.06)]",
        "dark:border-white/10 dark:bg-[#09142e]/70 dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
        "backdrop-blur-2xl backdrop-saturate-150",
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              420px circle at ${mouseX}px ${mouseY}px,
              rgba(0, 48, 135, 0.14),
              rgba(176, 8, 40, 0.08) 45%,
              transparent 80%
            )
          `,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-blue-300/25"
        aria-hidden="true"
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

/**
 * Gráfico de área con curva Bézier suave y nodo de telemetría activo
 */
function FuturisticAreaChart({ data = [], id = "futuristic-grad" }) {
  if (!data || data.length < 2) return null;

  const width = 280;
  const height = 74;
  const padY = 10;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => ({
    x: (idx / (data.length - 1)) * width,
    y: height - padY - ((val - min) / range) * (height - padY * 2),
  }));

  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const ctrlX = (curr.x + next.x) / 2;
    pathD += ` C ${ctrlX},${curr.y} ${ctrlX},${next.y} ${next.x},${next.y}`;
  }

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B00828" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#003087" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#003087" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#003087" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#B00828" />
        </linearGradient>
      </defs>

      <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
      <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />

      <path d={areaD} fill={`url(#${id})`} />
      <motion.path
        d={pathD}
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="2.8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      <circle cx={last.x} cy={last.y} r="6" fill="#B00828" fillOpacity="0.25" />
      <circle cx={last.x} cy={last.y} r="3.2" fill="#B00828" stroke="#ffffff" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * HomeHeroSection - Centro de Comando Futurista e Innovador con Telemetría Real
 */
export function HomeHeroSection({ onSelectForm }) {
  const { t, language } = useLanguage();
  const isEs = language !== "en";
  const [hudTab, setHudTab] = useState("pulse");
  const heroRef = useRef(null);
  const bgMouseX = useMotionValue(500);
  const bgMouseY = useMotionValue(200);

  const { data: insights, loading: insightsLoading } = usePublicInsights();

  function handleHeroMouseMove(e) {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    bgMouseX.set(e.clientX - rect.left);
    bgMouseY.set(e.clientY - rect.top);
  }

  const analytics = useMemo(() => {
    if (!insights || insightsLoading) {
      return {
        responsesCount: 0,
        formsCount: 0,
        entitiesCount: 0,
        avgResponses: 0,
        topForms: [],
        maxTopCount: 1,
        tickerItems: [],
        chartSeries: [18, 25, 22, 34, 31, 48, 44, 62, 59, 78, 85, 96],
        totalViews: 0,
        conversion: 0,
      };
    }

    const stats = insights.stats || {};
    const topForms = insights.topForms || [];

    const formattedTopForms = topForms
      .map((f, idx) => ({
        id: f.id,
        title: f.title || (isEs ? `Formulario #${idx + 1}` : `Form #${idx + 1}`),
        category: f.theme || f.entity || "General",
        count: f.responses || 0,
        raw: f,
      }))
      .sort((a, b) => b.count - a.count);

    const maxTopCount = formattedTopForms[0]?.count || 1;
    const chartSeries = (insights.timeline || []).map((tItem) => tItem.count || 0);

    return {
      responsesCount: stats.totalResponses || 0,
      formsCount: stats.published || stats.totalForms || 0,
      entitiesCount: 0,
      avgResponses: stats.totalForms > 0 ? (stats.totalResponses || 0) / stats.totalForms : 0,
      topForms: formattedTopForms.slice(0, 3),
      maxTopCount,
      tickerItems: formattedTopForms.slice(0, 8),
      chartSeries: chartSeries.length >= 2 ? chartSeries : [18, 25, 22, 34, 31, 48, 44, 62, 59, 78, 85, 96],
      totalViews: stats.totalViews || 0,
      conversion: stats.conversion || 0,
    };
  }, [insights, insightsLoading, isEs]);

  const copy = {
    badge:
      t("heroBadge") !== "heroBadge"
        ? t("heroBadge")
        : isEs
        ? "ECOSISTEMA DE INTELIGENCIA Y PARTICIPACIÓN"
        : "INTELLIGENCE & PARTICIPATION ECOSYSTEM",
    title1:
      t("heroTitleLine1") !== "heroTitleLine1"
        ? t("heroTitleLine1")
        : isEs
        ? "La nueva era de los"
        : "The next era of",
    title2:
      t("heroTitleLine2") !== "heroTitleLine2"
        ? t("heroTitleLine2")
        : isEs
        ? "formularios inteligentes"
        : "intelligent forms",
    subtitle:
      t("heroSubtitle") !== "heroSubtitle"
        ? t("heroSubtitle")
        : isEs
        ? "Crea encuestas impulsadas por IA, recopila participación en tiempo real y visualiza el pulso estadístico de cada iniciativa desde un solo lugar."
        : "Build AI-assisted surveys, capture real-time participation, and visualize statistical telemetry for every initiative in one place.",
    ctaPrimary:
      t("heroCtaPrimary") !== "heroCtaPrimary"
        ? t("heroCtaPrimary")
        : isEs
        ? "Explorar formularios"
        : "Explore forms",
    ctaSecondary:
      t("heroCtaSecondary") !== "heroCtaSecondary"
        ? t("heroCtaSecondary")
        : isEs
        ? "Analítica global"
        : "Global analytics",
    catalogBadge: isEs ? "PARTICIPACIÓN CIUDADANA E INSTITUCIONAL" : "PUBLIC & INSTITUTIONAL PARTICIPATION",
    catalogTitle:
      t("heroDividerLabel") !== "heroDividerLabel"
        ? t("heroDividerLabel")
        : isEs
        ? "Consultas y Formularios Públicos Disponibles"
        : "Available Public Surveys & Forms",
    catalogDescription: isEs
      ? "Selecciona cualquiera de las iniciativas abiertas a continuación para aportar tu opinión, completar trámites digitales o participar en estudios estadísticos activos. Tus respuestas alimentan directamente los indicadores en tiempo real."
      : "Select any of the open initiatives below to share your feedback, complete digital procedures, or participate in active statistical studies. Your responses directly power real-time insights.",
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={handleHeroMouseMove}
      className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-[#040917] dark:via-[#071129] dark:to-[#0c0818] mb-10 shadow-[0_20px_70px_-15px_rgba(0,48,135,0.12)] dark:shadow-[0_24px_80px_-15px_rgba(0,0,0,0.7)]"
      aria-labelledby="hero-title"
    >
      {/* MALLA PERSPECTIVA FUTURISTA + SPOTLIGHT INTERACTIVO */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 48, 135, 0.14) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 48, 135, 0.14) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 20%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 20%, black 30%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <motion.div
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${bgMouseX}px ${bgMouseY}px,
              rgba(0, 48, 135, 0.12),
              rgba(176, 8, 40, 0.06) 40%,
              transparent 75%
            )
          `,
        }}
        aria-hidden="true"
      />

      {/* Orbes de energía ambiental */}
      <div
        className="pointer-events-none absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-[#003087]/15 dark:bg-[#003087]/35 blur-[110px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 right-10 h-[360px] w-[360px] rounded-full bg-[#B00828]/12 dark:bg-[#B00828]/25 blur-[100px]"
        aria-hidden="true"
      />

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative z-10 px-6 pt-10 pb-8 sm:px-10 sm:pt-14 lg:px-14 lg:pt-16">
        {/* ===== NIVEL 1: HERO ESPACIAL ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center mb-12">
          {/* Columna Izquierda (7 cols) */}
          <div className="lg:col-span-7 text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#003087]/25 dark:border-blue-400/30 bg-white/80 dark:bg-blue-950/50 shadow-sm backdrop-blur-md mb-6"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B00828] opacity-80" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#B00828]" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold tracking-[0.12em] text-[#003087] dark:text-blue-200 uppercase">
                {copy.badge}
              </span>
              <Cpu className="h-3.5 w-3.5 text-[#B00828] dark:text-[#ff4d6d]" />
            </motion.div>

            <motion.h1
              id="hero-title"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-3xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]"
            >
              {copy.title1}{" "}
              <span className="block mt-1 bg-gradient-to-r from-[#003087] via-[#1e5fd9] to-[#B00828] dark:from-blue-300 dark:via-indigo-200 dark:to-[#ff4d6d] bg-clip-text text-transparent">
                {copy.title2}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-5 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300/90 leading-relaxed"
            >
              {copy.subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-4 justify-center"
            >
              <a
                href="#formularios"
                className="group relative inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#003087] via-[#003ea8] to-[#B00828] px-7 py-4 text-sm sm:text-base font-bold text-white shadow-[0_10px_30px_-6px_rgba(0,48,135,0.45)] hover:shadow-[0_14px_36px_-4px_rgba(176,8,40,0.45)] transition-all duration-300"
              >
                <BarChart3 className="h-4 w-4 text-amber-200 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                <span>{copy.ctaSecondary}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </motion.div>
          </div>

          {/* Columna Derecha: CONSOLA HUD INTERACTIVA (5 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
            className="lg:col-span-5"
          >
            <div className="relative rounded-3xl border border-slate-200/90 dark:border-white/15 bg-white/85 dark:bg-[#071026]/85 p-5 sm:p-6 shadow-[0_24px_60px_-15px_rgba(0,48,135,0.2)] dark:shadow-[0_24px_70px_-10px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none absolute -top-6 -right-6 h-28 w-28 rounded-full border border-dashed border-[#003087]/25 dark:border-blue-400/20"
                aria-hidden="true"
              />

              <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200/70 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[#B00828] dark:text-[#ff4d6d] animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {isEs ? "Telemetría en Vivo" : "Live Telemetry"}
                  </span>
                </div>

                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-white/5 p-1 border border-slate-200/60 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setHudTab("pulse")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                      hudTab === "pulse"
                        ? "bg-[#003087] text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {isEs ? "Pulso" : "Pulse"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHudTab("ranking")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                      hudTab === "ranking"
                        ? "bg-[#B00828] text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {isEs ? "Top Activos" : "Top Active"}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {hudTab === "pulse" ? (
                  <motion.div
                    key="pulse-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#003087]/8 via-transparent to-[#B00828]/8 dark:from-[#003087]/35 dark:to-[#B00828]/25 p-4 border border-[#003087]/15 dark:border-white/10">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {isEs ? "Participación acumulada" : "Total participation"}
                        </p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <CountUp
                            end={analytics.responsesCount}
                            className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white"
                          />
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {isEs ? "respuestas" : "responses"}
                          </span>
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#003087] text-white shadow-lg shadow-[#003087]/30">
                        <Zap className="h-6 w-6 text-amber-300" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {isEs ? "Curva de actividad reciente" : "Recent activity curve"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-[#B00828] dark:text-[#ff4d6d]">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {isEs ? "En tiempo real" : "Real-time"}
                        </span>
                      </div>
                      <div className="h-20 w-full text-slate-400">
                        <FuturisticAreaChart data={analytics.chartSeries} id="hud-curve" />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ranking-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-[#B00828]" />
                      {isEs
                        ? "Formularios con mayor volumen de respuestas:"
                        : "Forms with highest response volume:"}
                    </p>

                    {analytics.topForms.length > 0 ? (
                      analytics.topForms.map((item, idx) => {
                        const pct = Math.max(
                          12,
                          Math.round((item.count / analytics.maxTopCount) * 100)
                        );
                        return (
                          <div
                            key={item.id}
                            onClick={() => onSelectForm && onSelectForm(item.raw)}
                            className={cn(
                              "rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] p-3 transition-colors",
                              onSelectForm && "cursor-pointer hover:border-[#003087]/40"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                              <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                <span className="text-[#B00828] dark:text-[#ff4d6d] mr-1.5">
                                  #{idx + 1}
                                </span>
                                {item.title}
                              </span>
                              <span className="shrink-0 font-extrabold text-[#003087] dark:text-blue-300">
                                {item.count} {isEs ? "resp." : "resp."}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, delay: idx * 0.1 }}
                                className="h-full rounded-full bg-gradient-to-r from-[#003087] to-[#B00828]"
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        {isEs
                          ? "Los formularios más activos aparecerán aquí automáticamente."
                          : "Most active forms will automatically appear here."}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ===== NIVEL 2: BENTO GRID DE TELEMETRÍA REAL ===== */}
        <div
          id="centro-analitico"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5"
        >
          <SpotlightCard delay={0.2} className="sm:col-span-2 lg:col-span-5 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B00828] to-[#80041b] text-white shadow-lg shadow-[#B00828]/25">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isEs ? "Impacto Total" : "Total Impact"}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {isEs ? "Respuestas procesadas" : "Processed responses"}
                  </h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Activity className="h-3 w-3" />
                {isEs ? "Verificado" : "Verified"}
              </span>
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <CountUp
                end={analytics.responsesCount}
                className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
              />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isEs ? "en toda la plataforma" : "platform-wide"}
              </span>
            </div>
          </SpotlightCard>

          <SpotlightCard delay={0.3} className="lg:col-span-3 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#003087]/10 dark:bg-blue-500/20 text-[#003087] dark:text-blue-300">
                <Layers className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#003087] dark:text-blue-300 bg-[#003087]/10 dark:bg-blue-500/15 px-2.5 py-0.5 rounded-full">
                {isEs ? "Activos" : "Live"}
              </span>
            </div>
            <div className="mt-4">
              <CountUp
                end={analytics.formsCount}
                className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white"
              />
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                {isEs ? "Formularios publicados" : "Published forms"}
              </p>
            </div>
          </SpotlightCard>

          <SpotlightCard delay={0.4} className="lg:col-span-2 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Award className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <CountUp
                end={analytics.avgResponses}
                decimals={1}
                className="text-3xl font-black text-slate-900 dark:text-white"
              />
              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                {isEs ? "Media / formulario" : "Avg / form"}
              </p>
            </div>
          </SpotlightCard>

          <SpotlightCard delay={0.5} className="lg:col-span-2 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                <Building2 className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              {analytics.entitiesCount > 0 ? (
                <CountUp
                  end={analytics.entitiesCount}
                  className="text-3xl font-black text-slate-900 dark:text-white"
                />
              ) : (
                <span className="text-3xl font-black bg-gradient-to-r from-[#003087] to-[#B00828] dark:from-blue-300 dark:to-[#ff4d6d] bg-clip-text text-transparent">
                  100%
                </span>
              )}
              <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                {analytics.entitiesCount > 0
                  ? isEs
                    ? "Entidades"
                    : "Entities"
                  : isEs
                  ? "Multiplataforma"
                  : "Cross-platform"}
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* ===== NIVEL 3: CINTA DE TELEMETRÍA EN VIVO ===== */}
      {analytics.tickerItems.length > 0 && (
        <div className="relative border-y border-slate-200/70 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.03] py-3 overflow-hidden">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar px-6 sm:px-10">
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#B00828] dark:text-[#ff4d6d]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B00828] animate-ping" />
              {isEs ? "En curso:" : "Active now:"}
            </span>
            <div className="flex items-center gap-4">
              {analytics.tickerItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectForm && onSelectForm(item.raw)}
                  className="shrink-0 inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-3.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#003087]/40 transition-colors"
                >
                  <span className="truncate max-w-[180px] font-semibold">{item.title}</span>
                  <span className="rounded-full bg-[#003087]/10 dark:bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-[#003087] dark:text-blue-300">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== NIVEL 4: PORTAL INTRODUCTORIO AL CATÁLOGO DE FORMULARIOS PÚBLICOS ===== */}
      <div
        id="formularios"
        className="relative z-10 px-6 py-7 sm:px-10 sm:py-8 lg:px-14 bg-gradient-to-r from-[#003087]/[0.04] via-white/60 to-[#B00828]/[0.04] dark:from-[#003087]/25 dark:via-[#071129]/80 dark:to-[#B00828]/15 border-t border-slate-200/70 dark:border-white/10"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Narrativa e Identidad de la Sección Pública */}
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#003087] dark:text-blue-300 mb-2">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#003087] to-[#B00828]" />
              <span>{copy.catalogBadge}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>{copy.catalogTitle}</span>
            </h2>

            <p className="mt-2 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300/90 leading-relaxed">
              {copy.catalogDescription}
            </p>

            {/* Píldoras de garantías y experiencia */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {isEs ? "Acceso directo sin fricción" : "Direct frictionless access"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-[#003087] dark:text-blue-400" />
                {isEs ? "Datos protegidos y verificados" : "Protected & verified data"}
              </span>
            </div>
          </div>

          {/* Indicador Espacial de Formularios Abiertos + Flecha Guía */}
          <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
            <div className="flex items-center gap-3.5 rounded-2xl border border-[#003087]/20 dark:border-blue-400/20 bg-white/85 dark:bg-slate-900/75 px-4 py-3 shadow-sm backdrop-blur-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#003087] to-[#B00828] text-white shadow-md">
                <Layers className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isEs ? "Disponibles ahora" : "Available now"}
                </p>
                <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {analytics.formsCount}{" "}
                  <span className="text-xs font-semibold text-[#003087] dark:text-blue-300">
                    {isEs ? "formularios" : "forms"}
                  </span>
                </p>
              </div>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#003087]/10 dark:bg-blue-500/20 text-[#003087] dark:text-blue-300"
                aria-hidden="true"
              >
                <ArrowDown className="h-4 w-4" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}