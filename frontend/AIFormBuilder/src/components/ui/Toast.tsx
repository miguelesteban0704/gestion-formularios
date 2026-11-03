import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  isValidElement,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, Info, Loader2, Undo2, ExternalLink, type LucideIcon } from "lucide-react";
import { LanguageContext } from "../../contexts/LanguageContext.jsx";
import { SuccessIcon } from "./animated-state-icons";
import { shouldMorph } from "./state-morph";
import { alertTone } from "../../feedback/variants";
import {
  API_METHODS,
  registerApiRef,
  remove as removeToast,
  subscribe,
  getSnapshot,
  type ToastEntry,
  type ToastType,
} from "../../feedback/toastStore";
import {
  getNotifications,
  subscribeNotifications,
  dismiss as dismissNotification,
} from "../../feedback/notificationStore";
import type { AppNotification } from "../../feedback/types";
import "./crystal.css";

/* ═══════════════════════════════════════════════════════════════════════
   Sistema de notificaciones — Aurora Glass (presentación)
   El store (estado, temporizadores y API imperativa) vive en
   src/feedback/toastStore.ts. Este fichero solo dibuja: <Toaster/> y el
   contexto opcional <ToastProvider/> para compatibilidad con `sonner`.
   ═══════════════════════════════════════════════════════════════════════ */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ─── Tipografía visual por tipo (orbe de cristal + tinte) ─────────────
   El tinte NO se pinta en JS: lo inyecta la clase `alertTone` (cr-tone-*)
   en crystal.css vía --toast-tint / --cr-orb, siguiendo la paleta unificada. */
const TYPE: Record<ToastType, { icon: LucideIcon; stroke: number; spin?: boolean }> = {
  success: { icon: Check, stroke: 2.6 },
  error: { icon: X, stroke: 2.6 },
  warning: { icon: AlertTriangle, stroke: 2.3 },
  info: { icon: Info, stroke: 2.3 },
  loading: { icon: Loader2, stroke: 2.1, spin: true },
};
const typeMeta = (type: string) => TYPE[type as ToastType] || TYPE.info;

/* ─── Posiciones soportadas ──────────────────────────────────────────── */
/* `axis` define la dirección de la pila (columna) — imprescindible para
   que `items-*` alinee el toast al lado correcto. */
export const TOAST_POSITIONS = {
  "top-right": { box: "top-0 right-0 items-end", axis: "flex-col", from: { y: -18 } },
  "top-left": { box: "top-0 left-0 items-start", axis: "flex-col", from: { y: -18 } },
  "top-center": { box: "top-0 left-1/2 -translate-x-1/2 items-center", axis: "flex-col", from: { y: -18 } },
  "bottom-right": { box: "bottom-0 right-0 items-end", axis: "flex-col-reverse", from: { y: 18 } },
  "bottom-left": { box: "bottom-0 left-0 items-start", axis: "flex-col-reverse", from: { y: 18 } },
  "bottom-center": { box: "bottom-0 left-1/2 -translate-x-1/2 items-center", axis: "flex-col-reverse", from: { y: 18 } },
};

type PositionCfg = (typeof TOAST_POSITIONS)[keyof typeof TOAST_POSITIONS];

const ToastContext = createContext<typeof API_METHODS | null>(null);

