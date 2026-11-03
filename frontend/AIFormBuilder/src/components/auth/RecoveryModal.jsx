import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  ArrowLeft,
  Loader2,
  KeyRound,
  Hash,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useRoleT } from "../../lib/roleI18n.js";
import { Button } from "../ui/Button.jsx";
import { SuccessModal } from "../ui/Modal.tsx";
import { localAuthApi } from "../../services/index.js";
import { cn } from "../../lib/utils.js";

/**
 * RecoveryModal — tarjeta de cristal para restablecer la contraseña por correo.
 *
 * Dos pasos dentro del mismo modal:
 * 1. Email → valida al instante al escribir/pegar y muestra el error debajo del campo.
 *    - Si se proporciona `expectedEmail`, valida que el correo escrito sea exactamente ese.
 *    - Si no coincide, muestra error debajo del campo: "El correo no coincide con la cuenta".
 * 2. Código + contraseña → valida cada campo al instante al escribir/pegar;
 *    el error aparece debajo del campo correspondiente, nunca como toast.
 *
 * Props:
 * - `open`      (bool)  si el modal está visible.
 * - `onClose`   (fn)    se dispara al cerrar (X, clic fuera o Escape).
 * - `onBack`    (fn)    vuelve a la pantalla de inicio de sesión.
 * - `expectedEmail` (string) — email obligatorio que debe escribir el usuario.
 *   Si se proporciona, el campo se validará para asegurar que sea exactamente ese correo.
 */
