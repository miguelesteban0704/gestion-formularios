import { motion } from "framer-motion";
import { cn } from "../../lib/utils.js";
import { useTheme } from "../../hooks/useTheme.js";
import "./PrismGauge.css";

/* ────────────────────────────────────────────────────────────────────────
   PrismGauge — "Tasa de finalización" premium.
   Semicírculo de vidrio con arco degradado cian→dorado, glow underlay,
   cap dot luminoso y centro retroiluminado (lenguaje PrismDonut).
   El valor entra con fade y respira suavemente (1 único elemento animado).
   ──────────────────────────────────────────────────────────────────────── */
const CYAN = "#22d3ee";
const CYAN_LIGHT = "#67e8f9";
const GOLD = "#ffb84d";

export default function PrismGauge({ value = 0, suffix = "%", label }) {
  const { isDark } = useTheme();
  const pct = Math.min(100, Math.max(0, value)) / 100;
  const R = 82;
  const cx = 100;
  const cy = 96;
  const sw = 16;
  const circ = Math.PI * R;
  const arc = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;

  return (
    <div className={cn("pg-root", isDark ? "pg-dark" : "pg-light")}>
      <div className="pg-halo" aria-hidden="true" />

      <svg viewBox="0 0 200 116" className="pg-svg" role="img" aria-label={`${label} ${Math.round(value)}${suffix}`}>
        <defs>
          <linearGradient id="pgGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CYAN} />
            <stop offset="55%" stopColor={CYAN_LIGHT} />
            <stop offset="100%" stopColor={GOLD} />
          </linearGradient>
          <filter id="pgGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 0" />
          </filter>
        </defs>

        {/* track de vidrio */}
        <path className="pg-track" d={arc} fill="none" strokeWidth={sw} strokeLinecap="round" />

        {/* glow underlay */}
        <path
          d={arc}
          fill="none"
          stroke="url(#pgGrad)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          opacity="0.32"
          style={{ filter: "url(#pgGlow)", transition: "stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)" }}
        />

        {/* arco nítido */}
        <path
          d={arc}
          fill="none"
          stroke="url(#pgGrad)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)" }}
        />

        {/* cap dot al final del arco */}
        {pct > 0.02 && (
          <circle
            r="4.5"
            fill="#ffffff"
            stroke={GOLD}
            strokeWidth="2.2"
            style={{
              offsetPath: `path('${arc}')`,
              offsetDistance: `${pct * 100}%`,
              transition: "offset-distance 1.1s cubic-bezier(0.16,1,0.3,1)",
              filter: "url(#pgGlow)",
            }}
          />
        )}
      </svg>

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