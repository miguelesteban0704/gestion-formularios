import { useEffect, useId, useState, type ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { Modal } from "./Modal";
import { alertTone } from "../../feedback/variants";
import { useLanguage } from "../../contexts/LanguageContext";

/* Borrado con confirmación escrita: hasta que no se teclea la palabra exacta,
   el botón destructivo late (cr-btn-danger-pulse). `requireWord=false` lo
   arma directamente (ConfirmDialog clásico). */

export interface DeleteDialogProps {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  word?: string;
  requireWord?: boolean;
  caseSensitive?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
}

export function DeleteDialog({
  open,
  title,
  description,
  word = "ELIMINAR",
  requireWord = false,
  caseSensitive = true,
  onConfirm,
  onCancel,
  loading = false,
  confirmText,
  cancelText,
}: DeleteDialogProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const inputId = useId();
  const hintId = useId();

  // Al abrir, el campo empieza limpio (nunca guarda el intento que se canceló).
  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  const armed = !requireWord
    ? true
    : caseSensitive
      ? value.trim() === word
      : value.trim().toLowerCase() === word.toLowerCase();

  const orb = (
    <span className={`cr-orb cr-orb-lg text-white ${alertTone({ tone: "error" })}`} aria-hidden="true">
      <Trash2 className="h-7 w-7 drop-shadow-sm" strokeWidth={2.2} />
    </span>
  );

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      description={description}
      size="sm"
      variant="danger"
      orb={orb}
      aura="var(--color-danger)"
      closeOnOverlay={!loading}
      closeOnEsc={!loading}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
          >
            {cancelText || t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!armed || loading}
            aria-busy={loading || undefined}
            className={`cr-btn min-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 ${armed ? "cr-btn-red" : "cr-btn-red cr-btn-danger-pulse"}`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> {t("confirming")}
              </>
            ) : (
              confirmText || t("confirmDelete")
            )}
          </button>
        </>
      }
    >
      {requireWord && (
        <div className="space-y-2">
          <label htmlFor={inputId} className="block text-[12.5px] font-semibold text-fg/80">
            {t("typeToConfirm")}
          </label>
          <input
            id={inputId}
            type="text"
            value={value}
            placeholder={word}
            onChange={(e) => setValue(e.target.value)}
            aria-label={t("typeToConfirm")}
            aria-describedby={hintId}
            disabled={loading}
            autoComplete="off"
            className={cn(
              "w-full rounded-[var(--radius-btn)] border border-fg/15 bg-fg/[0.04] px-3.5 py-2.5 text-sm font-medium text-fg outline-none transition placeholder:text-fg/35",
              "focus:border-red-400 focus:ring-2 focus:ring-red-500/30"
            )}
          />
          <p id={hintId} className="text-[12px] leading-relaxed text-muted">
            {t("deleteHint")}{" "}
            <span className="font-bold uppercase tracking-wide text-fg/80">“{word}”</span>
          </p>
        </div>
      )}
    </Modal>
  );
}