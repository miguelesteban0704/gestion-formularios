import { useRoleT } from "../../lib/roleI18n.js";
import { cn } from "../../lib/utils.js";

/**
 * Etiqueta de categoría del formulario: puerta abierta (Público), eslabón
 * (Privado, unlisted) o candado (Restringido, exige IDP), en outline
 * minimalista con iconos SVG propios. Píldora glassmorphism, tooltip accesible
 * y solo icono en móvil.
 */
export function DoorOpenIcon({ className, strokeWidth = 1.7 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 20V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V20" />
      <path d="M4 20h16" />
      <path d="M18 5.5 11.5 7.5v10L18 20" />
      <circle cx="13" cy="12.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LockIcon({ className, strokeWidth = 1.7 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={strokeWidth} aria-hidden="true" focusable="false">
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <rect x="6" y="11" width="12" height="9" rx="2" />
      <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 16v1.6" />
    </svg>
  );
}

// Eslabón de cadena: la lectura visual de "Privado" (unlisted). Dos
// eslabones entrelazados, mismo trazo que el resto de iconos de la píldora.
function LinkIcon({ className, strokeWidth = 1.7 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={strokeWidth} aria-hidden="true" focusable="false">
      <path d="M9.6 14.4 14.4 9.6" />
      <path d="M8.3 11.2 6.7 12.8a3.5 3.5 0 0 0 5 5l1.6-1.6" />
      <path d="M15.7 12.8l1.6-1.6a3.5 3.5 0 0 0-5-5l-1.6 1.6" />
    </svg>
  );
}

const VARIANTS = {
  public: { className: "cat-public", icon: DoorOpenIcon, label: "publicOne", tip: "publicTip" },
  unlisted: { className: "cat-unlisted", icon: LinkIcon, label: "linkOnlyOne", tip: "linkOnlyTip" },
  private: { className: "cat-private", icon: LockIcon, label: "privateOne", tip: "privateTip" },
};

/** Solo el icono de la visibilidad (para pills, listas y columnas). */
export function VisibilityIcon({ type = "public", className, strokeWidth }) {
  const Icon = (VARIANTS[type] || VARIANTS.public).icon;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

export function CategoryBadge({ type = "public", className }) {
  const rt = useRoleT();
  const variant = VARIANTS[type] || VARIANTS.public;
  const label = rt(variant.label);
  const tip = rt(variant.tip);
  const Icon = variant.icon;
  return (
    <span
      className={cn("cat-badge", variant.className, className)}
      tabIndex={0}
      aria-label={`Categoría: ${label}`}
      data-tip={tip}
    >
      <Icon />
      <span className="cat-dot" aria-hidden="true" />
      <span className="cat-text">{label}</span>
      <span className="cat-tip" role="tooltip">
        {tip}
      </span>
    </span>
  );
}
