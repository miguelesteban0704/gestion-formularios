import { useState } from "react";
import { initials } from "../../lib/utils.js";
import { cn } from "../../lib/utils.js";
import { useTheme } from "../../hooks/useTheme.js";

/**
 * Avatar — las iniciales de respaldo usan el color de acento preferido del
 * usuario (Settings → Apariencia). Si (por entidades de terceros) se quiere un
 * color distinto, se pasa explícitamente vía la prop `color`.
 */
export function Avatar({ name = "", color, avatarUrl, size = "md", className, text }) {
  const { accent } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white",
        sizes[size],
        className
      )}
      style={{ backgroundColor: color || accent }}
    >
      {avatarUrl && !imageFailed && (
        <img
          src={avatarUrl}
          alt={name ? `Foto de ${name}` : "Foto de perfil"}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
      <span className={cn("leading-none", avatarUrl && !imageFailed && "hidden")}>
        {text != null && text !== "" ? text : initials(name) || "?"}
      </span>
    </span>
  );
}
