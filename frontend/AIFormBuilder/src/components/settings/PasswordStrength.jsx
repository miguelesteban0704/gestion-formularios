import { useMemo } from "react";
import { cn } from "../../lib/utils.js";

const LEVELS = [
  { min: 2, label: "weak", color: "bg-red-500" },
  { min: 3, label: "fair", color: "bg-amber-500" },
  { min: 4, label: "good", color: "bg-lime-500" },
  { min: 5, label: "strong", color: "bg-brand-600" },
];

const LABELS = {
  weak: { en: "Weak", es: "Débil" },
  fair: { en: "Fair", es: "Media" },
  good: { en: "Good", es: "Buena" },
  strong: { en: "Strong", es: "Fuerte" },
};

/**
 * Medidor de fortaleza de contraseña en tiempo real (0–5 puntos).
 */
export function PasswordStrength({ value = "", labels }) {
  const { score, level, label } = useMemo(() => {
    let s = 0;
    if (value.length >= 8) s += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s += 1;
    if (/[0-9]/.test(value)) s += 1;
    if (/[^A-Za-z0-9]/.test(value)) s += 1;
    if (value.length >= 12) s += 1;

    const lvl = LEVELS.find((l) => s < l.min) || LEVELS[LEVELS.length - 1];
    const l = labels?.[lvl.label] || LABELS[lvl.label][labels?.es ? "es" : "en"];
    return { score: s, level: lvl.label, label: value ? l : "" };
  }, [value, labels]);

  if (!value) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < score ? LEVELS.find((l) => l.label === level)?.color : "bg-slate-200 dark:bg-slate-700",
            )}
          />
        ))}
      </div>
      <p className={cn("text-[11px] font-medium", level === "weak" ? "text-red-500" : level === "fair" ? "text-amber-500" : level === "good" ? "text-lime-600 dark:text-lime-400" : "text-brand-600 dark:text-brand-400")}>
        {label}
      </p>
    </div>
  );
}