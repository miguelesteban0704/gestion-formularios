import { useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useFocusTrap, useBodyScrollLock, useEscapeKey } from "../../hooks/useOverlay.ts";
import { BACKDROP_Z, MODAL_Z } from "./Modal.jsx";
import "./crystal.css";

/**
 * Right-side slide-in drawer (vidrio Aurora). Used for response detail views
 * and contextual info. Accesible: Escape, overlay click y overflow bloqueado
 * (comparte las primitivas de overlay con <Modal/>).
 */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-md" }) {
  const { t } = useLanguage();
  const panelRef = useRef(null);

  useFocusTrap(panelRef, open);
  useBodyScrollLock(open);
  useEscapeKey(open, () => onClose?.());

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: BACKDROP_Z }}>
      <div
        className="absolute inset-0 animate-fade-in backdrop-blur-sm"
        style={{ background: "var(--overlay-bg)" }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        tabIndex={-1}
        className={cn(
          "drawer-shell absolute right-0 top-0 flex h-full w-full flex-col outline-none animate-slide-in-right",
          width
        )}
        style={{ zIndex: MODAL_Z }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent dark:via-white/20" />
        <div className="flex items-start justify-between gap-3 border-b border-slate-900/5 px-5 py-5 dark:border-white/5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-base font-semibold tracking-tight text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/70 bg-white/70 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-slate-900 dark:border-white/15 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer && (
          <div className="border-t border-slate-900/5 bg-white/45 px-5 py-4 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/30">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}