export default function RecoveryModal({ open, onClose, onBack, expectedEmail }) {
  const { language, t } = useLanguage();
  const es = language === "es";
  const rt = useRoleT();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(null);

  // Schema de validación con doble restricción:
  // 1. Formato de email obligatorio y válido
  // 2. Si viene expectedEmail, debe coincidir exactamente
  const emailSchema = useMemo(
    () =>
      z
        .string()
        .min(1, t("recoveryEmailRequired"))
        .refine(
          (value) => {
            // Validate email format
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          },
          t("recoveryEmailInvalid")
        )
        .refine(
          (value) => {
            // Si expectedEmail está provisto, validar que coincida exactamente.
            // Solo se evalúa si el formato ya pasó el refine anterior.
            if (!expectedEmail) return true;
            return value.trim() === expectedEmail;
          },
          t("recoveryEmailNotMatch")
        ),
    [t, expectedEmail],
  );

  const validateEmail = useCallback((valueToValidate) => {
    const result = emailSchema.safeParse(valueToValidate);
    const err = result.success ? "" : result.error.issues[0]?.message || "";
    setEmailError(err);
    return result.success;
  }, [emailSchema]);

  /* Validez del email en tiempo real (formato + coincidencia con expectedEmail).
     Se calcula en el render para desbloquear el botón en cuanto el usuario escribe
     el correo correcto, sin depender de emailTouched. */
  const isEmailValid = emailSchema.safeParse(email).success;

  const handleEmailChange = (event) => {
    const value = event.target.value;
    setEmail(value);
    validateEmail(value);
  };

  /* El error de formato solo se muestra una vez el usuario sale del campo
     (blur) o al enviar, no mientras está escribiendo el dominio. */
  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  /* `onChange` también se dispara al pegar (paste) en React, así que la
     validación es instantánea tanto al escribir como al pegar. */
  const handleEmailPaste = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setEmailTouched(true);
    if (!validateEmail(email)) return;
    setBusy(true);
    try {
      /* `localAuthApi.forgot` responde igual exista o no el correo: nunca
         revela si una dirección está registrada (seguridad). */
      await localAuthApi.forgot(email);
      setEmailSent(email);
      /* Mostramos la alerta de éxito informando que, si el correo está
         registrado, se enviaron las instrucciones. */
    } catch (err) {
      toast.error(
        err?.message || (es ? "No se pudo enviar. Inténtalo de nuevo." : "Could not send. Try again."),
      );
    } finally {
      setBusy(false);
    }
  };

  /* ── Paso 2: código + contraseñas ── */
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [confirmPasswordVisibility, setConfirmPasswordVisibility] = useState(false);

  /* `validateConfirm` se declara antes que `validatePassword` para que esta
     última pueda llamarla sin capturar una variable en inicialización. */
  // Los validadores reciben el valor candidato. Así no leen el estado
  // anterior cuando se ejecutan inmediatamente después de setState().
  const validateConfirm = useCallback((value = confirmPassword, passwordValue = password) => {
    const empty = z.string().min(1, t("recoveryConfirmRequired"));
    const result = empty.safeParse(value);
    if (!result.success) {
      setConfirmError(result.error.issues[0]?.message || "");
      return false;
    }
    if (value !== passwordValue) {
      setConfirmError(t("recoveryPasswordsDontMatch"));
      return false;
    }
    setConfirmError("");
    return true;
  }, [confirmPassword, password, t]);

  const validateCode = useCallback((value = code) => {
    const normalized = value.replace(/\D/g, "").slice(0, 6);
    const result = /^\d{6}$/.test(normalized)
      ? ""
      : t("recoveryCodeInvalid");
    setCodeError(result);
    return /^\d{6}$/.test(normalized);
  }, [code, t]);

  const validatePassword = useCallback((value = password, confirmValue = confirmPassword) => {
    const result = /^.{8,}$/.test(value) ? "" : "La contraseña debe tener mínimo 8 caracteres";
    setPasswordError(result);
    if (!result && confirmValue) validateConfirm(confirmValue, value);
    return result.success;
  }, [password, confirmPassword, t]);

  /* El código que llega por correo puede traer espacios, guiones o saltos
     de línea ("123 456", "123-456"). Se sanitiza a dígitos puros al escribir
     y al pegar, para que el pegado del correo no falle la validación. */
  const sanitizeCode = useCallback((value) => value.replace(/\D/g, ""), []);

  const handleCodeChange = (event) => {
    const value = sanitizeCode(event.target.value).slice(0, 6);
    setCode(value);
    setCodeTouched(true);
    validateCode(value);
  };

  const handleCodePaste = (event) => {
    event.preventDefault();
    const clipboardData =
      event.clipboardData || event.nativeEvent?.clipboardData || window.clipboardData;
    const pasted = clipboardData?.getData("text") || "";
    const digits = sanitizeCode(pasted).slice(0, 6);
    setCode(digits);
    setCodeTouched(true);
    validateCode(digits);
  };

  const handlePasswordChange = (event) => {
    const value = event.target.value;
    setPassword(value);
    setPasswordTouched(true);
    validatePassword(value, confirmPassword);
  };

  const handlePasswordPaste = () => {
    setPasswordTouched(true);
    validatePassword();
  };

  const handleConfirmChange = (event) => {
    const value = event.target.value;
    setConfirmPassword(value);
    setConfirmTouched(true);
    validateConfirm(value, password);
  };

  const handleConfirmPaste = () => {
    setConfirmTouched(true);
    validateConfirm();
  };

  const togglePasswordVisibility = () => setPasswordVisibility((prev) => !prev);
  const toggleConfirmPasswordVisibility = () => setConfirmPasswordVisibility((prev) => !prev);

  // El estado del botón se deriva de los valores actuales, no de mensajes
  // de error que pueden pertenecer al render anterior.
  const allValid =
    /^\d{6}$/.test(code) &&
    /^.{8,}$/.test(password) &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setCodeTouched(true);
    setPasswordTouched(true);
    setConfirmTouched(true);

    /* El código de recuperación debe ser exactamente 6 dígitos. Validamos el
       formato aquí (antes de llamar al backend) para no enviar códigos
       incompletos que el backend rechazaría con "código inválido". */
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setCodeError(t("recoveryCodeInvalid"));
      return;
    }

    const okCode = validateCode();
    const okPass = validatePassword();
    const okConfirm = validateConfirm();
    if (!(okCode && okPass && okConfirm)) return;

    setBusy(true);
    try {
      await localAuthApi.reset(code.trim(), password);
      setAwaitingCode(false);
      onClose();
    } catch (err) {
      /* El backend rechaza el código si es inválido o caducó: mostramos el
         error debajo del campo de código, no como toast. */
      setCodeError(err?.message || (es ? "Código inválido o caducado." : "Invalid or expired code."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Paso 1: email ── */}
          {!emailSent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-10"
              role="dialog"
              aria-modal="true"
              aria-labelledby="recovery-title"
              onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="relative w-full max-w-xs bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-[color-mix(in_srgb,var(--color-brand-500),transparent_35%)] rounded-[20px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.35)] ring-1 ring-white/20 dark:ring-slate-800/40"
              >
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-muted hover:text-fg hover:bg-white/70 dark:hover:bg-slate-800/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="p-4 sm:pt-4">
                  <div className="flex items-center gap-2 mb-5">
                    <Mail className="h-5 w-5 text-brand-500 dark:text-brand-400" aria-hidden="true" />
                    <h2 id="recovery-title" className="text-lg font-bold tracking-tight text-fg" style={{ fontFamily: "var(--font-display)" }}>
                      {t("recoveryTitle")}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-muted">{t("recoverySubtitle")}</p>

                  <form onSubmit={handleEmailSubmit} className="mt-5 space-y-3">
                    <Field
                      id="recovery-email"
                      label={t("recoveryEmailLabel")}
                      icon={Mail}
                      value={email}
                      onInput={handleEmailChange}
                      onBlur={handleEmailBlur}
                      onPaste={handleEmailPaste}
                      error={emailError}
                      touched={emailTouched}
                      type="email"
                      placeholder={t("recoveryEmailPlaceholder")}
                      autoComplete="email"
                      successText={es ? "Válido" : "Valid"}
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={busy}
                      disabled={busy || !isEmailValid}
                      className="w-full justify-center"
                    >
                      {busy && (
                        <Loader2 className="h-4 w-4" data-btn-spinner aria-hidden="true" />
                      )}
                      <ArrowLeft className="h-4 w-4 hidden sm:block" strokeWidth={1.5} />
                      {t("recoverySendButton")}
                    </Button>

                    <button
                      type="button"
                      onClick={onBack}
                      className="flex w-full items-center justify-center gap-1.5 mt-2 text-sm text-muted transition hover:text-fg"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t("recoveryBack")}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── Diálogo: instrucciones enviadas ── */}
          {emailSent && !awaitingCode && (
            <SuccessModal
              open
              size="lg"
              onClose={() => {
                setEmailSent(null);
                setAwaitingCode(true);
              }}
              title={rt("recoverySentTitle")}
              description={rt("recoverySentBody", emailSent)}
            />
          )}

          {/* ── Paso 2: código + contraseñas ── */}
          {awaitingCode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-10"
              role="dialog"
              aria-modal="true"
              aria-labelledby="recovery-reset-title"
              onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="relative w-full max-w-md bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-[color-mix(in_srgb,var(--color-brand-500),transparent_35%)] rounded-[20px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.35)] ring-1 ring-white/20 dark:ring-slate-800/40"
              >
                <button
                  type="button"
                  onClick={() => {
                    setAwaitingCode(false);
                    setEmailSent(null);
                  }}
                  aria-label="Volver"
                  className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-muted hover:text-fg hover:bg-white/70 dark:hover:bg-slate-800/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="h-5 w-5 text-brand-500 dark:text-brand-400" aria-hidden="true" />
                    <h2 id="recovery-reset-title" className="text-lg font-bold tracking-tight text-fg" style={{ fontFamily: "var(--font-display)" }}>
                      {t("recoveryResetTitle")}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-muted">{t("recoveryResetSubtitle")}</p>

                  <form onSubmit={handleResetSubmit} className="mt-5 space-y-3">
                    <Field
                      id="recovery-code"
                      label={t("recoveryCodeLabel")}
                      icon={Hash}
                      value={code}
                      onChange={handleCodeChange}
                      onPaste={handleCodePaste}
                      error={codeTouched ? codeError : ""}
                      touched={codeTouched}
                      type="text"
                      placeholder={t("recoveryCodePlaceholder")}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      minLength={6}
                      showSuccess={code.length === 6 && !codeError}
                      successText={es ? "Válido" : "Valid"}
                    />

                    <Field
                      id="recovery-password"
                      label={t("password")}
                      icon={KeyRound}
                      value={password}
                      onChange={handlePasswordChange}
                      onPaste={handlePasswordPaste}
                      error={passwordTouched ? passwordError : ""}
                      touched={passwordTouched}
                      type={passwordVisibility ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={8}
                      showSuccess={password.length >= 8 && !passwordError}
                      successText={es ? "Válido" : "Valid"}
                    />

                    <Field
                      id="recovery-confirm-password"
                      label={t("confirmPassword")}
                      icon={KeyRound}
                      value={confirmPassword}
                      onChange={handleConfirmChange}
                      onPaste={handleConfirmPaste}
                      error={confirmTouched ? confirmError : ""}
                      touched={confirmTouched}
                      type={confirmPasswordVisibility ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={8}
                      showSuccess={confirmPassword === password && confirmPassword.length > 0 && !confirmError}
                      successText={es ? "Válido" : "Valid"}
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={busy}
                      disabled={busy || !allValid}
                      className="w-full justify-center"
                    >
                      {busy && (
                        <Loader2 className="h-4 w-4" data-btn-spinner aria-hidden="true" />
                      )}
                      <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                      {es ? "Guardar contraseña" : "Save password"}
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setAwaitingCode(false);
                        setEmailSent(null);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 mt-2 text-sm text-muted transition hover:text-fg"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t("recoveryBack")}
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Field — campo premium de cristal: icono a la izquierda, icono de error a la
 * derecha, mensaje de error debajo con role="alert" y sacudida sutil al error.
 * Se declara fuera del componente para no reiniciar su estado en cada render.
 */
function Field({
  id,
  label,
  icon: Icon,
  value,
  onInput,
  onPaste,
  error,
  touched,
  type = "text",
  placeholder,
  inputMode,
  autoComplete,
  minLength,
  maxLength,
  showSuccess,
  successText,
}) {
  const hasError = Boolean(error);
  const showError = hasError && value.length > 0;
  return (
    <motion.div
      className="space-y-1"
      animate={showError ? { x: [0, -6, 6, -6, 6, 0] } : { x: 0 }}
      transition={showError ? { duration: 0.4 } : undefined}
    >
      <label className="block text-sm font-medium text-fg" htmlFor={id}>
        {label}
      </label>
      <span className="relative block">
        <Icon
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200",
            showError ? "text-danger" : showSuccess ? "text-success" : "text-muted group-focus-within:text-brand-500",
          )}
          strokeWidth={1.6}
          aria-hidden="true"
        />
        {showError && (
          <AlertCircle
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-danger"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onInput={onInput}
          onPaste={onPaste}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          inputMode={inputMode}
          minLength={minLength}
          maxLength={maxLength}
          aria-invalid={showError ? "true" : undefined}
          className={cn(
            "w-full pl-10 pr-8 py-3 rounded-xl border transition-colors duration-200",
            "bg-white/40 dark:bg-white/5 border-[color-mix(in_srgb,var(--color-ink),transparent_60%)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
            showError
              ? "border-danger/60 focus-visible:ring-danger/40"
              : "focus-visible:ring-brand-500/40",
          )}
        />
      </span>
      {showError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {showSuccess && !showError && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {successText}
        </p>
      )}
    </motion.div>
  );
}