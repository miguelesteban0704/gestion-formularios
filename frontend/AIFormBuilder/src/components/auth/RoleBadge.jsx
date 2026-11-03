import { ShieldCheck, UserShield, ClipboardList, UserRound, KeyRound } from "lucide-react";
import { useRoleT } from "../../lib/roleI18n.js";
import { cn } from "../../lib/utils.js";
import { accents } from "@/shared/styles/tokens";

/**
 * Insignia de identidad por rol.
 *
 * Hace legible de un vistazo QUIÉN es el usuario en el realm activo. El color
 * sale de la paleta decorativa `accents` (no de marca, no semántica): así la
 * identidad no compite con el acento del sitio ni dispara `qa:brand` por
 * mezclar un tono semántico con uno de marca. El color vive en el medallón y los
 * tintes; el texto va siempre en `--color-ink` para no arriesgar el contraste AA
 * con acentos intermedios.
 *
 * El rol de invitado y la cuenta legacy (sin rol) caen a un tono neutro.
 */
const VISUALS = {
  super_admin: { Icon: ShieldCheck, accent: accents.gold, labelKey: "roleSuper" },
  entity_admin: { Icon: UserShield, accent: accents.blue, labelKey: "roleEntity" },
  form_creator: { Icon: ClipboardList, accent: accents.teal, labelKey: "roleCreator" },
  guest: { Icon: UserRound, accent: "var(--color-ink-muted)", labelKey: "roleGuest" },
  account: { Icon: KeyRound, accent: "var(--color-ink-muted)", labelKey: "roleAccount" },
};

/**
 * Resuelve el aspecto de un rol. Exportado para reutilizar el acento en
 * elementos hermanos (p. ej. el anillo del avatar).
 *
 * @param {string|undefined|null} role  Rol del realm activo.
 * @param {boolean} guestFlag           `true` si es la sesión de invitado.
 */
export function roleVisual(role, guestFlag = false) {
  if (guestFlag) return VISUALS.guest;
  return VISUALS[role] || VISUALS.account;
}

/**
 * Etiqueta compacta para la insignia del disparador (cabecera): solo la del
 * form_creator es más larga que un chip ("Gestor de formularios por entidad").
 * El resto usa su etiqueta plena porque ya es corta.
 */
const SHORT_KEYS = { form_creator: "roleCreatorShort" };

export function RoleBadge({ role, isGuest = false, size = "md", short = false, className }) {
  const rt = useRoleT();
  const { Icon, accent, labelKey } = roleVisual(role, isGuest);
  const label = rt(short && SHORT_KEYS[role] ? SHORT_KEYS[role] : labelKey);

  return (
    <span
      className={cn("role-badge", className)}
      data-size={size}
      style={{ "--rb-accent": accent }}
    >
      <span className="role-badge__medallion" aria-hidden="true">
        <Icon />
      </span>
      <span className="role-badge__text">{label}</span>
    </span>
  );
}
