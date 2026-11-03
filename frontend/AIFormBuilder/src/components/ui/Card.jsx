import { useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { CardSurface } from "./CardSurface.jsx";
import "./crystal.css";

/**
 * Tarjeta base del sitio. Antes escribía aquí su propio borde, su fondo y sus
 * sombras; ahora delega en `card-surface` (src/index.css) y en las capas de
 * `CardSurface`, igual que hacen el bento del panel y las tarjetas de métricas.
 * Un solo sitio decide cómo se ve una tarjeta.
 *
 * El `hover` se queda como prop porque los usages lo usan para el txn de un
 * par de sitios; el comportamiento de verdad (elevación, sombra, glow) ya lo
 * trae la utilidad, así que aquí solo se afina el recorrido.
 */
export function Card({ className, hover = false, children, style, ...props }) {
  return (
    <div
      className={cn("card-surface", hover && "hover:-translate-y-0.5", className)}
      // Sin `backdrop-filter` aquí, y sí en el bento del panel y en las
      // tarjetas de métricas. Cada elemento con desenfoque de fondo es una raíz
      // de composición propia: con diez tarjetas no se nota, con una pantalla
      // llena de formularios sí, al desplazar. La rejilla lo compensa con un
      // fondo algo más opaco (`--card-bg`), que es el mismo resultado visual.
      // El `style` de quien llama se mezcla después para que su acento gane.
      style={{ "--card-backdrop": "none", ...style }}
      {...props}
    >
      <CardSurface />
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}

export function CardBody({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}

/**
 * Tooltip de la tarjeta de métrica. Antes llevaba su propio fondo —`bg-white/95`
 * en claro y `bg-slate-800/95` en oscuro— con un `border-slate-200` y una sombra
 * gris: el mismo cuadro que hoy pinta el sistema, pero congelado, y por tanto
 * sin rastro del color que el usuario eligió en Apariencia.
 *
 * Ahora delega en `cr-tooltip`, el mismo cristal que el modal y el toast, así que
 * el tinte sale de `--glass-chroma` → `--color-brand-*` y esta caja cambia con
 * el acento sola. También se va el par `text-slate-900 dark:text-slate-100` a
 * `text-fg`: son los mismos valores, pero escritos como el token que hace que el
 * texto siga al tema si algún día cambian.
 */
export function StatTooltip({ tooltip }) {
  // Los hooks van ANTES del `return null`. Con `if (!tooltip) return null`
  // primero, una tarjeta que pierde su tooltip entre dos renders dejaba de
  // llamar a los tres hooks: React no admite eso y tumba el árbol entero. Es un
  // fallo que solo aparece cuando el dato tarda en llegar, que es justo cuando
  // el tooltip se pasa sin `items` y se monta después.
  const tooltipRef = useRef(null);
  const [mobilePlacement, setMobilePlacement] = useState("below");

  useLayoutEffect(() => {
    const tooltipElement = tooltipRef.current;
    if (!tooltipElement || !window.matchMedia("(max-width: 639px)").matches) return;

    const cardRect = tooltipElement.parentElement?.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    if (!cardRect) return;

    const spaceBelow = window.innerHeight - cardRect.bottom;
    const spaceAbove = cardRect.top;
    setMobilePlacement(spaceBelow < tooltipRect.height + 16 && spaceAbove > tooltipRect.height ? "above" : "below");
  }, [tooltip]);

  if (!tooltip) return null;

  const mobilePosition = mobilePlacement === "above"
    ? "bottom-full mt-0 mb-3 translate-y-1"
    : "top-full mt-3 -translate-y-1";

  return (
    <div
      role="tooltip"
      ref={tooltipRef}
      className={cn(
        "cr-tooltip pointer-events-none invisible absolute left-0 right-0 z-[var(--z-tooltip)] max-h-[min(24rem,calc(100dvh-2rem))] w-auto translate-x-0 overflow-y-auto p-4 text-left opacity-0 transition-all duration-200",
        mobilePosition,
        "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100",
        "sm:bottom-full sm:left-1/2 sm:right-auto sm:top-auto sm:mb-3 sm:mt-0 sm:w-[min(22rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:translate-y-1"
      )}
    >
      <span className="cr-hairline" aria-hidden="true" />
      <p className="text-sm font-semibold text-fg">{tooltip.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{tooltip.description}</p>
      {/* El separador y la lista solo se pintan si hay lista: `items` es
          opcional en la API y todos los usos actuales lo pasan, pero un
          tooltip con solo título y descripción no debe romper la página. */}
      {tooltip.items?.length > 0 && (
        <div className="cr-tooltip-rule mt-3 space-y-1.5 pt-3 text-xs text-ink-muted">
          {tooltip.items.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4">
              <span className="min-w-0 break-words">{item.label}</span>
              <strong className="min-w-0 break-words text-right font-semibold text-fg">{item.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sublabel, accent = "brand", tooltip, className }) {
  const accents = {
    // Único acento que sigue a la marca. Los de abajo (green/amber/pink/blue)
    // son tonos semánticos y decorativos: se quedan donde están aunque cambie
    // el color del sitio, porque "verde = correcto" no puede depender del tema.
    //
    // Estas cadenas ya no traen sombra propia: el brillo del contenedor lo pone
    // `card-icon`, derivándolo de `--card-accent`. Antes iba escrito una vez por
    // variante y solo en oscuro, así que en claro los seis iconos eran un
    // círculo de color plano.
    brand: {
      wrap: "bg-brand-50 text-brand-700 border-brand-200/60 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800/50",
      orb: "var(--color-brand-600)",
      orbDark: "var(--color-brand-400)",
    },
    green: {
      wrap: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
      orb: "#059669",
      orbDark: "#10b981",
    },
    amber: {
      wrap: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
      orb: "#d97706",
      orbDark: "#f59e0b",
    },
    pink: {
      wrap: "bg-pink-50 text-pink-600 border-pink-200/60 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-800/40",
      orb: "#db2777",
      orbDark: "#ec4899",
    },
    blue: {
      wrap: "bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
      orb: "#2563eb",
      orbDark: "#38bdf8",
    },
    violet: {
      wrap: "bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40",
      orb: "#7c3aed",
      orbDark: "#a78bfa",
    },
  };
  const a = accents[accent] || accents.brand;

  return (
    <div
      className={cn("card-surface group relative overflow-visible p-5", className)}
      style={{ "--card-accent": a.orb }}
    >
      <CardSurface />

      {/* El brillo superior: 1px que se apaga hacia los lados. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[var(--card-accent)]/40 to-transparent"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-medium tracking-wide text-ink-muted">{label}</p>
            {tooltip && (
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-full text-slate-400 outline-none transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:bg-slate-100 focus-visible:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-brand-400 dark:focus-visible:bg-slate-800"
                aria-label={`${label}: ${tooltip.title}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-2 text-[30px] font-bold leading-none tracking-tight text-ink">{value}</p>
          {sublabel && <p className="mt-1.5 text-xs font-medium text-ink-muted">{sublabel}</p>}
        </div>
        {Icon && (
          /* `a.wrap` se deja tal cual, con sus clases de fondo, texto y borde:
             es de donde se leen los tres indicadores que comprueba
             qa/accent-probe.js para verificar que el acento sigue vivo.
             Lo que se le añade encima es el relieve, que va en `box-shadow`. */
          <div
            className={cn(
              "card-icon relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border backdrop-blur-sm transition-transform duration-300 group-hover:scale-105",
              a.wrap
            )}
          >
            <Icon className="relative h-5 w-5" strokeWidth={1.9} />
          </div>
        )}
      </div>
      <StatTooltip tooltip={tooltip} />
    </div>
  );
}
