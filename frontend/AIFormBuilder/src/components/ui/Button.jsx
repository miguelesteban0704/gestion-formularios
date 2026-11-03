import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils.js";

/**
 * Botón del sistema.
 *
 * El aspecto vive en `src/index.css`, en el bloque "SISTEMA DE BOTONES": una
 * utilidad de ASPECTO por variante (`btn-primary`, `btn-secondary`,
 * `btn-outline`, `btn-danger`, `btn-subtle`, `btn-ghost`) y un juego de
 * utilidades de ESTADO que todas comparten (`btn-relief`, `btn-hi`,
 * `btn-press`, `btn-focus`, `btn-off`, `btn-busy`).
 *
 * La separación es deliberada. El aspecto dice cómo se ve el botón; los
 * estados dicen qué le pasa. Así un llamante que necesita retocar solo el
 * color (un `bg-brand-50` de marca, por ejemplo) no tiene que reescribir el
 * relieve entero ni perder el bisel, y las micro-interacciones quedan
 * idénticas en los seis aspectos sin repetirlas en cada uno.
 *
 * Nada de esto altera el contrato: mismas props, mismos valores por defecto,
 * mismo `forwardRef`, mismo `Loader2` de carga, mismo `disabled` que también
 * se activa con `loading`.
 */
const VARIANTS = {
  primary: "btn-primary btn-relief",
  secondary: "btn-secondary btn-relief",
  ghost: "btn-ghost",
  danger: "btn-danger btn-relief",
  outline: "btn-outline btn-relief",
  subtle: "btn-subtle btn-relief",
};

const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[20px]",
  md: "h-10 px-4 text-sm gap-2 rounded-[20px]",
  lg: "h-12 px-6 text-base gap-2.5 rounded-[20px]",
  icon: "h-10 w-10 rounded-[20px]",
  "icon-sm": "h-8 w-8 rounded-[20px]",
};

/* Cuanto más grande el botón, más cuerpo tiene el texto y más estrecho el
   tracking: a 12px un `-0.01em` se nota y afina el conjunto; a 24px estorba.
   El cuerpo sube un grado sobre `font-medium` para que el botón no compita en
   peso con el título que tiene al lado. */
const TYPE = {
  sm: "font-semibold",
  md: "font-semibold tracking-[-0.01em]",
  lg: "font-semibold tracking-[-0.015em]",
  icon: "",
  "icon-sm": "",
};

export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "group/btn relative inline-flex select-none items-center justify-center whitespace-nowrap",
        "cursor-pointer border",
        /* Los estados van después del aspecto para que su `box-shadow` gane: los
           dos escriben la misma propiedad y el de hover debe prevalecer. */
        "btn-hi btn-press btn-focus btn-off btn-busy",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        TYPE[size],
        className
      )}
      {...props}
    >
      {/* `data-btn-spinner` no es decorativo: es lo que separa el indicador de
          carga del resto de hijos en `btn-busy` y en la regla que sube el glifo
          al hover. Sin él, el spinner heredaría el `scale` y se detendría. */}
      {loading && (
        <Loader2
          data-btn-spinner
          className="btn-spinner h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});
