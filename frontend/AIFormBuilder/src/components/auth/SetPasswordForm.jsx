import { useState } from "react";
import { KeyRound, Hash } from "lucide-react";
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
  const [busy, setBusy] = useState(false);

  const codeOk = !requireCode || code.trim().length >= 6;
  const passwordsMatch = password.length >= 8 && password === confirmPassword;
  const ready = codeOk && passwordsMatch;

  const submit = async (event) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    try {
      const data = await localAuthApi.reset((token || code).trim(), password);
      toast.success(
        es ? "Contraseña actualizada" : "Password updated",
      );
      setPassword("");
      setConfirmPassword("");
      setCode("");
      /* `localReset` devuelve la puerta vigente del usuario: se le lleva allí a
         iniciar sesión, no a la puerta que pudiera llevar el correo. */
      onSuccess?.(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {requireCode && (
        <SaField
          label={es ? "Código de recuperación" : "Recovery code"}
          icon={Hash}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
          minLength={6}
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="······"
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