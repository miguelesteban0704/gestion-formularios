import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils.js";
import "./crystal.css";

const GAP = 8;
const SIDE_OFFSET = 6; // arrow offset

function chooseSide(anchor, tooltipSize, preferred) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const space = {
    top: anchor.top,
    bottom: vh - anchor.bottom,
    left: anchor.left,
    right: vw - anchor.right,
  };
  const need = {
    top: tooltipSize.height + GAP,
    bottom: tooltipSize.height + GAP,
    left: tooltipSize.width + GAP,
    right: tooltipSize.width + GAP,
  };
  const order = {
    top: ["top", "bottom", "right", "left"],
    bottom: ["bottom", "top", "right", "left"],
    left: ["left", "right", "top", "bottom"],
    right: ["right", "left", "top", "bottom"],
  }[preferred] || ["top", "bottom", "right", "left"];

  for (const s of order) if (space[s] >= need[s]) return s;
  // fallback to side with max space
  return Object.entries(space).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Tooltip del sistema. Es una pieza de cristal como el modal, el toast o el
 * drawer: la receta vive en `cr-tooltip` (components/ui/crystal.css) y el
 * tinte sale de `--glass-chroma`, que es la escala `--color-brand-*` que
 * `lib/accent.js` reescribe cuando el usuario cambia el color de acento en
 * Apariencia. Por eso el tooltip sigue al color elegido sin tocar este
 * componente — antes iba con `bg-[var(--fg)] text-[var(--surface)]`, un cuadro
 * invertido que además congelaba el acento justo en la pieza que más se lee.
 *
 * `tint` permite apartarlo de la marca para un tooltip semántico (por ejemplo
 * un aviso de destructive). Sin él, hereda el acento vivo.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center", // start | center | end
  delay = 120,
  disabled = false,
  className,
  contentClassName,
  maxWidth = 240,
  tint,
}) {
  const id = useId();
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [actualSide, setActualSide] = useState(side);
  const [actualAlign, setActualAlign] = useState(align);
  const timer = useRef(null);

  const show = () => {
    if (disabled || !content) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  // position on open / resize / scroll
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    // measure tooltip after first render: if not yet measured, use estimate 200x40
    const tip = tooltipRef.current?.getBoundingClientRect() || { width: Math.min(maxWidth, 200), height: 36 };
    const chosen = chooseSide(anchor, tip, side);
    setActualSide(chosen);

    let x = 0, y = 0;
    const vw = window.innerWidth;
    if (chosen === "top") {
      y = anchor.top - tip.height - GAP;
      if (align === "start") x = anchor.left;
      else if (align === "end") x = anchor.right - tip.width;
      else x = anchor.left + anchor.width / 2 - tip.width / 2;
    } else if (chosen === "bottom") {
      y = anchor.bottom + GAP;
      if (align === "start") x = anchor.left;
      else if (align === "end") x = anchor.right - tip.width;
      else x = anchor.left + anchor.width / 2 - tip.width / 2;
    } else if (chosen === "left") {
      x = anchor.left - tip.width - GAP;
      y = anchor.top + anchor.height / 2 - tip.height / 2;
    } else {
      x = anchor.right + GAP;
      y = anchor.top + anchor.height / 2 - tip.height / 2;
    }
    // clamp to viewport 8px
    x = Math.max(8, Math.min(vw - tip.width - 8, x));
    // for top/bottom, ensure y in viewport (if not, flip already did, but clamp)
    y = Math.max(8, Math.min(window.innerHeight - tip.height - 8, y));
    setCoords({ x, y });

    // keep align in bounds — if clamped, we keep as chosen but visually centered
    setActualAlign(align);
  }, [open, side, align, maxWidth, content]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    const onResize = () => setOpen(false);
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!content) return children;

  // micro offset per side for motion origin
  const offset = { top: { y: 4 }, bottom: { y: -4 }, left: { x: 4 }, right: { x: -4 } }[actualSide] || { y: 4 };

  // La flecha se ancla al borde del lado en el que quedó la caja. El giro y el
  // centrado los pone `cr-tooltip-arrow`; aquí solo va en qué borde y a qué
  // distancia del centro, que es lo único que depende del lado.
  const arrowStyle = {
    left: actualSide === "left" ? "100%" : actualSide === "right" ? "0" : "50%",
    top: actualSide === "top" ? "100%" : actualSide === "bottom" ? "0" : "50%",
  };

  return (
    <>
      <span
        ref={anchorRef}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onTouchStart={show}
        onTouchEnd={hide}
        className={cn("inline-flex", className)}
      >
        {children}
      </span>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={tooltipRef}
                id={id}
                role="tooltip"
                initial={{ opacity: 0, scale: 0.97, ...offset }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, ...offset, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  left: coords.x,
                  top: coords.y,
                  maxWidth,
                  zIndex: "var(--z-tooltip, 80)",
                  ...(tint ? { "--tooltip-tint": tint } : null),
                }}
                className={cn(
                  "cr-tooltip pointer-events-none select-none px-3 py-2 text-xs font-medium leading-relaxed",
                  contentClassName
                )}
              >
                {/* El filo de luz de 2px del sistema, que en el tooltip baja a
                    1px por `.cr-tooltip .cr-hairline`. */}
                <span className="cr-hairline" aria-hidden="true" />

                {/* El texto va en `var(--fg)` sobre cristal, no invertido: es lo
                    que hacen el modal y el toast, y es lo que mantiene la
                    legibilidad sin tener que invertir nada en dark. */}
                <span className="block text-balance">{content}</span>

                <span aria-hidden="true" className="cr-tooltip-arrow" style={arrowStyle} />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

// Lightweight hook version for programmatic use (e.g., chart tooltips already use recharts, but we keep this for UI)
export function useTooltip() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
