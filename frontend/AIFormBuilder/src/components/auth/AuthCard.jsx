import { useState } from "react";
import { cn } from "../../lib/utils.js";
import { Logo } from "../Logo.jsx";
import { PasswordToggle } from "../ui/PasswordToggle.jsx";
import { LanguageSwitcher } from "../ui/LanguageSwitcher.jsx";
import { Building2, UserRound } from "lucide-react";

/**
 * Tarjeta de autenticación premium con fondo de imagen por rol.
 * La tarjeta de cristal se sitúa a la derecha; el fondo y el rol quedan
 * visibles a la izquierda porque la imagen ya los incluye.
 */
export function AuthCard({ eyebrow, title, subtitle, role, entity, children, footer }) {
  // Mapeo de rol -> clase de fondo
  const roleBackgroundMap = {
    entity_admin: "auth-photo--gestor-entidad",
    form_creator: "auth-photo--gestor-formularios",
    super_admin: "auth-photo--super-admin",
  };

  // El círculo del logo usa el color de marca (--color-brand-500) para coincidir con el botón primario
  // El botón "Entrar" usa btn-primary que tiene degradado brand-300 → brand-500 → brand-700
  const logoAccentColor = "var(--color-brand-500)";

  return (
    <div className="auth-stage bg-app" style={{ "--auth-accent": logoAccentColor }} as any>
      {/* Fondo de imagen por rol */}
      <div className={cn("auth-photo", roleBackgroundMap[role])} aria-hidden="true" />
      <div className="auth-vignette" aria-hidden="true" />
      
      {/* Halo de acento sutil en el fondo */}
      <div className="auth-aura" aria-hidden="true" />
      
      <LanguageSwitcher className="absolute right-5 top-5 z-20" />

      {/* Contenedor principal: tarjeta a la derecha */}
      <div className="flex h-full w-full items-center justify-end px-6 sm:px-60 py-6">
        <div className={cn(
          "auth-card w-full max-w-[420px] sm:p-8 relative",
          "overflow-hidden" // Para el borde animado
        )}>
          {/* Borde superior animado con el color de acento del rol */}
          <div className="auth-card-glow" aria-hidden="true" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="cr-orb cr-orb-lg text-white" aria-hidden="true" style={{ "--cr-orb": logoAccentColor }}>
                <Logo showText={false} size={26} />
              </span>
              <div className="min-w-0">
                {eyebrow && (
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                    {eyebrow}
                  </p>
                )}
                <h1
                  className="text-xl font-bold tracking-tight text-fg"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h1>
                {/* Rol y entidad debajo del título - diseño premium */}
                <div className="mt-2 flex flex-col gap-1.5 px-2 py-2 rounded-xl bg-brand-500/5 dark:bg-brand-500/5 border border-brand-100/50 dark:border-brand-900/20 hover:border-brand-500/25 transition-colors">
                  {entity && entity.name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 shrink-0 text-brand-500 dark:text-brand-400" aria-hidden="true" />
                      <span className="text-xs font-medium text-ink dark:text-ink/80">
                        {entity.name}
                      </span>
                    </div>
                  )}
                  {role && (
                    <div className="flex items-center gap-2">
                      <UserRound className="h-3 w-3 shrink-0 text-brand-500 dark:text-brand-400" aria-hidden="true" />
                      <span className="text-xs font-medium text-ink dark:text-ink/80 capitalize">
                        {role === "entity_admin" ? "Gestor de Entidad" : role === "form_creator" ? "Gestor de Formularios" : "Super Admin"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}

            <div className="mt-5">{children}</div>
            {footer && <div className="mt-4 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </div>

      <p className="absolute bottom-5 z-10 text-xs text-muted">
        Acceso protegido · sesiones con expiración
      </p>
    </div>
  );
}

export function AuthField({ label, icon: Icon, type = "text", placeholder, ...props }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  
  // Placeholders por defecto según el tipo
  const defaultPlaceholder = isPassword 
    ? "••••••••"
    : type === "email"
    ? "correo@ejemplo.com"
    : "Escribe aquí...";

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
          type={isPassword && visible ? "text" : type}
          {...props}
          placeholder={placeholder || defaultPlaceholder}
          className={cn(
            "auth-input py-3", 
            Icon ? "pl-11 pr-3" : "px-4", 
            isPassword && "pr-14"
          )}
        />
        {isPassword && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <PasswordToggle visible={visible} onToggle={() => setVisible((v) => !v)} />
          </span>
        )}
      </span>
    </label>
  );
}