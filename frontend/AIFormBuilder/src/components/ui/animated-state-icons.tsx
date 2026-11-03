/**
 * Animated State Icons — 12 iconos que se transforman entre dos estados
 * con significado (cargando→éxito, play→pausa, bloqueado→desbloqueado).
 *
 * ── Adaptaciones respecto al original ─────────────────────────────────
 * · TypeScript con `interface StateIconProps`, como en el original. El
 *   proyecto es JS en el resto, pero el `tsconfig.json` está acotado a
 *   los ficheros TypeScript: este queda tipado sin obligar a migrar los
 *   ~60 .jsx. Compilar y comprobar tipos no requiere migrar nada más.
 * · `cn` viene del `lib/utils` real del proyecto. El `utils.d.ts` es solo
 *   una declaración de tipos: no reimplementa la función ni la duplica.
 * · Los tokens del catálogo se mapearon a los del proyecto: este define
 *   --color-surface / --color-ink / --color-ink-muted / --color-line.
 *   Las clases shadcn (bg-background, text-foreground, border-border,
 *   bg-card) NO existen aquí: en Tailwind v4 una clase sin token no se
 *   genera, así que habrían salido invisibles.
 * · `useAutoToggle` era un `setInterval` infinito. En producción eso es un
 *   fallo: el icono de "copiado" volvería a "no copiado" solo. Ahora el
 *   bucle es opt-in (`loop`) y el estado real manda por prop (`active`).
 * · Respeta prefers-reduced-motion, como el resto del sistema.
 * · `strokeWidth` es prop: el viewBox es 40 y el trazo se afina al
 *   escalar, así que a 20px hay que subirlo para que no quede un pelo.
 * · El rojo de Heart/Notification sale de --color-danger, no de un #EF4444
 *   que no pertenece a la paleta.
 * · `label` es lo que decide la accesibilidad: sin él el icono es
 *   decorativo (`aria-hidden`), con él es `role="img"` y tiene nombre.
 *   Hardcodear `aria-hidden` impedía marcar un icono con significado.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils.js";

const EASE = [0.32, 0.72, 0, 1] as const;
const DANGER = "var(--color-danger, #d14343)";

export interface StateIconProps {
  /** Lado del icono en px. */
  size?: number;
  /** Trazo. Por defecto `currentColor` para heredar del contexto visual. */
  color?: string;
  /** Clases extra, para composición con Tailwind. */
  className?: string;
  /**
   * Grosor del trazo. Súbelo al encoger: el viewBox es de 40 y el trazo
   * se afina proporcionalmente, así que a 16px con 2 queda en 0,8px.
   */
  strokeWidth?: number;
  /**
   * Estado real. Si se omite, cae en `loop`. En la app SIEMPRE se pasa:
   * un `setInterval` decidiendo si algo está copiado es un fallo.
   */
  active?: boolean;
  /** Alterna solo cada `duration` ms. Solo para el catálogo. */
  loop?: boolean;
  /** Milisegundos de cada estado cuando `loop` está activo. */
  duration?: number;
  /** Color del relleno (corazón, campana). */
  accentColor?: string;
  /**
   * Nombre accesible. Sin él el icono es decorativo. Con él pasa a
   * `role="img"`. Si el icono va dentro de un botón, lo normal es que el
   * botón tenga su propio `aria-label` y el icono siga decorativo.
   */
  label?: string;
}

/** Bucle del catálogo. Apagado salvo que se pida: en la app manda `active`. */
function useLoopState(enabled: boolean, interval: number): boolean {
  const [tick, setTick] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setTick((v) => !v), interval);
    return () => clearInterval(id);
  }, [enabled, interval]);
  return tick;
}

/** Estado efectivo: la prop real manda; si no existe, el bucle del catálogo. */
function useIconState(active: boolean | undefined, loop?: boolean, duration?: number): boolean {
  const looped = useLoopState(Boolean(loop), duration ?? 2000);
  return active === undefined ? looped : active;
}

/** Lee el estado del prop con nombre propio o, si no, del genérico `active`. */
function state(active: boolean | undefined, named: boolean | undefined): boolean | undefined {
  return named === undefined ? active : named;
}

const box = (size: number) => ({ width: size, height: size });

/**
 * Aplica lo que el icono significa a la accesibilidad, no lo contrario.
 * El `aria-hidden` fijo del original impedía dar nombre a un icono que
 * sí lo necesita.
 */
function a11y(label?: string) {
  return label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);
}

/* ─── 1. LOADING → SUCCESS ─── el anillo se cierra y aparece el tick ─── */
export function SuccessIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, loop, duration = 2200, label,
}: StateIconProps) {
  const done = useIconState(active, loop, duration);
  const reduce = useReducedMotion();
  const showDone = reduce ? true : done;
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <motion.circle
        cx="20" cy="20" r="16" stroke={color} strokeWidth={strokeWidth}
        initial={false}
        animate={showDone ? { pathLength: 1, opacity: 1 } : { pathLength: 0.7, opacity: 0.4 }}
        transition={{ duration: 0.5 }}
      />
      {!showDone && (
        <motion.circle
          cx="20" cy="20" r="16" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray="25 75"
          animate={reduce ? {} : { rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "20px 20px" }}
        />
      )}
      <motion.path
        d="M12 20l6 6 10-12" stroke={color} strokeWidth={strokeWidth + 0.5}
        strokeLinecap="round" strokeLinejoin="round"
        initial={false}
        animate={showDone ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.4, delay: showDone ? 0.2 : 0 }}
      />
    </svg>
  );
}

