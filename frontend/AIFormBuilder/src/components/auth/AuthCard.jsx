import { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils.js";
import { Logo } from "../Logo.jsx";
import { PasswordToggle } from "../ui/PasswordToggle.jsx";
import { LanguageSwitcher } from "../ui/LanguageSwitcher.jsx";
import { ThemeToggle } from "../ui/ThemeToggle.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { Building2 } from "lucide-react";
import { useRoleT } from "../../lib/roleI18n.js";
import { AuthEntityScene } from "./AuthEntityScene.jsx";
import { AuthCreatorScene } from "./AuthCreatorScene.jsx";

/**
 * Tarjeta de autenticación premium con escena animada por rol.
 * - entity_admin → AuthEntityScene ("Hub de gobierno")
 * - form_creator → AuthCreatorScene ("Lienzo de construcción")
 * - otros/sin rol → fallback con foto institucional
 * La API de props se mantiene igual para no alterar AccessLogin.
 */
export function AuthCard({ eyebrow, title, subtitle, role, entity, children, footer }) {
  const { language } = useLanguage();
  const rt = useRoleT();
  const [focused, setFocused] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const prefersReduced = useReducedMotion();

  const roleImageBaseMap = {
    entity_admin: "gestor_entidad",
    form_creator: "gestor_formularios",
    super_admin: "super_administrador",
  };
  const imageBase = roleImageBaseMap[role] || "gestor_entidad";
  const imageFileName = language === "en" ? `${imageBase}(English).png` : `${imageBase}.png`;
  const authPhotoUrl = `url("/${imageFileName}")`;
  const roleAccent = role === "entity_admin"
    ? "var(--accent-teal)"
    : role === "form_creator"
      ? "var(--accent-coral)"
      : "var(--color-brand-500)";
  const sceneTitle = role === "entity_admin"
    ? rt("entitySceneTitle")
    : role === "form_creator"
      ? rt("creatorSceneTitle")
      : rt("accessPortal");
  const sceneDescription = role === "entity_admin"
    ? rt("entitySceneDesc")
    : role === "form_creator"
      ? rt("creatorSceneDesc")
      : rt("accessPortalDesc");
  const entranceDuration = prefersReduced ? 0.12 : 0.32;

  const handleFocusCapture = (event) => {
    if (event.target?.type === "email" || event.target?.dataset?.authEmail === "true") {
      setFocused(true);
    }
    if (role === "form_creator" && ["email", "password"].includes(event.target?.type)) {
      setEditing(true);
    }
  };
  const handleBlurCapture = (event) => {
    if (event.target?.type === "email" || event.target?.dataset?.authEmail === "true") {
      setFocused(false);
    }
    if (
      role === "form_creator"
      && !["email", "password"].includes(event.relatedTarget?.type)
    ) {
      setEditing(false);
    }
  };
  const handleInputCapture = () => {
    if (role === "form_creator") setEditing(true);
  };

  useEffect(() => {
    const handleSubmitStart = () => setSubmitting(true);
    const handleSubmitEnd = () => setSubmitting(false);
    window.addEventListener('auth:submit-start', handleSubmitStart);
    window.addEventListener('auth:submit-end', handleSubmitEnd);

    return () => {
      window.removeEventListener('auth:submit-start', handleSubmitStart);
      window.removeEventListener('auth:submit-end', handleSubmitEnd);
    };
  }, []);

  return (
    <div
      className="auth-stage bg-app"
      style={{ "--auth-accent": roleAccent, "--auth-role-accent": roleAccent }}
    >
      <div className="auth-photo" style={{ "--auth-photo": authPhotoUrl }} aria-hidden="true" />
      <div className="auth-vignette" aria-hidden="true" />
      <div className="auth-aura" aria-hidden="true" />

      <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <main className="auth-layout">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: prefersReduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: entranceDuration, ease: "easeOut" }}
        >
          <div className="auth-card-glow" aria-hidden="true" />
          <div className="auth-card-content">
            <section className="auth-scene-panel" aria-labelledby="auth-scene-title">
              <div className="auth-scene-art">
                {role === "entity_admin" && (
                  <AuthEntityScene
                    entityName={entity?.name}
                    focused={focused}
                    submitting={submitting}
                    reducedMotion={Boolean(prefersReduced)}
                  />
                )}
                {role === "form_creator" && (
                  <AuthCreatorScene
                    focused={editing}
                    submitting={submitting}
                    reducedMotion={Boolean(prefersReduced)}
                  />
                )}
                {role !== "entity_admin" && role !== "form_creator" && (
                  <div className="auth-scene-fallback" aria-hidden="true">
                    <Logo showText={false} size={48} />
                  </div>
                )}
              </div>
              <div className="auth-scene-copy">
                <h2 id="auth-scene-title">{sceneTitle}</h2>
                <p>{sceneDescription}</p>
              </div>
            </section>

            <section
              className="auth-form-panel"
              onFocusCapture={handleFocusCapture}
              onBlurCapture={handleBlurCapture}
              onInputCapture={handleInputCapture}
            >
              <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <span className="cr-orb cr-orb-lg text-white" aria-hidden="true" style={{ "--cr-orb": "var(--color-brand-500)" }}>
                    <Logo showText={false} size={26} />
                  </span>
                  <div className="min-w-0">
                    {eyebrow && (
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                        {eyebrow}
                      </p>
                    )}
                    <h1
                      className="text-xl sm:text-2xl font-bold tracking-tight text-fg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {title}
                    </h1>
                  </div>
                </div>

                {entity?.name && (
                  <div className="auth-entity-name">
                    <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{entity.name}</span>
                  </div>
                )}

                {subtitle && <p className="mb-4 sm:mb-6 text-sm text-muted">{subtitle}</p>}

                <div className="mt-2">{children}</div>

                {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
              </div>
            </section>
          </div>
        </motion.div>

        <p className="auth-security-note">
          Acceso protegido · sesiones con expiración
        </p>
      </main>
    </div>
  );
}

export function AuthField({ label, icon: Icon, type = "text", placeholder, ref, ...props }) {
  const rt = useRoleT();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputRef = useRef(null);
  
  // Usar ref externo si se pasa, sino el interno
  const forwardedRef = ref || inputRef;

  // Placeholders por defecto según el tipo
  const defaultPlaceholder = isPassword 
    ? "••••••••"
    : type === "email"
    ? "correo@ejemplo.com"
    : "Escribe aquí...";

  const handleFocus = (e) => {
    props.onFocus?.(e);
  };
  const handleBlur = (e) => {
    props.onBlur?.(e);
  };

  return (
    <label className="block text-sm font-medium text-fg">
      {label}
      <span className="relative mt-1.5 block">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted transition-colors group-has-focus-visible:text-brand-500"
            strokeWidth={1.6}
            aria-hidden="true"
          />
        )}
        <input
          ref={forwardedRef}
          type={isPassword && visible ? "text" : type}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder || defaultPlaceholder}
          className={cn(
            "auth-input py-3", 
            Icon ? "pl-11 pr-3" : "px-4", 
            isPassword && "pr-14"
          )}
        />
        {isPassword && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <PasswordToggle
              visible={visible}
              onToggle={() => setVisible((value) => !value)}
              showLabel={rt("showPassword")}
              hideLabel={rt("hidePassword")}
            />
          </span>
        )}
      </span>
    </label>
  );
}