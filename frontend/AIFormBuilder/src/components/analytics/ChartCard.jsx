import { cn } from "../../lib/utils.js";

/** Premium chart card — light: airy white, dark: ink glass with neon orbs. Perfect contrast. */
export function ChartCard({ title, subtitle, icon: Icon, right, className, bodyClass, children }) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[22px] border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_42px_-20px_rgba(16,24,40,0.14)] backdrop-blur-xl transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-14px_rgba(16,24,40,0.16),0_22px_48px_-20px_rgba(16,24,40,0.16)] hover:border-slate-200",
        "dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_16px_48px_rgba(0,0,0,0.45),0_4px_16px_rgba(0,0,0,0.35)] dark:hover:border-slate-700 dark:hover:shadow-[0_20px_56px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      {/* top hairline — light: slate, dark: white 7% for glass edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-900/[0.06] to-transparent dark:via-white/[0.07]" />
      {/* inner ring — subtle depth */}
      <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-black/[0.02] dark:ring-white/[0.06]" />
      {/* glass highlight — white wash light, subtle sheen dark */}
      <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-gradient-to-b from-white to-transparent opacity-60 dark:from-white/[0.05] dark:to-transparent dark:opacity-100" />
      {/* ambient orbs — low opacity light, neon pop dark */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-brand-500/[0.06] blur-2xl transition-opacity duration-500 group-hover:bg-brand-500/[0.08] dark:bg-brand-400/[0.10] dark:group-hover:bg-brand-400/[0.14] dark:blur-[28px]" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-amber-500/[0.04] blur-2xl dark:bg-amber-400/[0.07] dark:group-hover:bg-amber-400/[0.10]" />
      {/* dark depth vignette */}
      <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-gradient-to-t from-black/0 via-transparent to-transparent dark:from-black/[0.12] dark:via-transparent hidden dark:block" />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-brand-200/60 bg-brand-50 text-brand-700 shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 dark:border-brand-800/50 dark:bg-brand-950/50 dark:text-brand-300 dark:shadow-[var(--shadow-brand-glow)]">
              <Icon className="h-5 w-5" strokeWidth={1.85} />
            </span>
          )}
          <div>
            <h3 className="text-[13.5px] font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs font-medium leading-tight text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="flex items-center">{right}</div>}
      </div>

      <div className={cn("relative z-10 mt-5 flex-1", bodyClass)}>{children}</div>
    </div>
  );
}