/* ─── 2. MENU → CLOSE ─── el guion se convierte en aspa ─── */
export function MenuCloseIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, open, loop, duration = 2000, label,
}: StateIconProps & { open?: boolean }) {
  const isOpen = useIconState(state(active, open), loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <motion.line
        x1="10" x2="30" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round"
        initial={false}
        animate={isOpen ? { y1: 20, y2: 20, rotate: 45 } : { y1: 12, y2: 12, rotate: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        style={{ transformOrigin: "20px 20px" }}
      />
      <motion.line
        x1="10" y1="20" x2="30" y2="20" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round"
        initial={false}
        animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2 }}
        style={{ transformOrigin: "20px 20px" }}
      />
      <motion.line
        x1="10" x2="30" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round"
        initial={false}
        animate={isOpen ? { y1: 20, y2: 20, rotate: -45 } : { y1: 28, y2: 28, rotate: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        style={{ transformOrigin: "20px 20px" }}
      />
    </svg>
  );
}

/* ─── 3. PLAY → PAUSE ─── */
export function PlayPauseIcon({
  size = 40, color = "currentColor", className, active, playing, loop, duration = 2400, label,
}: StateIconProps & { playing?: boolean }) {
  const isPlaying = useIconState(state(active, playing), loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <AnimatePresence mode="wait" initial={false}>
        {isPlaying ? (
          <motion.g key="pause" exit={{ scale: 0.5, opacity: 0 }}
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }} style={{ transformOrigin: "20px 20px" }}>
            <rect x="12" y="10" width="5" height="20" rx="1.5" fill={color} />
            <rect x="23" y="10" width="5" height="20" rx="1.5" fill={color} />
          </motion.g>
        ) : (
          <motion.g key="play" exit={{ scale: 0.5, opacity: 0 }}
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }} style={{ transformOrigin: "20px 20px" }}>
            <polygon points="14,10 30,20 14,30" fill={color} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── 4. LOCK → UNLOCK ─── el arco se levanta ─── */
export function LockUnlockIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, unlocked, loop, duration = 2600, label,
}: StateIconProps & { unlocked?: boolean }) {
  const isUnlocked = useIconState(state(active, unlocked), loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <rect x="9" y="18" width="22" height="16" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <motion.path
        d="M14 18V13a6 6 0 0112 0v5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        initial={false}
        animate={isUnlocked ? { d: "M14 18V13a6 6 0 0112 0v2" } : { d: "M14 18V13a6 6 0 0112 0v5" }}
        transition={{ duration: 0.4, ease: EASE }}
      />
      <motion.circle
        cx="20" cy="26" r="2" fill={color}
        initial={false}
        animate={isUnlocked ? { scale: 0.6, opacity: 0.4 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  );
}

/* ─── 5. COPY → COPIED ─── las líneas ceden al tick ─── */
export function CopiedIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, copied, loop, duration = 2200, label,
}: StateIconProps & { copied?: boolean }) {
  const isCopied = useIconState(state(active, copied), loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <rect x="12" y="10" width="18" height="22" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <path d="M10 14h-0a2 2 0 00-2 2v18a2 2 0 002 2h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.3} />
      <AnimatePresence mode="wait" initial={false}>
        {isCopied ? (
          <motion.path key="check" d="M16 21l4 4 6-8" stroke={color} strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }}
            transition={{ duration: 0.3 }} />
        ) : (
          <motion.g key="lines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <line x1="17" y1="18" x2="25" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.4} />
            <line x1="17" y1="23" x2="25" y2="23" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.4} />
            <line x1="17" y1="28" x2="22" y2="28" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.4} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── 6. BELL → NOTIFICATION ─── la campana suena y aparece el punto ─── */
export function NotificationIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, loop, duration = 2800, accentColor = DANGER, label,
}: StateIconProps) {
  const notif = useIconState(active, loop, duration);
  const reduce = useReducedMotion();
  return (
    <motion.svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={{ ...box(size), transformOrigin: "20px 6px" }} {...a11y(label)}
      initial={false}
      animate={!reduce && notif ? { rotate: [0, 8, -8, 6, -6, 3, 0] } : { rotate: 0 }}
      transition={{ duration: 0.6 }}>
      <path d="M28 16a8 8 0 00-16 0c0 8-4 10-4 10h24s-4-2-4-10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 30a3 3 0 005 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <motion.circle cx="28" cy="10" r="4" fill={accentColor}
        initial={false}
        animate={notif ? { scale: [0, 1.3, 1], opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE }} />
    </motion.svg>
  );
}

