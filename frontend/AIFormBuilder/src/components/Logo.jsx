import { cn } from "../lib/utils.js";
import { useTheme } from "../hooks/useTheme.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export function Logo({ className, showText = true, size = 32, tone = "auto", tint = false }) {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const lightTone = tone === "light" || (tone === "auto" && isDark);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {tint ? (
        <span role="img" aria-label={t("appName")} className="logo-tint" style={{ width: size, height: size }} />
      ) : (
        <img
          src="/favicon.png"
          alt={t("appName")}
          className={cn("h-auto w-auto object-contain", lightTone && "brightness-0 invert", showText ? "rounded-none" : "rounded-xl")}
          style={{ width: size, height: size }}
        />
      )}
      {showText && <span className={cn("text-lg font-bold tracking-tight", lightTone ? "text-white" : "text-fg")}>{t("appName")}</span>}
    </div>
  );
}
