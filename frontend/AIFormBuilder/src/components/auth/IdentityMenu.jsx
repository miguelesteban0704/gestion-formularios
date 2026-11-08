import { useCallback, useState } from "react";
import { UserRound, Building2, Link2, Settings, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils.js";
import { Dropdown, MenuItem, MenuDivider } from "../ui/Dropdown.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { RoleBadge, roleVisual } from "../auth/RoleBadge.jsx";
import { useLanguage } from "../../contexts/LanguageContext.jsx";
import { useRoleT } from "../../lib/roleI18n.js";
import { useAuth } from "../../hooks/useAuth.js";
import { isGuest, isSuper, isEntityAdmin, isCreator } from "../../lib/roles.js";
import { accessDoorFor } from "../../lib/accessDoor.js";
import { settingsPath } from "../../lib/routes.js";

/**
 * Avatar con el anillo del rol. Es la identidad "colapsada": cuando la
 * insignia (`RoleBadge`) no cabe —cabecera estrecha, móvil— el color del
 * anillo sigue diciendo de quién es la sesión.
 */
export function RoleAvatar({ user, size = "sm", withStatus = false }) {
  const visual = roleVisual(user?.role, isGuest(user));
  return (
    <span className="identity-avatar">
      <span className="role-avatar" style={{ "--rb-accent": visual.accent }}>
        <Avatar name={user?.name || user?.email} avatarUrl={user?.avatarUrl} size={size} />
      </span>
      {withStatus && <span className="identity-status" aria-hidden="true" />}
    </span>
  );
}

/**
 * Nombre con el que se identifica la sesión: el **nombre de la cuenta**
 * (`user.name`, p. ej. «Miguel») para todos los roles; cae al correo y, en
 * último término, al nombre de la consola.
 */
function displayNameFor(user, t) {
  return user?.name || user?.email || t("appName");
}

/**
 * Slug de la puerta `/a/<slug>` del rol gestionado, si se recuerda en este
 * navegador. Se muestra como dato SECUNDARIO y discreto: es la forma natural de
 * identificar al entity_admin / form_creator sin exponer su entidad entera.
 */
function doorSlugFor(user) {
  if (!user || (!isEntityAdmin(user) && !isCreator(user))) return null;
  const door = accessDoorFor(user.role);
  return door ? door.split("/").pop() : null;
}

/**
 * Identidad del usuario autenticado. El rol mostrado es SIEMPRE el del objeto
 * `user`, que `AuthContext` carga del **realm activo** (`/auth/me`): no se lee
 * un token suelto ni se asume el último rol guardado.
 */
export function IdentityMenu({ user }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const rt = useRoleT();
  const { logout } = useAuth();

  const guest = isGuest(user);
  const visual = roleVisual(user?.role, guest);
  const slug = doorSlugFor(user);
  const name = displayNameFor(user, t);
  // El "usuario" (la cuenta) es el correo para el super_admin: su `name` es el
  // nombre de la consola, no una persona. El resto muestra su nombre real.
  const accountLabel = isSuper(user) ? user?.email || name : name;

  // Estado controlado del menú: el disparador refleja apertura (borde, fondo y
  // chevron) sin que el `Dropdown` tenga que exponer su estado interno.
  const [open, setOpen] = useState(false);
  // Guarda de cierre de sesión: `logout` es asíncrono (audita y navega); evita
  // reentradas si el botón se pulsa dos veces mientras el proceso corre.
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, logout]);

  return (
    // El menú se ensancha para las filas «Usuario»/«Rol» (etiqueta + insignia).
    <Dropdown
      align="right"
      ariaLabel={rt("identity")}
      className="min-w-[16.5rem]"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          className={cn(
            "identity-trigger group flex h-11 items-center gap-1 rounded-2xl border pl-1 pr-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60",
            open
              ? "border-line bg-surface-2 shadow-[var(--shadow-pop)]"
              : "border-line/60 bg-surface-2/40 hover:border-line hover:bg-surface-2 hover:shadow-[var(--shadow-pop)]"
          )}
        >
          {/* Estructura clásica de profile-dropdown: el disparador es el avatar
              (anillo de rol + punto de sesión) + chevron; el detalle completo
              (nombre, correo, rol, entidad) vive en la cabecera del menú. Sin
              tooltip de rol (petición del usuario). */}
          <RoleAvatar user={user} withStatus />
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-muted transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      }
    >
      <div className="identity-hero mx-1.5 mb-1 mt-1 px-3 py-3" style={{ "--rb-accent": visual.accent }}>
        <span className="identity-hero__glow" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <RoleAvatar user={user} size="lg" withStatus />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-[11px] text-ink-muted">{user?.email}</p>
            {user?.entity?.name && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{user.entity.name}</span>
              </p>
            )}
            {slug && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate font-mono">/a/{slug}</span>
              </p>
            )}
          </div>
        </div>
      </div>
      <MenuDivider />
      {/* Ficha de identidad en formato "etiqueta ← → insignia": «Usuario» y
          «Rol» como filas claras. La pastilla del Usuario toma el ACENTO DEL
          PERFIL (la marca viva); el rol va en la insignia con su propio acento. */}
      <div className="px-1.5 py-1">
        <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {rt("userLabel")}
          </span>
          <span className="inline-flex max-w-[10.5rem] items-center gap-1.5 rounded-full border border-brand-500/30 bg-gradient-to-r from-brand-500/15 to-brand-500/5 py-1 pl-1 pr-2.5 text-xs font-semibold text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.35),0_8px_22px_-14px_var(--color-brand-500)]">
            <span className="grid h-[1.15rem] w-[1.15rem] shrink-0 place-items-center rounded-full bg-brand-500 text-on-brand-500 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.5)]">
              <UserRound className="h-3 w-3" aria-hidden="true" strokeWidth={2.5} />
            </span>
            <span className="truncate">{accountLabel}</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {rt("roleLabel")}
          </span>
          <RoleBadge role={user?.role} isGuest={guest} short />
        </div>
      </div>
      {/* «Ajustes» solo para quien conserva la página de configuración:
          el gestor de entidad y el gestor de formularios ya no la tienen. */}
      {!isEntityAdmin(user) && !isCreator(user) && (
        <>
          <MenuDivider />
          <MenuItem
            icon={Settings}
            description={t("settingsDesc")}
            onClick={() => navigate(settingsPath(language, user?.entity?.code))}
          >
            {t("settings")}
          </MenuItem>
          <MenuDivider />
        </>
      )}
      <MenuItem
        icon={LogOut}
        danger
        disabled={loggingOut}
        onClick={handleLogout}
        className="justify-center font-semibold"
      >
        {t("logOut")}
      </MenuItem>
    </Dropdown>
  );
}
