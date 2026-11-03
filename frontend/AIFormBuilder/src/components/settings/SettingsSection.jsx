import { cn } from "../../lib/utils.js";

/**
 * Contenedor de sección reutilizable.
 * Incluye título, descripción y un borde opcional de separación.
 */
export function SettingsSection({ title, description, children, className, danger = false }) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-surface p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)] dark:shadow-none",
        danger
          ? "border-red-200/70 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/10"
          : "border-default dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-5">
          {title && (
            <h2
              className={cn(
                "text-[15px] font-semibold leading-none",
                danger ? "text-red-700 dark:text-red-400" : "text-fg"
              )}
            >
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1.5 text-sm text-muted leading-relaxed">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Fila de configuración con label + control a la derecha.
 */
export function SettingsRow({ label, description, children, className }) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0",
        "[&+&]:border-t [&+&]:border-default dark:[&+&]:border-slate-800",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {label && <p className="text-sm font-medium text-fg">{label}</p>}
        {description && <p className="mt-0.5 text-xs text-muted leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * Divider con label opcional.
 */
export function SettingsDivider({ label }) {
  if (!label) return <hr className="border-default dark:border-slate-800 my-5" />;
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-default dark:border-slate-800" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-surface px-3 text-xs font-medium text-muted dark:bg-slate-900">
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Skeleton de carga para secciones de Settings.
 */
export function SettingsSkeleton({ rows = 3 }) {
  return (
    <div className="rounded-2xl border border-default dark:border-slate-800 bg-surface dark:bg-slate-900 p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="mb-5 space-y-2">
        <div className="h-4 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 py-4 [&+&]:border-t border-default dark:border-slate-800"
        >
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
