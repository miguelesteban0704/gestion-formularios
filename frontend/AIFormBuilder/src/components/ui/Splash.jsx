import { useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Logo } from "../Logo.jsx";
import "./crystal.css";

/* ═══════════════════════════════════════════════════════════════════════
   Splash / Handoff — la transición premium de la aplicación.
   Un solo componente para: arranque, carga crítica, traspaso con el IDP.
   Se autodestruye (no deja al usuario mirando una pantalla de más) y
   respeta `prefers-reduced-motion`.
   ═══════════════════════════════════════════════════════════════════════ */

const EASE = [0.16, 1, 0.3, 1];

/**
 * @param {object} props
 * @param {boolean} props.open          monta/desmonta la pantalla
 * @param {string}  props.title         estado principal ("Redirigiendo…")
 * @param {string}  props.eyebrow       micro-rótulo en versalitas
 * @param {string}  props.description   apoyo del estado
 * @param {Array}   props.chips         [{ icon: Icon, label, tint }]
 * @param {string}  props.aura          color de acento principal
 * @param {string}  props.accent        color de la segunda aurora
 * @param {boolean} props.compact       variante ligera (sin tarjeta)
 */
export function SplashScreen({
  open,
  title,
  eyebrow,
  description,
  chips = [],
  // No es el hex del acento por defecto: es el token. El acento vive en
  // --color-brand-*, y aquí solo se decide qué paso de la escala se usa.
  aura = "var(--color-brand-500)",
  accent = "var(--color-brand-400)",
  compact = false,
  ariaRole = "status",
  ariaBusy = true,
  label,
}) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const float = reduce ? {} : { x: [0, 22, 0], y: [0, -16, 0], scale: [1, 1.07, 1] };
  const floatSlow = reduce ? {} : { x: [0, -20, 0], y: [0, 18, 0], scale: [1.05, 1, 1.05] };

  const card = (
    <>
      {/* auroras de fondo — profundidad de color, sin peso visual */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${aura} 30%, transparent), transparent 62%)` }}
        animate={float}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[18%] top-[62%] h-[320px] w-[320px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${accent} 26%, transparent), transparent 64%)` }}
        animate={floatSlow}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* progreso superior */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="absolute left-0 top-0 h-[3px] w-full origin-left bg-gradient-to-r from-brand-500 via-brand-400 to-brand-500"
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.08 }}
        className={`modal-shell relative flex w-full flex-col items-center overflow-hidden text-center ${
          compact ? "max-w-[320px] rounded-[var(--radius-modal)] px-7 py-7" : "max-w-[400px] rounded-[var(--radius-modal-lg)] px-9 py-10"
        }`}
        style={{ "--modal-aura": aura, zIndex: "var(--z-splash, 200)" }}
      >
        {/* Filo de luz de acento — la firma de Nocturne */}
        <div className="cr-hairline" style={{ "--cr-accent": "var(--modal-aura)" }} aria-hidden="true" />

        {/* marca con anillo de progreso girando */}
        {/* `color` va aquí y no en la tarjeta: es lo único que necesitan los
            <stop> para no llevar el color en un atributo de presentación, y
            puesto en el contenedor los chips y el texto lo heredarían. */}
        <div className={`relative grid place-items-center ${compact ? "h-[88px] w-[88px]" : "h-[104px] w-[104px]"}`} style={{ color: aura }}>
          <svg viewBox="0 0 108 108" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id={`splash-${gid}`} x1="0" y1="0" x2="1" y2="1">
                {/* currentColor y no stopColor={aura}: los atributos de
                    presentación SVG no resuelven var(), así que el color
                    llega heredando `color` del contenedor. */}
                <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                <stop offset="45%" stopColor="currentColor" stopOpacity="0.95" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="54" cy="54" r="50" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg/10" />
            <circle
              cx="54"
              cy="54"
              r="50"
              fill="none"
              stroke={`url(#splash-${gid})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="78 236"
            />
          </svg>
          <motion.div className="relative" animate={reduce ? {} : { rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
            <motion.span
              className="cr-orb text-white"
              style={{ "--cr-orb": aura, width: compact ? 62 : 72, height: compact ? 62 : 72 }}
              animate={reduce ? {} : { scale: [1, 1.045, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Logo showText={false} size={compact ? 30 : 34} />
            </motion.span>
          </motion.div>
        </div>

        {eyebrow && (
          <span
            className="mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{
              color: "var(--fg-muted)",
              borderColor: "color-mix(in srgb, var(--modal-aura) 32%, transparent)",
              background: "color-mix(in srgb, var(--modal-aura) 12%, transparent)",
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden" style={{ background: "var(--modal-aura)" }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--modal-aura)" }} />
            </span>
            {eyebrow}
          </span>
        )}

        {title && (
          <p className={`font-bold tracking-tight text-fg ${compact ? "mt-4 text-[16px]" : "mt-3.5 text-[19px]"}`} style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </p>
        )}
        {description && <p className="mt-2 max-w-[290px] text-[13.5px] leading-relaxed text-muted">{description}</p>}

        {chips.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {chips.map(({ icon: Icon, label, tint }, i) => (
              <span key={i} className="cr-chip" style={{ "--chip-tint": tint || aura }}>
                {Icon && <Icon className="cr-chip-ico h-3.5 w-3.5" strokeWidth={2.2} />}
                {label}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden px-6"
          style={{
            zIndex: "var(--z-splash, 200)",
            background: "var(--overlay-bg)",
            backdropFilter: "blur(var(--overlay-blur))",
            WebkitBackdropFilter: "blur(var(--overlay-blur))",
          }}
          role={ariaRole}
          aria-busy={ariaBusy}
          aria-live="polite"
          aria-label={label}
        >
          {card}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Loading overlay: misma lenguaje visual, para cargas críticas puntuales
 * (no para rutas: ahí usa <PageLoader/>).
 */
export function LoadingOverlay({ open = true, title, description, aura = "var(--color-brand-500)", label }) {
  return (
    <SplashScreen open={open} compact title={title} description={description} aura={aura} label={label} />
  );
}

export default SplashScreen;
