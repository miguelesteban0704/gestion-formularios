import { ArrowRight } from "lucide-react";
import { CardDecor } from "./CardDecor.jsx";
import { CardSurface } from "../ui/CardSurface.jsx";
import { cn } from "../../lib/utils.js";
import { accents } from "@/shared/styles/tokens";

/**
 * Tarjeta del bento del panel.
 *
 * La superficie (borde, fondo translúcido, sombras en cuatro capas, mesh, grano
 * y el glow del hover) está definida una sola vez en `src/index.css` con las
 * utilidades `card-surface`, `card-mesh`, `card-grain` y `card-rim`. Aquí solo
 * se dice qué variante es cada tarjeta y se pinta el contenido. Es lo que
 * permite que las tarjetas de formularios compartan exactamente el mismo
 * lenguaje sin que nadie tenga que acordarse de mantenerlo.
 *
 * `--accent` es el color de la tarjeta y lo heredan todas sus capas; la
 * insignia no lo pongo y usa el de la marca, porque `card-surface` lo declara
 * como valor por defecto.
 *
 * Nada de esto cambia el contrato del componente: mismos props, mismo
 * `onClick`, mismo botón, mismas capas de texto.
 */
export function NavCard({
  title,
  description,
  icon: Icon,
  onClick,
  hero = false,
  accent = accents.gold,
  decor = "a",
  badge,
  className,
}) {
  return (
    <button
      onClick={onClick}
      /* La insignia no pone su color de acento: su degradado es de marca, así
         que el mesh, el filo y el glow salen del cian de la cuenta. Con el oro
         por defecto el resplandor del hover salía dorado sobre una tarjeta
         cian, que es justo la mezcla que no debe existir. El abanico de
         `CardDecor` sí conserva su color propio (`--accent`). */
      style={{
        "--accent": accent,
        "--card-accent": hero ? "var(--color-brand-500)" : accent,
      }}
      className={cn(
        "group relative flex aspect-[4/2.95] flex-col overflow-hidden p-7 text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500",
        /* La insignia también pasa por `card-surface`: su `background-color`
           queda tapado por el degradado de `bg-brand-hero`, que va en
           `background-image`, y a cambio gana el mismo borde, las mismas
           cuatro sombras y el mismo hover que las otras cinco. Un solo
           comportamiento de elevate en las seis, no dos. */
        "card-surface",
        hero && "bg-brand-hero text-white",
        className
      )}
    >
      {/* Mesh + grano + filo. En la insignia el mesh lo aporta el propio
          `bg-brand-hero` y el grano sí suma, así que solo van esos dos: tres
          capas sobre un degradado plano se leen como una mancha. */}
      <CardSurface mesh={!hero} />

      {/* El brillo superior: 1px que se apaga hacia los lados. Separa la tarjeta
          del fondo en los casos en que la sombra no llega. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          hero
            ? "bg-gradient-to-r from-transparent via-white/25 to-transparent"
            : "bg-gradient-to-r from-transparent via-[var(--card-accent)]/45 to-transparent"
        )}
      />

      {/* El motivo de la esquina: el mismo abanico de `CardDecor` que llevan las
          tarjetas de formularios. Lo que se ha ido son los orbes planos que lo
          acompañaban; en su lugar está el mesh de arriba. */}
      <div className="pointer-events-none absolute bottom-0 right-0 opacity-[0.98] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] group-hover:rotate-[0.6deg] dark:opacity-[0.94] dark:brightness-[1.08] dark:group-hover:opacity-100 dark:group-hover:brightness-[1.12]">
        <CardDecor variant={hero ? "hero" : decor} color={accent} />
      </div>

      {/* El velo de la insignia: sube el contraste del texto blanco sobre un
          degradado de marca claro sin tocar el color de la tarjeta. */}
      {hero && (
        <div aria-hidden="true" className="card-hero-scrim pointer-events-none absolute inset-0" />
      )}

      {/* Contenedor del icono: relieve de cristal, no un círculo de color plano.
          En la insignia el cristal es claro y el trazo va en tinta profunda:
          un icono blanco sobre vidrio blanco medía 1.7:1 sobre el cian. */}
      {Icon && (
        <div
          className={cn(
            "card-icon relative ml-auto grid h-10 w-10 place-items-center rounded-2xl border backdrop-blur-sm transition-all duration-300 group-hover:scale-105",
            hero
              ? "border-white/25 bg-white/16 text-brand-950"
              : "card-icon-frame card-accent-ink"
          )}
          style={!hero ? { backgroundColor: `color-mix(in srgb, ${accent} 11%, transparent)` } : undefined}
        >
          <Icon className="relative h-[22px] w-[22px]" strokeWidth={1.75} />
        </div>
      )}

      {/* Título y descripción */}
      <div className="relative mt-auto max-w-[76%]">
        <h3
          className={cn(
            "text-[18px] font-bold leading-none tracking-[-0.01em]",
            hero ? "text-white" : "text-ink"
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              "mt-2 text-[13.5px] leading-[1.50]",
              hero ? "text-white/82 dark:text-white/85" : "text-ink-muted"
            )}
          >
            {description}
          </p>
        )}
      </div>

      {/* Pie: flecha + píldora */}
      <div className="relative mt-5 flex items-center gap-3">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full border text-[13px]",
            hero
              ? "card-arrow border-white bg-white text-brand-700 group-hover:scale-105 dark:bg-white dark:text-brand-800"
              /* `card-arrow` / `card-arrow-on` llevan relleno, glifo y relieve
                 como un solo par de utilidades, y `--card-accent` ya viene
                 puesto en la raíz de la tarjeta: aquí no hace falta el `style`
                 en línea que antes fijaba el relleno al 9% y lo dejaba fijo en
                 hover. El glifo oscuro conserva contraste en todos los acentos
                 del panel y el círculo toma el color de la tarjeta. */
              : "card-arrow group-hover:card-arrow-on group-hover:scale-105"
          )}
        >
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-[1px]" />
        </span>
        {badge != null &&
          (hero ? (
            /* En la insignia la píldora es de cristal blanco: el acento de la
               tarjeta es el de la marca y aquí competiría con el degradado. */
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-xs font-semibold leading-none tracking-wide text-white backdrop-blur dark:border-white/25 dark:bg-white/18">
              {badge}
            </span>
          ) : (
            <span className="card-pill">{badge}</span>
          ))}
      </div>
    </button>
  );
}
