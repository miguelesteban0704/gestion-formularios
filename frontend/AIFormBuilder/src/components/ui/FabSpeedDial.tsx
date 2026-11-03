import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/shared/skills";

/* ═══════════════════════════════════════════════════════════════════════
   FabSpeedDial: botón de acción flotante con menú de acciones (speed
   dial) para la columna de Acciones de las tablas del panel.

   - Theming dinámico del superadmin: el acento sale de `--fab-accent`,
     que por defecto hereda la marca viva del sitio
     (`var(--color-brand-600)`, reescrita por `lib/accent.js` con el
     color guardado en configuración). Degradados, anillo de glow y
     tintes se derivan con `color-mix()` de esa variable, así que todo
     sigue al acento automáticamente, en claro y en oscuro.
   - El menú vive en un portal a `document.body`: las tarjetas usan
     `isolation: isolate` (un stacking context propio cada una), así que
     un menú en flujo quedaría pintado por debajo de las tarjetas
     siguientes. En portal, con backdrop propio, siempre pinta encima.
   - Física de muelles Framer Motion (stiffness 300 / damping 25),
     entrada escalonada, hover scale-105, press scale-95, cierre con
     clic fuera, scroll, resize o Escape (devuelve el foco al disparador).
   ═══════════════════════════════════════════════════════════════════════ */

export interface FabAction {
  id: string;
  /** Etiqueta visible a la izquierda del icono + nombre accesible. */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface FabSpeedDialTheme {
  /** Color de acento (cualquiera válido en CSS). Por defecto, la marca
      viva del sitio: sigue al color guardado por el superadmin. */
  accent?: string;
}

export interface FabSpeedDialProps {
  actions: FabAction[];
  /** Nombre accesible del disparador, p. ej. "Acciones de X". */
  label: string;
  /** Nombre accesible del menú. Por defecto, `label`. */
  menuLabel?: string;
  theme?: FabSpeedDialTheme;
  className?: string;
  /** "inline" vive en la fila; "fixed" lo ancla abajo-derecha con
      safe-area (`bottom-8 right-8`). */
  position?: "inline" | "fixed";
}

const SPRING = { type: "spring", stiffness: 300, damping: 25 } as const;

// Anillo + sombra del disparador en reposo y abierto: misma estructura
// para que el muelle interpole entre ambos sin saltos. Sombras neutras
// (sin tinte): la única luz de color la pone el degradado del botón.
const IDLE_GLOW =
  "0 10px 22px -8px rgb(0 0 0 / 0.35), inset 0 0 0 1px rgb(255 255 255 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.5), inset 0 -8px 14px -8px color-mix(in srgb, black 25%, transparent)";
const OPEN_GLOW =
  "0 14px 30px -6px rgb(0 0 0 / 0.4), inset 0 0 0 1px rgb(255 255 255 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.55), inset 0 -8px 14px -8px color-mix(in srgb, black 25%, transparent)";

const listVariants: Variants = {
  open: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  closed: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
};

const itemVariants: Variants = {
  open: { opacity: 1, y: 0 },
  closed: { opacity: 0, y: 10 },
};

export function FabSpeedDial({
  actions,
  label,
  menuLabel,
  theme,
  className,
  position = "inline",
}: FabSpeedDialProps) {
  const [open, setOpen] = useState(false);
  // Posición fija del menú (estilo `bottom/right` o `top/right`): se mide
  // el disparador al abrir y el menú cae hacia arriba; si no hay sitio,
  // cae hacia abajo.
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const accent = theme?.accent ?? "var(--color-brand-600)";
  const accentVars = { "--fab-accent": accent } as CSSProperties;

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const toggle = () => {
    if (open) {
      close(false);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 10;
    // Altura estimada: una fila (~44px) por acción + relleno del panel.
    const estH = actions.length * 48 + 16;
    const openUp = rect.top > estH + 24 || rect.top > window.innerHeight - rect.bottom;
    const right = Math.max(12, window.innerWidth - rect.right);
    setMenuStyle(
      openUp
        ? { bottom: Math.max(12, window.innerHeight - rect.top + gap), right }
        : { top: Math.min(window.innerHeight - estH - 12, rect.bottom + gap), right },
    );
    setOpen(true);
  };

  // Cierre con Escape (devuelve el foco), con scroll/resize (el ancla se
  // movería) y con clic en el backdrop. Solo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    const onScroll = () => close(false);
    const onResize = () => close(false);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open ]);

