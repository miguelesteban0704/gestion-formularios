import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SuccessIcon } from "./animated-state-icons";
import { useLanguage } from "../../contexts/LanguageContext";

/* Éxito NO bloqueante: tarjeta de cristal verde con el icono que se dibuja,
   centrada en pantalla, sin fondo (deja ver el contexto ya consegido).
   role="status" + aria-live="polite": anuncia sin interrumpir. */

export interface SuccessAlertProps {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
  action?: ReactNode;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function SuccessAlert({ open, title, description, onClose, action }: SuccessAlertProps) {
  const { t } = useLanguage();
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: -14, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
          transition={{ duration: 0.3, ease: EASE }}
          role="status"
          aria-live="polite"
          className="cr-toast cr-tone-green-solid pointer-events-auto fixed left-1/2 top-1/2 z-[var(--z-toast,100)] flex w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 items-start gap-3.5 overflow-hidden px-4 py-4 pr-10"
        >
          <div className="cr-hairline" style={{ "--cr-accent": "var(--toast-tint)" } as CSSProperties} aria-hidden="true" />
          <span className="cr-orb cr-orb-lg shrink-0 text-white" aria-hidden="true">
            <SuccessIcon active size={28} strokeWidth={2.6} className="text-white drop-shadow-sm" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            {title && (
              <p className="text-[14.5px] font-bold leading-tight tracking-tight text-fg" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </p>
            )}
            {description && <p className="mt-1 text-[13px] font-[450] leading-[1.5] text-muted">{description}</p>}
            {action && <div className="mt-3">{action}</div>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label={t("close")}
              className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-fg/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 hover:bg-fg/10 hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}