import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AtSign,
  Save,
  Check,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useRoleT } from "../../lib/roleI18n.js";
import { useSettings, useUpdateProfile } from "../../hooks/useSettings.js";
import { Card } from "../ui/Card.jsx";
import { Input } from "../ui/Input.jsx";
import { Button } from "../ui/Button.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { cn } from "../../lib/utils.js";

/**
 * Ícono de estado de un campo (vacío / válido / error).
 * Solo se pinta cuando el campo tiene valor, así no hay ruido visual antes
 * de que el usuario empiece a escribir.
 */
function FieldStatus({ status }) {
  const variants = {
    idle: "text-muted/40",
    valid:
      "text-emerald-500 bg-emerald-50 border-emerald-200/40 dark:bg-emerald-900/10 dark:border-emerald-900/40",
    error:
      "text-red-500 bg-red-50 border-red-200/40 dark:bg-red-900/10 dark:border-red-900/40",
  };
  const icons = {
    idle: null,
    valid: <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />,
    error: <AlertCircle className="h-4 w-4" strokeWidth={2.5} />,
  };
  if (status === "idle") return null;
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-200",
        variants[status],
      )}
    >
      {icons[status]}
    </span>
  );
}

/**
 * Etiqueta + descripción de un bloque editable.
 */
function FieldHeader({ icon: Icon, title, desc }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300 shadow-sm">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-fg tracking-tight">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-muted leading-relaxed">{desc}</p>}
      </div>
    </div>
  );
}