  const runAction = (action: FabAction) => {
    close(false);
    action.onClick();
  };

  // Disparador luminoso: degradado vivo del acento con highlight
  // especular fuerte, filo de luz neutro y barrido al hover. Sin halo
  // exterior de color: las sombras son neutras.
  const trigger = (
    <span className="relative inline-grid place-items-center">
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        animate={{ boxShadow: open ? OPEN_GLOW : IDLE_GLOW }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING}
        style={{
          ...accentVars,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--fab-accent), white 24%), color-mix(in srgb, var(--fab-accent) 90%, black))",
        }}
        className={cn(
          "group relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-2xl text-white transition-[filter] duration-200",
          open ? "brightness-110" : "hover:brightness-110",
          className,
        )}
      >
        {/* Barrido de luz: solo transiciona al entrar en hover; al salir
            se reposiciona al instante (invisible) para el próximo pase. */}
        <span aria-hidden="true" className="motion-reduce:hidden pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <span className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 -translate-x-[250%] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-none group-hover:translate-x-[450%] group-hover:opacity-100 group-hover:transition-all group-hover:duration-700 group-hover:ease-out" />
        </span>
        {/* La cruz rota 45° y se vuelve una X al abrir, sin cambiar de icono. */}
        <motion.span
          aria-hidden="true"
          className="relative grid place-items-center"
          initial={false}
          animate={{ rotate: open ? 45 : 0, scale: open ? 1.12 : 1 }}
          transition={SPRING}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </motion.span>
      </motion.button>
    </span>
  );

  const overlay = createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            aria-hidden="true"
            onClick={() => close(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] cursor-default bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-menu"
            id={menuId}
            role="menu"
            aria-label={menuLabel || label}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={SPRING}
            style={{ ...accentVars, ...menuStyle }}
            className="fixed z-[71] min-w-[13rem] rounded-2xl border border-white/60 bg-white/80 p-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#141821]/85"
          >
            {/* Superficie glass + anillo reactivo al acento + elevación
                multicapa: el glow se deriva del color guardado. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                boxShadow:
                  "0 0 0 1px color-mix(in srgb, var(--fab-accent) 28%, transparent), 0 25px 50px -12px rgb(0 0 0 / 0.35), 0 0 36px -10px color-mix(in srgb, var(--fab-accent) 40%, transparent)",
              }}
            />
            <motion.div
              variants={listVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="relative"
            >
              {actions.map((action) => (
                <motion.div key={action.id} variants={itemVariants} transition={SPRING}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={action.disabled}
                    onClick={() => runAction(action)}
                    aria-label={action.label}
                    className={cn(
                      "flex w-full items-center justify-end gap-2.5 rounded-xl px-2.5 py-2 text-right transition-colors duration-150",
                      action.danger
                        ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        : "text-ink hover:bg-slate-900/5 dark:hover:bg-white/5",
                      action.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {action.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border backdrop-blur-sm [&_svg]:h-4 [&_svg]:w-4"
                      style={
                        action.danger
                          ? {
                              borderColor: "color-mix(in srgb, var(--color-danger) 26%, transparent)",
                              backgroundColor: "color-mix(in srgb, var(--color-danger) 11%, transparent)",
                              color: "color-mix(in srgb, var(--color-danger) 76%, var(--fg))",
                            }
                          : {
                              borderColor: "color-mix(in srgb, var(--fab-accent) 25%, transparent)",
                              backgroundColor: "color-mix(in srgb, var(--fab-accent) 10%, transparent)",
                              color: "color-mix(in srgb, var(--fab-accent) 75%, var(--fg))",
                            }
                      }
                    >
                      {action.icon}
                    </span>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );

  if (position === "fixed") {
    return (
      <>
        <span className="fixed bottom-[max(2rem,env(safe-area-inset-bottom))] right-[max(2rem,env(safe-area-inset-right))] z-40 inline-flex">
          {trigger}
        </span>
        {overlay}
      </>
    );
  }

  return (
    <>
      {trigger}
      {overlay}
    </>
  );
}

export default FabSpeedDial;
