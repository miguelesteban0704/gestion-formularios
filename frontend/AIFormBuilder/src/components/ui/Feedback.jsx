import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import "./crystal.css";

export function Spinner({ className }) {
  return (
    <Loader2 className={cn("h-5 w-5 animate-spin text-brand-500 motion-reduce:animate-none", className)} />
  );
}

/**
 * Estado de carga de ruta. Comparte lenguaje con el sistema de overlays:
 * anillo de progreso + marca de cristal + rótulo en chip de vidrio.
 */
export function PageLoader({ label }) {
  const { t } = useLanguage();
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-24"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="relative grid h-[60px] w-[60px] place-items-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-spin rounded-full motion-reduce:animate-none"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, var(--color-brand-500) 280deg, transparent 360deg)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))",
          }}
        />
        <span
          className="cr-orb text-white"
          style={{ width: 36, height: 36, "--cr-orb": "var(--color-brand-500)" }}
          aria-hidden="true"
        />
      </span>
      <p className="cr-chip" style={{ "--chip-tint": "var(--color-brand-500)" }}>{label || t("loading")}</p>
    </div>
  );
}

/* 🆕 Shimmer en vez de pulse: se siente "producto real" en dashboards */
export function Skeleton({ className }) {
  return (
    <div className={cn("skeleton-shimmer animate-shimmer rounded-lg", className)} />
  );
}

const BADGE_VARIANTS = {
  default:
    "border border-line bg-surface-2 text-ink-muted",
  brand:
    "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200",
  green:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  amber:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  gray:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function Badge({ variant = "default", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/30">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}