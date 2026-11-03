import { Monitor, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../../hooks/useTheme.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { cn } from "../../lib/utils.js";

const MODE_ICONS = { system: Monitor, dark: Moon, light: Sun };
const MODE_LABEL_KEYS = { system: "systemMode", dark: "darkMode", light: "lightMode" };

/**
 * Botón de cambio de tema con 3 estados: Sistema → Oscuro → Claro → Sistema.
 *
 * - Sistema: icono de monitor (sincronizado con el sistema operativo).
 * - Oscuro : icono de luna.
 * - Claro  : icono de sol.
 *
 * La preferencia se persiste en localStorage (formly_theme_v2) en cada cambio manual
 * y, en modo "system", se escuchan los cambios del SO vía matchMedia.
 */
export function ThemeToggle({
  showLabel = false,
  className,
  iconWrapClassName,
  iconClassName = "h-[18px] w-[18px]",
  labelClassName,
}) {
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();

  const Icon = MODE_ICONS[theme] ?? Monitor;
  const label = t(MODE_LABEL_KEYS[theme] ?? "systemMode");

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
    >
      <span className={cn("relative grid shrink-0 place-items-center", iconWrapClassName)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ rotate: -45, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 45, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="grid place-items-center"
          >
            <Icon className={iconClassName} strokeWidth={1.8} />
          </motion.span>
        </AnimatePresence>
      </span>
      {showLabel && <span className={labelClassName}>{label}</span>}
    </button>
  );
}