function ToastItem({
  toast,
  onDismiss,
  from,
}: {
  toast: ToastEntry;
  onDismiss: (id: string) => void;
  from: { y: number };
}) {
  const meta = typeMeta(toast.type);
  const lang = useContext(LanguageContext);
  const closeLabel = lang?.t?.("close") || "Cerrar notificación";
  const [hover, setHover] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(toast.duration);
  const startRef = useRef(Date.now());

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const startTimer = (ms: number) => {
    clearTimer();
    startRef.current = Date.now();
    remainingRef.current = ms;
    timerRef.current = setTimeout(() => onDismiss(toast.id), ms);
  };
  // `version` reinicia la cuenta atrás cuando el toast se actualiza en el sitio.
  useEffect(() => {
    if (toast.duration > 0) startTimer(toast.duration);
    return clearTimer;
  }, [toast.duration, toast.version]);

  const handleEnter = () => {
    setHover(true);
    clearTimer();
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  };
  const handleLeave = () => {
    setHover(false);
    if (remainingRef.current > 0) startTimer(remainingRef.current);
  };

  const isError = toast.type === "error";
  const toneClass = alertTone({ tone: toast.type });

  // Icono: componente del tipo, o el que pase el consumidor (elemento o componente).
  //
  // El par cargando→éxito es un SOLO icono que se transforma en su sitio: la
  // misma instancia pasa de anillo girando a tick dibujándose. Si se montara
  // un icono distinto al resolver, el ojo vería un salto en el mejor de los
  // casos; con el morph, la operación se lee como confirmada. El resto de
  // tipos (error, aviso, info) no tienen con qué transformarse y siguen con
  // lucide, que además ya es el lenguaje del orbe.
  const morph = shouldMorph(toast.type, Boolean(toast.icon));
  const iconNode: ReactNode = (() => {
    if (!toast.icon) {
      return morph
        ? <SuccessIcon active={toast.type === "success"} size={24} strokeWidth={2.8} className="text-white drop-shadow-sm" />
        : (() => {
            const I = meta.icon;
            return <I className={`h-[18px] w-[18px] drop-shadow-sm${meta.spin ? " animate-spin motion-reduce:animate-none" : ""}`} strokeWidth={meta.stroke} />;
          })();
    }
    if (isValidElement(toast.icon as {} | null)) return toast.icon as ReactNode;
    const C = toast.icon as ComponentType<{ className?: string; strokeWidth?: number }>;
    return <C className="h-[18px] w-[18px] drop-shadow-sm" strokeWidth={meta.stroke} />;
  })();

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13.5px] font-bold leading-tight tracking-tight text-fg" style={{ fontFamily: "var(--font-display)" }}>
          {toast.title}
        </p>
        {toast.badge && (
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
            style={{
              color: "color-mix(in srgb, var(--toast-tint) 85%, var(--fg))",
              borderColor: "color-mix(in srgb, var(--toast-tint) 38%, transparent)",
              background: "color-mix(in srgb, var(--toast-tint) 10%, transparent)",
            }}
          >
            {toast.badge}
          </span>
        )}
      </div>
      {toast.description && <p className="mt-1 text-[13px] font-[450] leading-[1.5] text-muted">{toast.description}</p>}
      {(toast.action || toast.secondaryAction) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {toast.action && (
            <button
              onClick={() => { toast.action?.onClick?.(); if (toast.action?.dismiss !== false) onDismiss(toast.id); }}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold text-fg transition active:scale-[0.98]"
              style={{
                borderColor: "color-mix(in srgb, var(--toast-tint) 36%, transparent)",
                background: "color-mix(in srgb, var(--toast-tint) 9%, transparent)",
              }}
            >
              {toast.action.label === "Deshacer" ? <Undo2 className="h-3.5 w-3.5" style={{ color: "var(--toast-tint)" }} /> : toast.action.label === "Ver más" ? <ExternalLink className="h-3.5 w-3.5" style={{ color: "var(--toast-tint)" }} /> : null}
              {toast.action.label}
            </button>
          )}
          {toast.secondaryAction && (
            <button onClick={() => { toast.secondaryAction?.onClick?.(); onDismiss(toast.id); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-fg/80 underline decoration-fg/30 underline-offset-4 transition hover:text-fg">
              {toast.secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: from.y, scale: 0.96, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: from.y > 0 ? 12 : -12, scale: 0.98, filter: "blur(6px)", transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.9 }}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className={`cr-toast group relative flex w-full max-w-[420px] items-start gap-3.5 overflow-hidden px-4 py-3.5 pr-10 ${toneClass}`}
    >
      {/* Filo de luz de acento — la firma de Nocturne */}
      <div className="cr-hairline" style={{ "--cr-accent": "var(--toast-tint)" } as CSSProperties} aria-hidden="true" />

      {/* Orbe premium con icono */}
      <span className="cr-orb cr-orb-sm shrink-0 text-white" aria-hidden="true">
        {iconNode}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        {toast.version > 1 ? (
          <motion.div
            key={toast.version}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {body}
          </motion.div>
        ) : body}
      </div>

      {toast.dismissible && (
        <button
          onClick={() => onDismiss(toast.id)}
          aria-label={closeLabel}
          className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-fg/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
          style={{ "--toast-tint": "var(--toast-tint)" } as CSSProperties}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "color-mix(in srgb, var(--toast-tint) 16%, transparent)";
            e.currentTarget.style.color = "var(--fg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "";
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {toast.duration > 0 && !meta.spin && (
        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-[3px] overflow-hidden rounded-full bg-fg/10">
          <motion.div
            key={`${toast.id}-${toast.version}`}
            className="cr-toast-progress h-full origin-left"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: hover ? undefined : 0 }}
            transition={{ duration: remainingRef.current / 1000, ease: "linear" }}
            style={{ scaleX: 1 }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Avisos persistentes (capa propia, debajo de la pila) ───────────────
   No se auto-cierran (duration: 0): viven en notificationStore y se dibujan
   aquí con las mismas variantes alertTone. `read` atenúa lo ya leído. */
function NotificationItem({ n }: { n: AppNotification }) {
  const lang = useContext(LanguageContext);
  const meta = typeMeta(n.tone ?? "info");
  const toneClass = alertTone({ tone: n.tone ?? "info" });
  const I = meta.icon;
  const dismissLabel = lang?.t?.("dismissNotification") || "Dismiss notification";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.97, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.9 }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`cr-toast group relative flex w-full max-w-[420px] items-start gap-3.5 overflow-hidden px-4 py-3.5 pr-10 ${toneClass}${n.read ? " opacity-70" : ""}`}
    >
      {/* Filo de luz de acento — la firma de Nocturne */}
      <div className="cr-hairline" style={{ "--cr-accent": "var(--toast-tint)" } as CSSProperties} aria-hidden="true" />

      {/* Orbe premium con icono del tono */}
      <span className="cr-orb cr-orb-sm shrink-0 text-white" aria-hidden="true">
        <I className={`h-[18px] w-[18px] drop-shadow-sm${meta.spin ? " animate-spin motion-reduce:animate-none" : ""}`} strokeWidth={meta.stroke} />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13.5px] font-bold leading-tight tracking-tight text-fg" style={{ fontFamily: "var(--font-display)" }}>
          {n.title}
        </p>
        {n.description && <p className="mt-1 text-[13px] font-[450] leading-[1.5] text-muted">{n.description}</p>}
        {n.action && (
          <button
            onClick={() => n.action?.onClick()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold text-fg transition active:scale-[0.98]"
            style={{
              borderColor: "color-mix(in srgb, var(--toast-tint) 36%, transparent)",
              background: "color-mix(in srgb, var(--toast-tint) 9%, transparent)",
            }}
          >
            {n.action.label}
          </button>
        )}
      </div>

      {!n.read && <span className="absolute right-9 top-3 h-1.5 w-1.5 rounded-full bg-[var(--toast-tint)]" aria-hidden="true" />}

      <button
        onClick={() => dismissNotification(n.id)}
        aria-label={dismissLabel}
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-fg/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "color-mix(in srgb, var(--toast-tint) 16%, transparent)";
          e.currentTarget.style.color = "var(--fg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "";
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

/* ─── Contenedor ─────────────────────────────────────────────────────── */
export function Toaster({ position = "top-right" }: { position?: string } = {}) {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const notifications = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications);
  const cfg: PositionCfg =
    (TOAST_POSITIONS as Record<string, PositionCfg>)[position] || TOAST_POSITIONS["top-right"];
  if (typeof document === "undefined") return null;
  const toastLayer = (
    <AnimatePresence initial={false}>
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-[420px] sm:w-auto">
          <ToastItem toast={t} onDismiss={removeToast} from={cfg.from} />
        </div>
      ))}
    </AnimatePresence>
  );
  // La pila definitiva: los avisos persistentes SIEMPRE debajo de los toasts
  // (en columnas invertidas eso significa invertir el orden del DOM).
  const notificationLayer = notifications.length ? (
    <AnimatePresence initial={false}>
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto w-full max-w-[420px] sm:w-auto">
          <NotificationItem n={n} />
        </div>
      ))}
    </AnimatePresence>
  ) : null;
  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{ zIndex: "var(--z-toast, 100)" }}
      className={`pointer-events-none fixed inset-x-0 flex gap-3 px-4 py-4 sm:px-6 ${cfg.axis} ${cfg.box}`}
    >
      {cfg.axis === "flex-col-reverse" ? (
        <>
          {notificationLayer}
          {toastLayer}
        </>
      ) : (
        <>
          {toastLayer}
          {notificationLayer}
        </>
      )}
    </div>,
    document.body
  );
}

/* ─── API ────────────────────────────────────────────────────────────── */
/** Hook: devuelve la misma API (usa el contexto si existe). */
export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx || API_METHODS;
}

/** API imperativa — sustituto directo de `import { toast } from "sonner"`. */
export { default, toast } from "../../feedback/toastStore";

/* Contexto opcional: se mantiene por compatibilidad con <ToastProvider/>. */
export function ToastProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerApiRef(API_METHODS);
    return () => registerApiRef(null);
  }, []);
  return <ToastContext.Provider value={API_METHODS}>{children}</ToastContext.Provider>;
}

export { Toaster as SonnerToaster, typeMeta as toastTypeMeta };