export default function UserProfileSettings() {
  const { t } = useLanguage();
  const rt = useRoleT();
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState({ field: null, message: "" });

  const { data, isLoading } = useSettings();

  // ─── Schema de validación premium (mensajes en el idioma activo) ──────────
  const schema = z.object({
    fullName: z
      .string()
      .min(2, t("profileNameMin"))
      .max(100, t("profileNameMax")),
    email: z
      .string()
      .min(1, t("profileEmailRequired"))
      .email(t("profileEmailInvalid")),
    username: z
      .string()
      .min(3, t("usernameInvalid"))
      .max(32, t("usernameInvalid"))
      .regex(/^[a-z0-9_.-]+$/, t("usernameInvalid")),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    values: data
      ? {
          fullName: data.name ?? "",
          email: data.email ?? "",
          username: data.username ?? "",
        }
      : undefined,
  });

  const fullName = watch("fullName") ?? "";
  const email = watch("email") ?? "";
  const username = watch("username") ?? "";

  // Estados visuales de los campos (solo cuando hay valor escrito)
  const usernameServer = serverError.field === "username";
  const emailServer = serverError.field === "email";
  const nameError = !!errors.fullName;
  const emailError = !!errors.email || emailServer;
  const usernameError = !!errors.username || usernameServer;
  const nameStatus = nameError
    ? "error"
    : fullName.trim().length >= 2
      ? "valid"
      : "idle";
  const emailStatus = emailError
    ? "error"
    : email.trim().length > 0
      ? "valid"
      : "idle";
  const usernameStatus = usernameError
    ? "error"
    : username.trim().length >= 3 && /^[a-z0-9_.-]+$/.test(username.trim())
      ? "valid"
      : "idle";
  const usernameErrorMessage = usernameServer
    ? serverError.message
    : errors.username?.message;
  const emailErrorMessage = emailServer ? serverError.message : errors.email?.message;

  // Insignia de rol en el hero
  const roleLabel =
    rt("roleSuper") ||
    rt("roleEntity") ||
    rt("roleCreator") ||
    rt("roleGuest") ||
    user?.role ||
    t("roleAccount");
  const roleByKey = {
    super_admin: rt("roleSuper"),
    entity_admin: rt("roleEntity"),
    form_creator: rt("roleCreator"),
    guest: rt("roleGuest"),
  };
  const roleText = roleByKey[user?.role] || roleLabel;

  const onSubmit = async (values) => {
    setServerError({ field: null, message: "" });
    try {
      await update.mutateAsync({
        name: values.fullName,
        email: values.email,
        username: values.username,
      });
      reset(values);
      setSaved(true);
      setTimeout(() => setSaved(false), 1700);
    } catch (err) {
      // El hook `tracked` de useUpdateProfile ya emite el toast de error.
      const data = err?.response?.data;
      if (data?.details?.field === "username" || data?.details?.field === "email") {
        setServerError({
          field: data.details.field,
          message: t(
            data.details.field === "username" ? "usernameTaken" : "emailTaken",
          ),
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-default bg-surface dark:border-slate-800 dark:bg-slate-900 p-8"
        >
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-surface-2 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-surface-2 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-surface-2 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-default bg-surface dark:border-slate-800 dark:bg-slate-900 p-6"
            >
              <div className="h-8 w-24 bg-surface-2 dark:bg-slate-800 rounded animate-pulse" />
              <div className="mt-4 h-10 w-full bg-surface-2 dark:bg-slate-800 rounded animate-pulse" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0" noValidate>
      {/* ── Hero de perfil ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-brand-100/60 bg-gradient-to-b from-brand-50/40 via-surface to-surface/40 dark:border-brand-900/20 dark:from-brand-900/20 dark:via-slate-900/40 dark:to-slate-900/20 shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-8 md:p-10"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="relative shrink-0">
            <Avatar
              name={data?.name ?? ""}
              avatarUrl={data?.avatarUrl ?? null}
              size="lg"
              className="h-24 w-24 text-4xl ring-7 ring-white dark:ring-slate-900 shadow-xl"
            />
            <span className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-2xl ring-5 ring-surface">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-fg tracking-tight">
                {data?.name ?? t("fullName")}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm transition-colors",
                  user?.role === "super_admin"
                    ? "border-brand-200/70 bg-brand-50 text-brand-700 dark:border-brand-800/50 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-default bg-surface-2 text-muted dark:border-slate-800 dark:bg-slate-800",
                )}
              >
                {roleText}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <Mail className="h-4 w-4 text-muted/70" />
              <span className="truncate">{data?.email ?? t("email")}</span>
            </p>
          </div>

          <div className="shrink-0 self-start lg:self-center">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm",
                saved
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-300"
                  : "border-default bg-surface-2 text-muted dark:border-slate-800 dark:bg-slate-800",
              )}
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" /> {t("changesSaved")}
                </>
              ) : (
                t("profileUpToDate")
              )}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Tarjetas de edición ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {/* Nombre completo */}
        <motion.div
          key="name"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="hover:border-brand-300 transition-colors"
        >
          <Card className="p-6">
            <FieldHeader
              icon={User}
              title={t("fullName")}
              desc={t("profileNameDesc")}
            />
            <div className="relative">
              <Input
                {...register("fullName")}
                placeholder={t("nameExample")}
                invalid={nameError}
                className="pr-12"
              />
              <FieldStatus status={nameStatus} />
            </div>
            {nameError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-500">
                <AlertCircle className="h-3.5 w-3.5" /> {errors.fullName?.message}
              </p>
            )}
          </Card>
        </motion.div>

        {/* Correo electrónico */}
        <motion.div
          key="email"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="hover:border-brand-300 transition-colors"
        >
          <Card className="p-6">
            <FieldHeader
              icon={Mail}
              title={t("email")}
              desc={t("profileEmailDesc")}
            />
            <div className="relative">
              <Input
                type="email"
                {...register("email")}
                placeholder={t("emailExample")}
                invalid={emailError}
                className="pr-12"
                autoCapitalize="none"
                autoComplete="email"
              />
              <FieldStatus status={emailStatus} />
            </div>
            {emailError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-500">
                <AlertCircle className="h-3.5 w-3.5" /> {emailErrorMessage}
              </p>
            )}
          </Card>
        </motion.div>

        {/* Nombre de usuario */}
        <motion.div
          key="username"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="hover:border-brand-300 transition-colors"
        >
          <Card className="p-6">
            <FieldHeader
              icon={AtSign}
              title={t("username")}
              desc={t("usernameHint")}
            />
            <div className="relative">
              <Input
                {...register("username")}
                placeholder={t("usernameExample")}
                invalid={usernameError}
                className="pr-12"
                autoCapitalize="none"
                autoComplete="username"
              />
              <FieldStatus status={usernameStatus} />
            </div>
            {usernameError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-500">
                <AlertCircle className="h-3.5 w-3.5" /> {usernameErrorMessage}
              </p>
            )}
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Barra de acciones ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="mt-8 flex items-center justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="text-sm text-muted">
          {saved ? t("profileChangesSaved") : isDirty ? t("unsavedChanges") : t("profileUpToDate")}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!isDirty || isSubmitting}
            className="text-muted hover:text-fg"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("discardChanges")}
          </Button>
          <Button
            size="md"
            loading={isSubmitting}
            disabled={!isDirty || isSubmitting}
            className="w-auto"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-2" /> {t("changesSaved")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> {t("saveChanges")}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </form>
  );
}
