import { useId, useRef, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, AlertTriangle, ShieldAlert, Check, Trash2, Info, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { SuccessIcon } from "./animated-state-icons";
import { shouldMorph, type Tone } from "./state-morph";
import { useFocusTrap, useBodyScrollLock, useEscapeKey } from "../../hooks/useOverlay";
import { alertTone, dialogSize, type DialogSize } from "../../feedback/variants";
import "./crystal.css";

// Capas: el shell lee el token central, nunca un numero suelto.
export const MODAL_Z = "var(--z-modal, 60)";
export const BACKDROP_Z = "var(--z-modal-backdrop, 50)";

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  variant?: "default" | "danger" | "form";
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  // Legado: aceptado y NO usado (el focus trap entra al primer foco, no a un selector).
  initialFocus?: string;
  ariaBusy?: boolean;
  orb?: ReactNode; // <span className="cr-orb …"> opcional → cabecera centrada con orbe elevado
  // Tinte del CIURO del diálogo (fondo, filo, botón de cierre y pie). Por
  // omisión, la marca. Quien quiera el diálogo de otro tono —peligro, éxito,
  // aviso— lo pide aquí y dice por qué; el orbe se tiñe por su cuenta.
  aura?: string;
  // Padding superior del header del diálogo. Útil para alejar el contenido
  // del borde superior sin afectar a otros modales.
  headerPt?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "default", // default | danger | form
  closeOnOverlay = true,
  closeOnEsc = true,
  ariaBusy,
  orb, // <span className="cr-orb …"> opcional → cabecera centrada con orbe elevado
  aura,
  headerPt,
}: ModalProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const reduce = useReducedMotion();
  const isDanger = variant === "danger";
  const sizeClass = dialogSize({ size: size ?? "md" });
  /* El aura antes salía del orbe (`orb.props.style["--cr-orb"]`). Ligaba dos
     cosas que no van juntas —el color de un icono decorativo con el del diálogo
     entero— y por eso un orbe con un hex fijo congelaba el modal: Compartir
     (#2f6bff) y el generador de IA (#7c3aed) se quedaban azul y violeta con
     cualquier acento que hubiera elegido el usuario. Además era un detalle
     interno de React: un `style` propagado o un hijo envolviendo al orbe lo
     dejaban mudo sin avisar.

     Ahora el aura se pide con `aura` y el orbe se tiñe solo con
     `--glass-chroma`. El valor por omisión es el TOKEN, no el hex del acento
     por defecto: escrito a fuego, un modal normal se quedaba teal para
     siempre mientras el resto de la página sí cambiaba de color. Peligro
     sigue siendo semántico. */
  const modalAura =
    aura || (isDanger ? "var(--color-danger)" : "var(--color-brand-500)");

  useFocusTrap(ref, open, { autoFocus: true });
  useBodyScrollLock(open);
  useEscapeKey(open, () => onClose?.(), closeOnEsc);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: BACKDROP_Z }}>
          {/* overlay — blurred veil, not flat 50% black */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(var(--overlay-blur))" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
            style={{ background: "var(--overlay-bg)" }}
            onClick={() => closeOnOverlay && onClose?.()}
            aria-hidden="true"
          />

          {/* dialog — scale + fade, never generic slide */}
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            aria-busy={ariaBusy || undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16, ease: "easeOut" } }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "modal-shell relative flex w-full max-h-[min(88vh,720px)] flex-col overflow-hidden focus:outline-none",
              sizeClass
            )}
            style={{ borderRadius: "var(--radius-modal)", "--modal-aura": modalAura, zIndex: MODAL_Z } as CSSProperties}
          >
            {/* Filo de luz de acento — la firma de Nocturne */}
            <div className="cr-hairline" style={{ "--cr-accent": "var(--modal-aura)" } as CSSProperties} aria-hidden="true" />

            {/* header */}
            {(title || isDanger || onClose || orb) && (
              <div className={cn("relative px-6", headerPt ?? "pt-6", isDanger && "pb-3")}>
                {orb ? (
                  <div className="flex flex-col items-center text-center">
                    <span className="mb-4">{orb}</span>
                    <h2 id={titleId} className="text-[18px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "var(--font-display)" }}>
                      {title}
                    </h2>
                    {description && (
                      <p id={descId} className="mt-2 max-w-sm text-[13.5px] font-[450] leading-[1.5] text-slate-500 dark:text-slate-400">
                        {description}
                      </p>
                    )}
                    {onClose && (
                      <button
                        onClick={onClose}
                        aria-label={t("close")}
                        className="cr-close absolute right-6 top-6"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    {isDanger && (
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-btn)] border border-rose-300/70 bg-rose-50 text-rose-600 shadow-[0_10px_26px_-12px_rgba(225,29,72,0.6)] backdrop-blur-md dark:border-rose-400/25 dark:bg-rose-500/12 dark:text-rose-300">
                        <ShieldAlert className="h-5 w-5" strokeWidth={2} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      {title && (
                        <h2 id={titleId} className={cn("text-[18px] font-bold leading-tight tracking-tight", isDanger ? "text-red-900 dark:text-red-100" : "text-slate-900 dark:text-white")} style={{ fontFamily: "var(--font-display)" }}>
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p id={descId} className={cn("mt-1.5 text-[13.5px] font-[450] leading-[1.5]", isDanger ? "text-red-700/80 dark:text-red-200/70" : "text-slate-500 dark:text-slate-400")}>
                          {description}
                        </p>
                      )}
                    </div>
                    {onClose && (
                      <button
                        onClick={onClose}
                        aria-label={t("close")}
                        className="cr-close shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-4 scrollbar-thin">
              {children}
            </div>

            {/* footer — only when provided, keeps hierarchy */}
            {footer && (
              <div className={cn(
                "modal-foot flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6 sm:py-4",
                isDanger && "modal-foot--danger",
                orb ? "justify-center" : "justify-end"
              )}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ——— Convenience wrappers with intentional hierarchy ———

export interface ConfirmModalProps {
  open: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  danger?: boolean;
  loading?: boolean;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
}

// Confirmación estilo Aurora Glass: orbe elevado en cabecera centrada y botones de cristal.
// `loading` bloquea el reenvío (nada de requests duplicados) y muestra el spinner.
export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmText, cancelText, danger = false, loading = false, icon: CustomIcon }: ConfirmModalProps) {
  const { t } = useLanguage();
  const Icon = CustomIcon || (danger ? Trash2 : Check);
  /* El diálogo entero dice lo mismo que el botón: rojo lo que borra, verde lo
     que confirma. Es semántico, así que el aura se pide en vez de heredarse. */
  const orbColor = danger ? "var(--color-danger)" : "var(--color-success)";
  const orb = (
    <span className="cr-orb cr-orb-lg text-white" style={{ "--cr-orb": orbColor } as CSSProperties} aria-hidden="true">
      <Icon className="h-7 w-7 drop-shadow-sm" strokeWidth={2.2} />
    </span>
  );
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      description={description}
      size="sm"
      variant={danger ? "danger" : "default"}
      orb={orb}
      aura={orbColor}
      closeOnOverlay={!loading}
      closeOnEsc={!loading}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={loading} className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2">
            {cancelText || t("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading || undefined}
            className={`cr-btn min-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 ${danger ? "cr-btn-red" : "cr-btn-green"}`}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> {t("loading")}</>
              : <>{danger && <AlertTriangle className="h-4 w-4" />}{confirmText || t("confirm")}</>}
          </button>
        </>
      }
    >
      <span className="sr-only">{description}</span>
    </Modal>
  );
}

// Destructive is an explicit alias — communicates risk with controlled red, not screaming
export function DestructiveModal(props: ConfirmModalProps) {
  return <ConfirmModal {...props} danger />;
}

export type FormModalProps = Omit<ModalProps, "variant">;

// Form modal — same shell but expects children to be a form; footer is sticky and neutral
export function FormModal({ open, onClose, title, description, children, footer, size = "lg", ...rest }: FormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size={size} variant="form" footer={footer} {...rest}>
      {children}
    </Modal>
  );
}

/* ————————————————————————————————————————————————————————————————
   Modales de estado — un mismo lenguaje para informar de un resultado
   (info · success · error · warning) y para una operación en curso.
   Patrón de uso: se muestran cuando la decisión bloquea; el feedback
   rutinario debe ser un toast, no un modal.
   ———————————————————————————————————————————————————————————————— */

// `icon` solo existe en los tonos que no se transforman. El par
// cargando→éxito se dibuja con `SuccessIcon` morphando, así que guardar
// aquí un icono de lucide para él sería un resto que nunca se pintaría.
// El tinte no es un hex: la clase `alertTone` lo inyecta (cr-tone-*-solid).
const TONE: Record<Tone, { icon?: LucideIcon }> = {
  info: { icon: Info },
  success: {},
  error: { icon: ShieldAlert },
  warning: { icon: AlertTriangle },
  loading: {},
};

const TONE_AURA: Record<Tone, string> = {
  info: "var(--color-info)",
  success: "var(--color-success)",
  error: "var(--color-danger)",
  warning: "var(--color-warning)",
  loading: "var(--color-info)",
};

export interface StatusModalProps {
  open: boolean;
  onClose?: () => void;
  tone?: Tone;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actionText?: ReactNode;
  onAction?: () => void;
  size?: DialogSize;
  // Padding superior del header, para alejar el contenido del borde superior
  // del modal sin afectar a los demás StatusModal.
  headerPt?: string;
}

export function StatusModal({
  open,
  onClose,
  tone = "info",
  title,
  description,
  children,
  actionText,
  onAction,
  size = "sm",
  headerPt,
}: StatusModalProps) {
  const { t } = useLanguage();
  const meta = TONE[tone] || TONE.info;
  const aura = TONE_AURA[tone] || TONE_AURA.info;
  const Icon = meta.icon || Info;
  const blocking = tone === "loading";
  // El par cargando→éxito se transforma en vez de cambiar de icono, igual
  // que en el toast: `shouldMorph` es la misma decisión compartida, y si el
  // toast y el modal tuvieran cada uno la suya acabarían desincronizados.
  // El resto de tonos no tienen a qué morphar, así que siguen con lucide.
  const morph = shouldMorph(tone);
  const toneClass = alertTone({ tone });
  const orb = (
    <span className={`cr-orb cr-orb-lg text-white ${toneClass}`} aria-hidden="true">
      {morph ? (
        <SuccessIcon
          active={tone === "success"}
          size={28}
          strokeWidth={2.6}
          color="#ffffff"
          className="drop-shadow-sm"
        />
      ) : (
        <Icon
          className="h-7 w-7 drop-shadow-sm"
          strokeWidth={2.2}
        />
      )}
    </span>
  );
  return (
    <Modal
      open={open}
      onClose={blocking ? undefined : onClose}
      title={title}
      description={description}
      size={size}
      orb={orb}
      headerPt={headerPt}
      /* El tono ES el significado del diálogo (info · éxito · error · aviso), así
         que el aura se declara. El resto de modales no lo pasan y siguen a la
         marca. */
      aura={aura}
      variant={tone === "error" ? "danger" : "default"}
      closeOnOverlay={!blocking}
      closeOnEsc={!blocking}
      ariaBusy={blocking || undefined}
      footer={
        blocking ? null : (
          <>
            {onClose && (
              <button type="button" onClick={onClose} className="cr-btn cr-btn-neutral min-w-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2">
                {t("close")}
              </button>
            )}
            {onAction && (
              <button
                type="button"
                onClick={onAction}
                className="cr-btn cr-btn-blue min-w-[108px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
              >
                {actionText || t("confirm")}
              </button>
            )}
          </>
        )
      }
    >
      {children}
    </Modal>
  );
}

export const InfoModal = (p: StatusModalProps) => <StatusModal {...p} tone="info" />;
export const SuccessModal = (p: StatusModalProps) => <StatusModal {...p} tone="success" />;
export const ErrorModal = (p: StatusModalProps) => <StatusModal {...p} tone="error" />;
export const WarningModal = (p: StatusModalProps) => <StatusModal {...p} tone="warning" />;
export const LoadingModal = (p: StatusModalProps) => <StatusModal {...p} tone="loading" />;

export const ConfirmDialog = ConfirmModal; // alias del spec (API idéntica)