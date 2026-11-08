import { useState, useCallback } from "react";
import { KeyRound, Hash, Check } from "lucide-react";
import { toast } from "sonner";
import { localAuthApi } from "../../services/index.js";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useRoleT } from "../../lib/roleI18n.js";
import { Button } from "../ui/Button.jsx";
import { SaField } from "./SuperAdminStage.jsx";

const BTN_PREMIUM =
  "w-full justify-center shadow-glow transform-gpu transition-transform hover:scale-[1.02] active:scale-[0.98]";

/**
 * Formulario de «elige tu contraseña nueva», compartido por las tres pantallas
 * que lo necesitan: la activación del correo (`/activar`), el flujo de
 * recuperación del portal (`/formularios-con-ia-loginadmin`) y el que se abre
 * desde una puerta (`/a/:slug`).
 *
 * Antes cada pantalla tenía su propia copia del `submit` y del mensaje de éxito;
 * esta es la única. No decide a dónde va el usuario al terminar: eso lo cuenta
 * quien lo usa, con `onSuccess(data)`.
 *
 * - `token`: si viene (el correo o la URL ya lo traen), no se pide el código.
 * - `requireCode`: flujo «¿Olvidaste tu contraseña?», donde el usuario sí tiene
 *   que teclear el código que recibió.
 * - `initialCode`: código a rellenar, para el atajo de desarrollo.
 */
export default function SetPasswordForm({
  token,
  requireCode = false,
  initialCode = "",
  onSuccess,
  fallbackLabel,
  fallbackAction,
}) {
  const rt = useRoleT();
  const { language, t } = useLanguage();
  const es = language === "es";

  const [code, setCode] = useState(initialCode || token || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeError, setCodeError] = useState("");
  const [busy, setBusy] = useState(false);

  const codeOk = !requireCode || /^\d{6}$/.test(code.trim());
  const passwordsMatch = password.length >= 8 && password === confirmPassword;
  const ready = codeOk && passwordsMatch;

  /* Sanitiza el código a dígitos puros (el correo puede traer "123 456" o
     "123-456") y limita a 6. */
  const sanitizeCode = useCallback((value) => value.replace(/\D/g, ""), []);

  const validateCode = useCallback((value = code) => {
    const normalized = sanitizeCode(value).slice(0, 6);
    const isValid = /^\d{6}$/.test(normalized);
    setCodeError(isValid ? "" : t("recoveryCodeDigits"));
    return isValid;
  }, [code, t, sanitizeCode]);

  const handleCodeChange = (event) => {
    const value = sanitizeCode(event.target.value).slice(0, 6);
    setCode(value);
    validateCode(value);
  };

  const handleCodePaste = (event) => {
    event.preventDefault();
    const clipboardData =
      event.clipboardData || event.nativeEvent?.clipboardData || window.clipboardData;
    const pasted = clipboardData?.getData("text") || "";
    const digits = sanitizeCode(pasted).slice(0, 6);
    setCode(digits);
    validateCode(digits);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!ready) {
      if (requireCode && !/^\d{6}$/.test(code.trim())) {
        setCodeError(t("recoveryCodeDigits"));
      }
      return;
    }
    setBusy(true);
    try {
      const data = await localAuthApi.reset((token || code).trim(), password);
      toast.success(
        es ? "Contraseña actualizada" : "Password updated",
      );
      setPassword("");
      setConfirmPassword("");
      setCode("");
      setCodeError("");
      /* `localReset` devuelve la puerta vigente del usuario: se le lleva allí a
         iniciar sesión, no a la puerta que pudiera llevar el correo. */
      onSuccess?.(data);
    } catch (err) {
      /* El backend rechaza el código si es inválido o caducó: mostramos el
         error debajo del campo de código, no como toast. */
      setCodeError(
        err?.message ||
          (es ? "Código inválido o caducado." : "Invalid or expired code."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {requireCode && (
        <SaField
          label={es ? "Código de recuperación" : "Recovery code"}
          icon={codeOk && code.trim().length === 6 ? Check : Hash}
          valid={codeOk && code.trim().length === 6 && !codeError}
          value={code}
          onChange={handleCodeChange}
          onPaste={handleCodePaste}
          required
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t("recoveryCodePlaceholder")}
          error={codeError}
        />
      )}
      <SaField
        label={rt("password")}
        icon={KeyRound}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="••••••••"
      />
      <SaField
        label={t("confirmPassword")}
        icon={KeyRound}
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="••••••••"
        error={password.length > 0 && !passwordsMatch ? t("passwordsDontMatch") : undefined}
      />
      <Button type="submit" loading={busy} disabled={!ready} className={BTN_PREMIUM}>
        <KeyRound className="h-4 w-4" strokeWidth={1.5} />
        {es ? "Guardar contraseña" : "Save password"}
      </Button>
      {fallbackLabel && (
        <button type="button" onClick={fallbackAction} className="flex w-full items-center justify-center gap-1.5 text-sm text-muted transition hover:text-fg">
          {fallbackLabel}
        </button>
      )}
    </form>
  );
}
