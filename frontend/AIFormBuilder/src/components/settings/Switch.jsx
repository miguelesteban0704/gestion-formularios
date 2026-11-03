import { cn } from "../../lib/utils.js";

/**
 * Interruptor accesible (role="switch"), estilo Linear/Vercel.
 */
export function Switch({ checked, onChange, disabled, label, className, size = "md" }) {
  const dimensions = size === "sm"
    ? { track: "h-5 w-9", knob: 16, off: "translate-x-[2.5px]", on: "translate-x-[17px]", gap: 5 }
    : { track: "h-6 w-10", knob: 18, off: "translate-x-[3px]", on: "translate-x-[19px]", gap: 4 };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label || undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-50",
        dimensions.track,
        checked ? "bg-brand-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]" : "bg-slate-300 dark:bg-slate-600/80",
        className,
      )}
    >
      <span
        style={{ width: dimensions.knob, height: dimensions.knob }}
        className={cn(
          "inline-block rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? dimensions.on : dimensions.off,
        )}
      />
    </button>
  );
}