/* ─── 7. HEART → FILLED ─── */
export function HeartIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, loop, duration = 2000, accentColor = DANGER, label,
}: StateIconProps) {
  const filled = useIconState(active, loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <motion.path
        d="M20 34s-12-7.5-12-16a7.5 7.5 0 0112-6 7.5 7.5 0 0112 6c0 8.5-12 16-12 16z"
        stroke={filled ? accentColor : color} strokeWidth={strokeWidth} fill={filled ? accentColor : "none"}
        initial={false}
        animate={filled ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ transformOrigin: "20px 22px" }}
      />
    </svg>
  );
}

/* ─── 8. DOWNLOAD → DONE ─── la flecha cae en la bandeja y se confirma ─── */
export function DownloadDoneIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, done, loop, duration = 2400, label,
}: StateIconProps & { done?: boolean }) {
  const isDone = useIconState(state(active, done), loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <path d="M8 28v4a2 2 0 002 2h20a2 2 0 002-2v-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <AnimatePresence mode="wait" initial={false}>
        {isDone ? (
          <motion.path key="check" d="M14 22l6 6 8-10" stroke={color} strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.35 }} />
        ) : (
          <motion.g key="arrow" initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}>
            <line x1="20" y1="6" x2="20" y2="24" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <polyline points="14,18 20,24 26,18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── 9. SEND ─── el avión se vuela y se rehace ─── */
export function SendIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, sent, loop, duration = 2600, label,
}: StateIconProps & { sent?: boolean }) {
  const isSent = useIconState(state(active, sent), loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <motion.g
        initial={false}
        animate={isSent ? { x: 30, y: -30, opacity: 0, scale: 0.5 } : { x: 0, y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}>
        <path d="M34 6L16 20l-6-2L34 6z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <path d="M34 6L22 34l-6-14" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <line x1="16" y1="20" x2="22" y2="34" stroke={color} strokeWidth={strokeWidth} />
      </motion.g>
    </svg>
  );
}

/* ─── 10. TOGGLE ─── el interruptor bascula con muelle ─── */
export function ToggleIcon({
  size = 40, color = "currentColor", className, active, loop, duration = 1800, label,
}: StateIconProps) {
  const on = useIconState(active, loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <motion.rect x="5" y="13" width="30" height="14" rx="7"
        initial={false}
        animate={{ fill: color, opacity: on ? 0.2 : 0.08 }}
        transition={{ duration: 0.3 }} />
      <rect x="5" y="13" width="30" height="14" rx="7" stroke={color} strokeWidth={2} opacity={on ? 1 : 0.4} />
      <motion.circle cy="20" r="5" fill={color}
        initial={false}
        animate={{ cx: on ? 28 : 12 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }} />
    </svg>
  );
}

/* ─── 11. EYE → HIDDEN ─── */
export function EyeToggleIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, hidden, loop, duration = 2200, label,
}: StateIconProps & { hidden?: boolean }) {
  const isHidden = useIconState(state(active, hidden), loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <motion.path d="M4 20s6-10 16-10 16 10 16 10-6 10-16 10S4 20 4 20z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        initial={false} animate={{ opacity: isHidden ? 0.3 : 1 }} transition={{ duration: 0.3 }} />
      <motion.circle cx="20" cy="20" r="5" stroke={color} strokeWidth={strokeWidth}
        initial={false} animate={{ scale: isHidden ? 0.6 : 1, opacity: isHidden ? 0.2 : 1 }} transition={{ duration: 0.3 }} />
      <motion.line x1="6" y1="34" x2="34" y2="6" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round"
        initial={false} animate={{ opacity: isHidden ? 1 : 0 }} transition={{ duration: 0.25 }} />
    </svg>
  );
}

/* ─── 12. VOLUME ─── las ondas se apagan y aparece la cruz ─── */
export function VolumeIcon({
  size = 40, color = "currentColor", className, strokeWidth = 2, active, muted, loop, duration = 2400, label,
}: StateIconProps & { muted?: boolean }) {
  const isMuted = useIconState(state(active, muted), loop, duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("block shrink-0", className)} style={box(size)} {...a11y(label)}>
      <path d="M8 16h5l7-6v20l-7-6H8a1 1 0 01-1-1V17a1 1 0 011-1z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <motion.path d="M26 14a8 8 0 010 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        initial={false} animate={{ opacity: isMuted ? 0 : 1, x: isMuted ? -3 : 0 }} transition={{ duration: 0.3 }} />
      <motion.path d="M30 10a14 14 0 010 20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        initial={false} animate={{ opacity: isMuted ? 0 : 0.5, x: isMuted ? -5 : 0 }} transition={{ duration: 0.3, delay: 0.05 }} />
      <motion.g initial={false} animate={{ opacity: isMuted ? 1 : 0 }} transition={{ duration: 0.25 }}>
        <line x1="26" y1="16" x2="34" y2="24" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
        <line x1="34" y1="16" x2="26" y2="24" stroke={color} strokeWidth={strokeWidth + 0.5} strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}

