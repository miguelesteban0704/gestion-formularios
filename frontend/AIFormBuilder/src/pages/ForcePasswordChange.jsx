import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { AdminInput } from "../components/admin/FormFields.jsx";
import { PasswordToggle } from "../components/ui/PasswordToggle.jsx";
import { notifySaved, notifyError } from "../components/admin/AdminKit.jsx";
import { settingsApi } from "../services/index.js";
import { useAuth } from "../hooks/useAuth.js";
import { useLanguage } from "../contexts/LanguageContext.jsx";

/**
 * Cambio de contraseña FORZADO.
 *
 * Cuando un administrador crea la cuenta en modo «credenciales» (variante B,
 * `MAIL_SEND_CREDENTIALS=true`), el usuario entra con una contraseña temporal y
 * el backend marca `must_change_password`. Este componente lo intercepta en
 * `RoleRoute` (cualquier URL del panel) y no le deja seguir hasta fijar una
 * contraseña propia. Reutiliza el endpoint real `POST /settings/password`.
 */
export default function ForcePasswordChange() {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const schema = z
    .object({
      currentPassword: z.string().min(1, t("forcePasswordCurrent")),
      newPassword: z
        .string()
        .min(8, t("passwordMin"))
        .regex(/[A-Za-z]/, t("passwordMin"))
        .regex(/[0-9]/, t("passwordMin")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsDontMatch"),
    });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  const submit = async (values) => {
    setBusy(true);
    try {
      await settingsApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      // El backend ya limpió la marca; se refleja en el contexto sin recargar.
      updateUser({ mustChangePassword: false, tempPasswordExpiresAt: null });
      reset();
      notifySaved(t("passwordUpdated"));
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-page-enter mx-auto flex max-w-md flex-col px-4 py-12 lg:px-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
          <ShieldCheck className="h-7 w-7" strokeWidth={1.6} />
        </div>
        <h1 className="text-2xl font-semibold text-ink">{t("forcePasswordTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("forcePasswordBody")}</p>
        {user?.email && <p className="mt-1 text-xs text-muted">{user.email}</p>}
      </div>

      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <AdminInput
          id="force-pwd-current"
          label={t("forcePasswordCurrent")}
          icon={Lock}
          type={show ? "text" : "password"}
          autoComplete="current-password"
          control={control}
          name="currentPassword"
          error={errors.currentPassword?.message}
          trail={<PasswordToggle visible={show} onToggle={() => setShow((v) => !v)} />}
        />
        <AdminInput
          id="force-pwd-new"
          label={t("forcePasswordNew")}
          icon={Lock}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          control={control}
          name="newPassword"
          error={errors.newPassword?.message}
          trail={<PasswordToggle visible={show} onToggle={() => setShow((v) => !v)} />}
        />
        <AdminInput
          id="force-pwd-confirm"
          label={t("forcePasswordConfirm")}
          icon={Lock}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          control={control}
          name="confirmPassword"
          error={errors.confirmPassword?.message}
          trail={<PasswordToggle visible={show} onToggle={() => setShow((v) => !v)} />}
        />
        <Button type="submit" size="md" loading={busy} disabled={busy} className="w-full">
          {t("forcePasswordSubmit")}
        </Button>
      </form>
    </div>
  );
}
