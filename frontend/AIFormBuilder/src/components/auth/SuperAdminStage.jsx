import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Fingerprint, Lock, ShieldCheck, Timer } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { Logo } from "../Logo.jsx";
import { LanguageSwitcher } from "../ui/LanguageSwitcher.jsx";
import { ThemeToggle } from "../ui/ThemeToggle.jsx";
import { PasswordToggle } from "../ui/PasswordToggle.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { ROLE_I18N_KEY } from "../../lib/roles.js";

const ITEM = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Escenario premium del portal oculto del super admin: «pase de acceso».
 *
 * Un solo objeto de cristal con dos paneles (estilos en index.css, clases `sa-*`):
 *  - `sa-keycard`: panel oscuro con núcleo orbital animado (logo + anillos +
 *    radar), registro de seguridad y la credencial del rol.
 *  - `sa-pane`: panel de cristal con título, subtítulo y el formulario
 *    (`children`), el esqueleto de verificación y el pie.
 * Sobre el escenario: aurora, retícula y viñeta; el conjunto tiene un aro
 * luminoso y un foco de luz que sigue al cursor (`--sa-mx`/`--sa-my`).
 *
 * Componente propio para no tocar AuthCard, que comparten /a/:slug y /login.
 * Contrato de props intacto: eyebrow, title, subtitle, role, children, footer,
 * verifying.
 */
export function SuperAdminStage({ eyebrow, title, subtitle, role, children, footer, verifying = false }) {
  const reduce = useReducedMotion();
  const { language, t } = useLanguage();
  const shellRef = useRef(null);
  const imageFileName = language === "es"
    ? "super_administrador.png"
    : "super_administrador(English).png";

  const roleKey = ROLE_I18N_KEY[role] || "roleAccount";
  const roleLabel = t(roleKey);

  const checks = [
    { key: "verified", Icon: ShieldCheck, label: t("verifiedPortal") || (language === "es" ? "Portal verificado" : "Verified portal") },
    { key: "tls", Icon: Lock, label: t("tlsEncryption") || (language === "es" ? "Cifrado TLS" : "TLS encryption") },
    { key: "expiry", Icon: Timer, label: t("sessionExpiry") || (language === "es" ? "Sesión con expiración" : "Session expiry") },
  ];

  // El foco de luz se mueve escribiendo variables CSS directamente en el nodo:
  // no provoca renders de React. Con movimiento reducido no se engancha.
  const handlePointerMove = (event) => {
    if (reduce) return;
    const el = shellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--sa-mx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--sa-my", `${event.clientY - rect.top}px`);
  };

  return (
    <div className="sa-stage bg-app">
      <div
        className="sa-backdrop"
        style={{ "--sa-backdrop": `url("/${imageFileName}")` }}
        aria-hidden="true"
      />
      <div className="sa-aurora" aria-hidden="true">
        <span className="sa-blob sa-blob--a" />
        <span className="sa-blob sa-blob--b" />
        <span className="sa-blob sa-blob--c" />
      </div>
      <div className="sa-grid" aria-hidden="true" />
      <div className="sa-vignette" aria-hidden="true" />
      <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 flex w-full justify-center">
        <motion.div
          ref={shellRef}
          onPointerMove={handlePointerMove}
          initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="sa-shell"
        >
          {/* ── Panel oscuro: credencial ── */}
          <aside className="sa-keycard">
            <div className="sa-core" aria-hidden="true">
              <span className="sa-ring sa-ring--1" />
              <span className="sa-ring sa-ring--2" />
              <span className="sa-ring sa-ring--3" />
              <span className="sa-ring sa-ring--4" />
              <span className="sa-orb">
                <Logo showText={false} size={28} tone="dark" tint />
              </span>
            </div>

            <ul className="sa-ledger sa-ledger--wide" aria-label={language === "es" ? "Garantías de seguridad" : "Security guarantees"}>
              {checks.map(({ key, Icon, label }, index) => (
                <li key={key} style={{ "--i": index }}>
                  <span className="sa-ledger-icon" aria-hidden="true">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span>{label}</span>
                  <Check className="sa-ledger-tick" strokeWidth={2.5} aria-hidden="true" />
                </li>
              ))}
            </ul>

            {role && (
              <div className="sa-id">
                <div className="min-w-0">
                  <p className="sa-id-label">{t("roleLabel")}</p>
                  <p className="sa-id-value">{roleLabel}</p>
                </div>
                <Fingerprint className="sa-id-icon" strokeWidth={1.5} aria-hidden="true" />
              </div>
            )}
          </aside>

          {/* ── Panel de cristal: título y formulario ── */}
          <motion.div
            className="sa-pane"
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } } }}
          >
            <motion.div variants={ITEM}>
              {eyebrow && <p className="sa-eyebrow">{eyebrow}</p>}
              <h1 className="sa-title" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h1>
              {subtitle && <p className="sa-sub">{subtitle}</p>}
            </motion.div>

            {/* Mismas garantías, en compacto, cuando el panel oscuro se reduce. */}
            <motion.div variants={ITEM} className="sa-chips">
              {checks.map(({ key, Icon, label }) => (
                <span key={key} className="sa-chip">
                  <Icon className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </motion.div>

            <motion.div variants={ITEM} className="sa-form">
              {verifying ? (
                <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
                  <div className="sa-skel h-[46px] w-full" />
                  <div className="sa-skel h-[46px] w-full" />
                  <div className="sa-skel h-[44px] w-full rounded-[20px]" />
                  <p className="pt-1 text-center text-xs text-muted">
                    {language === "es" ? "Verificando acceso…" : "Verifying access…"}
                  </p>
                </div>
              ) : (
                children
              )}
            </motion.div>

            {footer && (
              <motion.div variants={ITEM} className="sa-footer">
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
 * Campo propio del portal: cápsula de icono que se enciende con el foco,
 * toggle de contraseña y error inline con `role="alert"` +
 * `aria-invalid`/`aria-describedby`. No reutiliza AuthField para no tocar el
 * aspecto de /a/:slug.
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
      <label htmlFor={id} className="sa-label">
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
          <span className="sa-field-icon" aria-hidden="true">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          {...props}
          placeholder={placeholder || defaultPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(
            "sa-input py-3",
            hasIcon ? "pl-12 pr-3" : "px-3.5",
            isPassword && "pr-12"
          )}
        />
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
