import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Layers,
  Radio,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Waves,
  Zap,
  Hexagon,
  Radar,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { cn } from "../../lib/utils.js";
import { usePublicInsights } from "../../hooks/usePublicInsights.js";

/* ═══════════════════════════════════════════════════════════════════════════
   HOME HERO SECTION — Diseño premium optimizado
   Sin terminal, sin orbe morphing pesado, sin contadores binarios
   ═══════════════════════════════════════════════════════════════════════════ */

/** Contador numérico con interpolación física suave */
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
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, decimals]);
  return (
    <span className={className}>
      {prefix}
      {count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Canvas: Grid cibernético 3D en perspectiva + partículas reactivas (optimizado) */
function CyberGridCanvas() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // DPR limitado para mejor rendimiento
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Menos partículas para mejor rendimiento
    const particleCount = Math.min(35, Math.floor((width * height) / 45000));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      hue: Math.random() * 60 + 190,
      pulse: Math.random() * Math.PI * 2,
    }));

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const isDark = document.documentElement.classList.contains("dark");

      // === GRID 3D EN PERSPECTIVA ===
      const gridColor = isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(0, 48, 135, 0.1)";
      const horizonY = height * 0.35;
      const gridLines = 20;
      const vanishX = width / 2;

      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.8;
      for (let i = -gridLines; i <= gridLines; i++) {
        const t = i / gridLines;
        const bottomX = vanishX + t * width * 1.2;
        const topX = vanishX + t * width * 0.15;
        ctx.beginPath();
        ctx.moveTo(bottomX, height);
        ctx.lineTo(topX, horizonY);
        ctx.stroke();
      }

      const hLines = 14;
      for (let i = 0; i < hLines; i++) {
        const progress = i / hLines;
        const y = horizonY + Math.pow(progress, 1.8) * (height - horizonY);
        const spread = 0.15 + progress * 1.05;
        const leftX = vanishX - (width / 2) * spread;
        const rightX = vanishX + (width / 2) * spread;
        const alpha = 0.06 + progress * 0.12;
        ctx.strokeStyle = isDark
          ? `rgba(59, 130, 246, ${alpha})`
          : `rgba(0, 48, 135, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);
        ctx.stroke();
      }

      // Línea del horizonte brillante
      const horizonGrad = ctx.createLinearGradient(0, horizonY, width, horizonY);
      horizonGrad.addColorStop(0, "rgba(59, 130, 246, 0)");
      horizonGrad.addColorStop(0.5, isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(0, 48, 135, 0.3)");
      horizonGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.strokeStyle = horizonGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();

      // === PARTÍCULAS REACTIVAS ===
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          const force = (140 - dist) / 140;
          p.vx += (dx / dist) * force * 0.015;
          p.vy += (dy / dist) * force * 0.015;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;

        const pulseSize = Math.sin(p.pulse) * 0.3 + 1;
        const r = p.r * pulseSize;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5);
        if (isDark) {
          glow.addColorStop(0, `hsla(${p.hue}, 90%, 70%, 0.7)`);
          glow.addColorStop(0.5, `hsla(${p.hue}, 90%, 60%, 0.15)`);
          glow.addColorStop(1, `hsla(${p.hue}, 90%, 50%, 0)`);
        } else {
          glow.addColorStop(0, `hsla(${p.hue}, 80%, 40%, 0.6)`);
          glow.addColorStop(0.5, `hsla(${p.hue}, 80%, 40%, 0.12)`);
          glow.addColorStop(1, `hsla(${p.hue}, 80%, 40%, 0)`);
        }
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isDark ? `hsla(${p.hue}, 90%, 85%, 0.9)` : `hsla(${p.hue}, 80%, 30%, 0.85)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Conexiones entre partículas cercanas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const opacity = (1 - dist / 110) * (isDark ? 0.2 : 0.12);
            ctx.strokeStyle = isDark
              ? `rgba(96, 165, 250, ${opacity})`
              : `rgba(0, 48, 135, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

/** Radar sweep animado (ligero) */
function RadarSweep({ size = 120 }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <radialGradient id="radar-bg">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="55" fill="url(#radar-bg)" />
        <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="0.5" />
        <circle cx="60" cy="60" r="25" fill="none" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="0.5" />
        <line x1="60" y1="5" x2="60" y2="115" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="0.5" />
        <line x1="5" y1="60" x2="115" y2="60" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="0.5" />
      </svg>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0"
        style={{ transformOrigin: "center" }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-left"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(59, 130, 246, 0.4) 60deg, transparent 90deg)",
            transform: "translateY(-100%)",
          }}
        />
      </motion.div>
      {[
        { x: 35, y: 30 },
        { x: 80, y: 45 },
        { x: 55, y: 85 },
      ].map((p, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
          className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            boxShadow: "0 0 6px rgba(52, 211, 153, 0.8)",
          }}
        />
      ))}
    </div>
  );
}

/** Gráfico holográfico con efecto de brillo */
function HolographicWaveChart({ data = [], id = "holo-wave" }) {
  if (!data || data.length < 2) return null;
  const width = 320;
  const height = 90;
  const padY = 14;
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
    pathD += `C ${ctrlX},${curr.y} ${ctrlX},${next.y} ${next.x},${next.y}`;
  }
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B00828" stopOpacity="0.5" />
          <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#003087" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#003087" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#B00828" />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1="0" y1={height * t} x2={width} y2={height * t} stroke="currentColor" strokeOpacity="0.05" strokeDasharray="2 4" />
      ))}
      <path d={areaD} fill={`url(#${id})`} />
      <motion.path
        d={pathD}
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="2.5"
        strokeLinecap="round"
        filter={`url(#${id}-glow)`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <circle cx={last.x} cy={last.y} r="10" fill="#B00828" fillOpacity="0.15">
        <animate attributeName="r" values="6;14;6" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={last.x} cy={last.y} r="4" fill="#B00828" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  );
}

/** Tarjeta Spotlight con efecto 3D tilt */
function SpotlightCard({ children, className, delay = 0, tilt = true }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(0, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 20 });

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const rect = currentTarget.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    mouseX.set(x);
    mouseY.set(y);
    if (tilt) {
      rotateX.set(-((y - rect.height / 2) / (rect.height / 2)) * 3);
      rotateY.set(((x - rect.width / 2) / (rect.width / 2)) * 3);
    }
  }
  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d", rotateX, rotateY }}
      className={cn(
        "group relative rounded-2xl border transition-all duration-500 overflow-hidden",
        "border-white/50 bg-white/50 shadow-[0_8px_40px_rgba(0,48,135,0.08)]",
        "dark:border-white/[0.08] dark:bg-[#050d24]/60 dark:shadow-[0_12px_50px_rgba(0,0,0,0.5)]",
        "backdrop-blur-2xl backdrop-saturate-150",
        "hover:shadow-[0_20px_60px_rgba(0,48,135,0.18)] dark:hover:shadow-[0_20px_60px_rgba(59,130,246,0.2)]",
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(500px circle at ${mouseX}px ${mouseY}px, rgba(0, 48, 135, 0.12), rgba(176, 8, 40, 0.06) 40%, transparent 75%)`,
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-blue-300/25" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-400/15 to-transparent dark:via-blue-400/10" aria-hidden="true" />
      <div className="relative z-10 h-full" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </motion.div>
  );
}

/** ═══════════════════ COMPONENTE PRINCIPAL ═══════════════════ */
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
        responsesCount: 0, formsCount: 0, entitiesCount: 0, avgResponses: 0,
        topForms: [], maxTopCount: 1, tickerItems: [],
        chartSeries: [18, 25, 22, 34, 31, 48, 44, 62, 59, 78, 85, 96],
        totalViews: 0, conversion: 0,
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
    badge: t("heroBadge") !== "heroBadge" ? t("heroBadge") : isEs ? "ECOSISTEMA DE INTELIGENCIA Y PARTICIPACIÓN" : "INTELLIGENCE & PARTICIPATION ECOSYSTEM",
    title1: t("heroTitleLine1") !== "heroTitleLine1" ? t("heroTitleLine1") : isEs ? "La nueva era de los" : "The next era of",
    title2: t("heroTitleLine2") !== "heroTitleLine2" ? t("heroTitleLine2") : isEs ? "formularios inteligentes" : "intelligent forms",
    subtitle: t("heroSubtitle") !== "heroSubtitle" ? t("heroSubtitle") : isEs ? "Crea encuestas impulsadas por IA, recopila participación en tiempo real y visualiza el pulso estadístico de cada iniciativa desde un solo lugar." : "Build AI-assisted surveys, capture real-time participation, and visualize statistical telemetry for every initiative in one place.",
    ctaPrimary: t("heroCtaPrimary") !== "heroCtaPrimary" ? t("heroCtaPrimary") : isEs ? "Explorar formularios" : "Explore forms",
    ctaSecondary: t("heroCtaSecondary") !== "heroCtaSecondary" ? t("heroCtaSecondary") : isEs ? "Analítica global" : "Global analytics",
    catalogBadge: isEs ? "PARTICIPACIÓN CIUDADANA E INSTITUCIONAL" : "PUBLIC & INSTITUTIONAL PARTICIPATION",
    catalogTitle: t("heroDividerLabel") !== "heroDividerLabel" ? t("heroDividerLabel") : isEs ? "Consultas y Formularios Públicos Disponibles" : "Available Public Surveys & Forms",
    catalogDescription: isEs ? "Selecciona cualquiera de las iniciativas abiertas a continuación para aportar tu opinión, completar trámites digitales o participar en estudios estadísticos activos. Tus respuestas alimentan directamente los indicadores en tiempo real." : "Select any of the open initiatives below to share your feedback, complete digital procedures, or participate in active statistical studies. Your responses directly power real-time insights.",
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={handleHeroMouseMove}
      className="relative overflow-hidden rounded-[2.5rem] border border-white/60 dark:border-white/[0.08] bg-gradient-to-br from-slate-50 via-white to-blue-50/50 dark:from-[#020617] dark:via-[#050d24] dark:to-[#0a0520] mb-10 shadow-[0_30px_90px_-20px_rgba(0,48,135,0.2)] dark:shadow-[0_30px_100px_-20px_rgba(59,130,246,0.15)]"
      aria-labelledby="hero-title"
    >
      {/* CAPA 1: Grid cibernético 3D + partículas (optimizado) */}
      <div className="absolute inset-0 opacity-80 dark:opacity-60">
        <CyberGridCanvas />
      </div>

      {/* CAPA 2: Aurora de fondo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          animate={{ x: [0, 100, -50, 0], y: [0, -80, 50, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-[#003087]/20 dark:bg-[#3b82f6]/20 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -120, 80, 0], y: [0, 60, -100, 0], scale: [1, 0.85, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -right-20 h-[480px] w-[480px] rounded-full bg-[#B00828]/15 dark:bg-[#ff4d6d]/15 blur-[110px]"
        />
        <motion.div
          animate={{ x: [0, 60, -80, 0], y: [0, -40, 60, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 blur-[100px]"
        />
      </div>

      {/* CAPA 3: Spotlight interactivo del cursor */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-100 mix-blend-screen"
        style={{
          background: useMotionTemplate`radial-gradient(700px circle at ${bgMouseX}px ${bgMouseY}px, rgba(59, 130, 246, 0.12), rgba(176, 8, 40, 0.05) 40%, transparent 75%)`,
        }}
        aria-hidden="true"
      />

      {/* CAPA 4: Scan lines holográficas sutiles */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
        }}
        aria-hidden="true"
      />

      {/* ═══════════ CONTENIDO PRINCIPAL ═══════════ */}
      <div className="relative z-10 px-6 pt-12 pb-10 sm:px-10 sm:pt-16 lg:px-16 lg:pt-20">
        {/* NIVEL 1: HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center mb-16">
          {/* Columna Izquierda */}
          <div className="lg:col-span-7 text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-[#003087]/20 dark:border-blue-400/25 bg-white/70 dark:bg-blue-950/40 shadow-lg shadow-blue-500/5 backdrop-blur-xl mb-8"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B00828] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-br from-[#B00828] to-[#ff4d6d]" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold tracking-[0.14em] text-[#003087] dark:text-blue-200 uppercase">
                {copy.badge}
              </span>
              <div className="h-4 w-px bg-slate-300 dark:bg-white/20" />
              <Sparkles className="h-3.5 w-3.5 text-[#B00828] dark:text-[#ff4d6d]" />
            </motion.div>

            {/* Título */}
            <motion.h1
              id="hero-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-[4.5rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.05]"
            >
              {copy.title1}{" "}
              <span className="relative block mt-2">
                <span className="bg-gradient-to-r from-[#003087] via-[#1e5fd9] via-50% to-[#B00828] dark:from-blue-300 dark:via-indigo-200 dark:to-[#ff4d6d] bg-clip-text text-transparent">
                  {copy.title2}
                </span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute -bottom-3 left-0 right-0 h-1 origin-left rounded-full bg-gradient-to-r from-[#003087] via-[#3b82f6] to-[#B00828] opacity-60"
                />
              </span>
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300/90 leading-relaxed"
            >
              {copy.subtitle}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a
                href="#formularios"
                className="group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#003087] via-[#003ea8] to-[#B00828] px-8 py-4 text-sm sm:text-base font-bold text-white shadow-[0_12px_40px_-8px_rgba(0,48,135,0.5)] hover:shadow-[0_16px_50px_-6px_rgba(176,8,40,0.5)] transition-all duration-500 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <BarChart3 className="relative h-4 w-4 text-amber-200 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                <span className="relative">{copy.ctaSecondary}</span>
                <ArrowUpRight className="relative h-4 w-4 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </a>

              <a
                href="#centro-analitico"
                className="group inline-flex items-center justify-center gap-2.5 rounded-2xl border border-slate-300/60 dark:border-white/15 bg-white/60 dark:bg-white/5 px-7 py-4 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200 backdrop-blur-xl hover:border-[#003087]/40 dark:hover:border-blue-400/40 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-500"
              >
                <TrendingUp className="h-4 w-4 text-[#003087] dark:text-blue-300 transition-transform duration-500 group-hover:scale-110" />
                <span>{isEs ? "Ver telemetría" : "View telemetry"}</span>
                <ChevronRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
              </a>
            </motion.div>

            {/* Mini stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 flex flex-wrap items-center gap-6 text-xs"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    <CountUp end={analytics.responsesCount} />
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">{isEs ? "respuestas verificadas" : "verified responses"}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003087]/10 dark:bg-blue-500/20 text-[#003087] dark:text-blue-300">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    <CountUp end={analytics.formsCount} />
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">{isEs ? "formularios activos" : "active forms"}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Columna Derecha: CONSOLA HOLOGRÁFICA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5"
          >
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#003087]/15 via-transparent to-[#B00828]/15 dark:from-blue-500/15 dark:to-[#ff4d6d]/10 blur-2xl" aria-hidden="true" />

              <div className="relative rounded-3xl border border-white/70 dark:border-white/[0.1] bg-white/75 dark:bg-[#050d24]/70 p-6 sm:p-7 shadow-[0_30px_80px_-20px_rgba(0,48,135,0.25)] dark:shadow-[0_30px_90px_-15px_rgba(59,130,246,0.15)] backdrop-blur-2xl">
                {/* Header de la consola */}
                <div className="flex items-center justify-between gap-2 pb-5 mb-5 border-b border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#B00828] blur-md opacity-50 animate-pulse" />
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#B00828] to-[#80041b] text-white shadow-lg">
                        <Radar className="h-4 w-4" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        {isEs ? "Centro de Comando" : "Command Center"}
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {isEs ? "Telemetría en Vivo" : "Live Telemetry"}
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex rounded-xl bg-slate-100/80 dark:bg-white/5 p-1 border border-slate-200/60 dark:border-white/10 backdrop-blur">
                    <button
                      type="button"
                      onClick={() => setHudTab("pulse")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                        hudTab === "pulse"
                          ? "bg-gradient-to-r from-[#003087] to-[#1e5fd9] text-white shadow-md"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {isEs ? "Pulso" : "Pulse"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHudTab("ranking")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                        hudTab === "ranking"
                          ? "bg-gradient-to-r from-[#B00828] to-[#ff4d6d] text-white shadow-md"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {isEs ? "Top" : "Top"}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {hudTab === "pulse" ? (
                    <motion.div
                      key="pulse-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div className="relative rounded-2xl bg-gradient-to-br from-[#003087]/8 via-white to-[#B00828]/8 dark:from-[#003087]/25 dark:via-transparent dark:to-[#B00828]/15 p-5 border border-[#003087]/15 dark:border-white/10 overflow-hidden">
                        <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-[#3b82f6]/20 blur-2xl" />
                        <div className="relative flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-2">
                              {isEs ? "Participación acumulada" : "Total participation"}
                            </p>
                            <div className="flex items-baseline gap-2">
                              <CountUp
                                end={analytics.responsesCount}
                                className="text-4xl sm:text-5xl font-black bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent"
                              />
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {isEs ? "respuestas" : "responses"}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <RadarSweep size={90} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-slate-50/80 to-white/40 dark:from-white/[0.03] dark:to-transparent p-4">
                        <div className="flex items-center justify-between text-xs mb-3">
                          <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Waves className="h-3.5 w-3.5 text-[#003087] dark:text-blue-300" />
                            {isEs ? "Curva de actividad" : "Activity curve"}
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-[#B00828] dark:text-[#ff4d6d]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B00828] animate-pulse" />
                            {isEs ? "Tiempo real" : "Real-time"}
                          </span>
                        </div>
                        <div className="h-24 w-full text-slate-400">
                          <HolographicWaveChart data={analytics.chartSeries} id="hud-holo" />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="ranking-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-[#B00828]" />
                        {isEs ? "Formularios con mayor volumen:" : "Highest volume forms:"}
                      </p>

                      {analytics.topForms.length > 0 ? (
                        analytics.topForms.map((item, idx) => {
                          const pct = Math.max(12, Math.round((item.count / analytics.maxTopCount) * 100));
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: idx * 0.1 }}
                              onClick={() => onSelectForm && onSelectForm(item.raw)}
                              className={cn(
                                "group rounded-xl border border-slate-200/70 dark:border-white/10 bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-white/[0.04] dark:to-transparent p-4 transition-all duration-300",
                                onSelectForm && "cursor-pointer hover:border-[#003087]/40 dark:hover:border-blue-400/40 hover:shadow-md"
                              )}
                            >
                              <div className="flex items-center justify-between gap-3 mb-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#B00828] to-[#80041b] text-white text-xs font-black shadow-md">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">
                                    {item.title}
                                  </span>
                                </div>
                                <span className="shrink-0 font-black text-[#003087] dark:text-blue-300 text-sm">
                                  {item.count}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: idx * 0.1 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                                  className="h-full rounded-full bg-gradient-to-r from-[#003087] via-[#3b82f6] to-[#B00828] shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                                />
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                          {isEs ? "Los formularios más activos aparecerán aquí automáticamente." : "Most active forms will automatically appear here."}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>

        {/* NIVEL 2: BENTO GRID HOLOGRÁFICO */}
        <div id="centro-analitico" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          <SpotlightCard delay={0.3} className="sm:col-span-2 lg:col-span-5 p-7">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#B00828] to-[#80041b] blur-lg opacity-40" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B00828] to-[#80041b] text-white shadow-lg">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {isEs ? "Impacto Total" : "Total Impact"}
                  </p>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {isEs ? "Respuestas procesadas" : "Processed responses"}
                  </h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Activity className="h-3 w-3" />
                {isEs ? "Verificado" : "Verified"}
              </span>
            </div>

            <div className="mt-6 flex items-baseline justify-between">
              <CountUp
                end={analytics.responsesCount}
                className="text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent"
              />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-[100px] text-right">
                {isEs ? "en toda la plataforma" : "platform-wide"}
              </span>
            </div>
          </SpotlightCard>

          <SpotlightCard delay={0.4} className="lg:col-span-3 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#003087]/10 dark:bg-blue-500/20 text-[#003087] dark:text-blue-300">
                <Layers className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#003087] dark:text-blue-300 bg-[#003087]/10 dark:bg-blue-500/15 px-3 py-1 rounded-full border border-[#003087]/20 dark:border-blue-400/20">
                {isEs ? "Activos" : "Live"}
              </span>
            </div>
            <div className="mt-5">
              <CountUp end={analytics.formsCount} className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white" />
              <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                {isEs ? "Formularios publicados" : "Published forms"}
              </p>
            </div>
          </SpotlightCard>

          <SpotlightCard delay={0.5} className="lg:col-span-2 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Award className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5">
              <CountUp end={analytics.avgResponses} decimals={1} className="text-4xl font-black text-slate-900 dark:text-white" />
              <p className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                {isEs ? "Media / formulario" : "Avg / form"}
              </p>
            </div>
          </SpotlightCard>

          <SpotlightCard delay={0.6} className="lg:col-span-2 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                <Building2 className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5">
              {analytics.entitiesCount > 0 ? (
                <CountUp end={analytics.entitiesCount} className="text-4xl font-black text-slate-900 dark:text-white" />
              ) : (
                <span className="text-4xl font-black bg-gradient-to-r from-[#003087] to-[#B00828] dark:from-blue-300 dark:to-[#ff4d6d] bg-clip-text text-transparent">
                  100%
                </span>
              )}
              <p className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                {analytics.entitiesCount > 0
                  ? isEs ? "Entidades" : "Entities"
                  : isEs ? "Multiplataforma" : "Cross-platform"}
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* NIVEL 3: CINTA DE TELEMETRÍA */}
      {analytics.tickerItems.length > 0 && (
        <div className="relative border-y border-slate-200/60 dark:border-white/10 bg-gradient-to-r from-[#003087]/[0.03] via-white/50 to-[#B00828]/[0.03] dark:from-[#003087]/20 dark:via-transparent dark:to-[#B00828]/15 py-4 overflow-hidden">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar px-6 sm:px-10">
            <span className="shrink-0 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#B00828] dark:text-[#ff4d6d]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B00828] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B00828]" />
              </span>
              {isEs ? "En curso:" : "Active now:"}
            </span>
            <div className="flex items-center gap-3">
              {analytics.tickerItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectForm && onSelectForm(item.raw)}
                  className="shrink-0 inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#003087]/40 dark:hover:border-blue-400/40 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 backdrop-blur"
                >
                  <span className="truncate max-w-[180px] font-semibold">{item.title}</span>
                  <span className="rounded-full bg-gradient-to-r from-[#003087] to-[#1e5fd9] dark:from-blue-500 dark:to-blue-400 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NIVEL 4: PORTAL AL CATÁLOGO */}
      <div
        id="formularios"
        className="relative z-10 px-6 py-8 sm:px-10 sm:py-10 lg:px-16 bg-gradient-to-r from-[#003087]/[0.04] via-white/60 to-[#B00828]/[0.04] dark:from-[#003087]/25 dark:via-[#050d24]/80 dark:to-[#B00828]/15 border-t border-slate-200/60 dark:border-white/10"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#003087] dark:text-blue-300 mb-3">
              <Hexagon className="h-3.5 w-3.5" />
              <span>{copy.catalogBadge}</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {copy.catalogTitle}
            </h2>

            <p className="mt-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300/90 leading-relaxed">
              {copy.catalogDescription}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {isEs ? "Acceso directo sin fricción" : "Direct frictionless access"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-[#003087] dark:text-blue-400" />
                {isEs ? "Datos protegidos y verificados" : "Protected & verified data"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 self-start lg:self-center shrink-0">
            <div className="relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-[#003087]/20 to-[#B00828]/20 blur-xl" />
              <div className="relative flex items-center gap-4 rounded-2xl border border-[#003087]/20 dark:border-blue-400/20 bg-white/85 dark:bg-slate-900/75 px-5 py-4 shadow-lg backdrop-blur-xl">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#003087] to-[#B00828] blur-md opacity-50" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#003087] to-[#B00828] text-white shadow-md">
                    <Layers className="h-6 w-6" />
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {isEs ? "Disponibles ahora" : "Available now"}
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {analytics.formsCount}{" "}
                    <span className="text-xs font-bold text-[#003087] dark:text-blue-300">
                      {isEs ? "formularios" : "forms"}
                    </span>
                  </p>
                </div>
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#003087]/10 dark:bg-blue-500/20 text-[#003087] dark:text-blue-300"
                  aria-hidden="true"
                >
                  <ArrowDown className="h-4 w-4" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
