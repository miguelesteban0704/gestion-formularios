import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Lock, Timer } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { Logo } from "../Logo.jsx";
import { LanguageSwitcher } from "../ui/LanguageSwitcher.jsx";
import { PasswordToggle } from "../ui/PasswordToggle.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";

const ITEM = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Escenario premium del portal oculto del super admin: «consola de bóveda».
 * Cristal profundo con aura de malla, aro luminoso con cometas, retícula de
 * puntos, marco de esquinas tipo visor y un barrido de escaneo (todo en
 * index.css, clases `sa-*`). Componente propio para no tocar AuthCard, que
 * comparten /a/:slug y /login.
 */
export function SuperAdminStage({ eyebrow, title, subtitle, role, children, footer, verifying = false }) {
  const reduce = useReducedMotion();
  const { language } = useLanguage();
  const es = language === "es";
  const imageFileName = es
    ? "super_administrador.png"
    : "super_administrador(English).png";

  return (
    <div className="sa-stage bg-app">
      <div
        className="sa-backdrop"
        style={{ "--sa-backdrop": `url("/${imageFileName}")` }}
        aria-hidden="true"
      />
      <div className="sa-vignette" aria-hidden="true" />
      <LanguageSwitcher className="absolute right-5 top-5 z-20" />

      <div className="flex h-full w-full items-center justify-end px-4 py-6 sm:px-10 md:px-16 lg:px-32 xl:px-60">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="sa-card relative z-10 w-full max-w-[420px] sm:p-8"
        >
        {/* Capas decorativas (aria-hidden): aura + escaneo y marco de visor. */}
        <span className="sa-fx" aria-hidden="true">
          <span className="sa-blob sa-blob--a" />
          <span className="sa-blob sa-blob--b" />
          <span className="sa-scan" />
        </span>
        <span className="sa-corner sa-corner--tl" aria-hidden="true" />
        <span className="sa-corner sa-corner--tr" aria-hidden="true" />
        <span className="sa-corner sa-corner--bl" aria-hidden="true" />
        <span className="sa-corner sa-corner--br" aria-hidden="true" />
        <motion.div
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}
        >
          <motion.div variants={ITEM} className="flex items-center gap-3">
            <span className="sa-orb" aria-hidden="true">
              <Logo showText={false} size={24} tone="dark" tint />
            </span>
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
                  {eyebrow}
                </p>
              )}
              <h1
                className="text-xl font-bold tracking-tight text-fg"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h1>
              {role && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="sa-role">
                    <span className="sa-role-dot" aria-hidden="true" />
                    {role}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {subtitle && (
            <motion.p variants={ITEM} className="mt-2 text-sm text-muted">
              {subtitle}
            </motion.p>
          )}

          <motion.div variants={ITEM} className="mt-4 flex flex-wrap gap-1.5">
            <span className="sa-chip">
              <span className="sa-chip-dot" aria-hidden="true" />
              {es ? "Portal verificado" : "Verified portal"}
            </span>
            <span className="sa-chip">
              <Lock className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
              {es ? "Cifrado TLS" : "TLS encryption"}
            </span>
            <span className="sa-chip">
              <Timer className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
              {es ? "Sesión con expiración" : "Session expiry"}
            </span>
          </motion.div>

          <motion.div variants={ITEM} className="sa-rule" aria-hidden="true" />

          <motion.div variants={ITEM} className="mt-5">
            {verifying ? (
              <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
                <div className="sa-skel h-[42px] w-full" />
                <div className="sa-skel h-[42px] w-full" />
                <div className="sa-skel h-[44px] w-full rounded-[20px]" />
                <p className="pt-1 text-center text-xs text-muted">
                  {es ? "Verificando acceso…" : "Verifying access…"}
                </p>
              </div>
            ) : (
              children
            )}
          </motion.div>

          {footer && (
            <motion.div variants={ITEM} className="mt-4 text-center text-sm text-muted">
              {footer}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  </div>
  );
}

/**
 * Campo propio del portal: icono, toggle de contraseña y error inline con
 * `role="alert"` + `aria-invalid`/`aria-describedby`. No reutiliza AuthField
 * para no tocar el aspecto de /a/:slug.
 */
export function SaField({ label, icon: Icon, type = "text", error, valid, className, placeholder, ...props }) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const errId = `${id}-err`;
  const isPassword = type === "password";
  const hasIcon = Boolean(Icon);
  const isValid = valid && !error;
  
  // Placeholders por defecto según el tipo
  const defaultPlaceholder = isPassword 
    ? "••••••••"
    : type === "email"
    ? "correo@ejemplo.com"
    : "Escribe aquí...";

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      <span
        className={cn(
          "sa-field relative block",
          isValid && "sa-field--valid",
          error && "sa-field--invalid"
        )}
      >
        {hasIcon && (
          <Icon
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-1.5",
              isValid ? "text-success" : "text-muted",
              error && "text-danger"
            )}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          {...props}
          placeholder={placeholder || defaultPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(
            "sa-input py-2.5",
            hasIcon && "pl-9 pr-3",
            isPassword && "pr-12",
            isValid && "focus-visible:ring-success/60 border-success/50"
          )}
        />
        <span className="sa-field-line" aria-hidden="true" />
        {isPassword && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <PasswordToggle visible={visible} onToggle={() => setVisible((v) => !v)} />
          </span>
        )}
      </span>
      {error && (
        <p id={errId} role="alert" tabIndex={-1} className="sa-err">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
