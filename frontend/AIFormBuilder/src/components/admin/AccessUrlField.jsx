import { useMemo } from "react";
import { useController } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { AccessUrlSelect } from "./AccessUrlSelect.jsx";
import { FieldLabel, FieldMessage } from "./FormFields.jsx";
import { useRoleT } from "../../lib/roleI18n.js";

/* ═══════════════════════════════════════════════════════════════════════
   Campo de correlación cuenta ↔ URL de acceso.

   Toma de la base de datos las URLs de la entidad y el rol elegidos y solo
   ofrece las activas. La correlación es por rol: un entity_admin se vincula
   a una URL de administrador y un form_creator a la suya. Si esa combinación
   no tiene ninguna URL activa, avisa y bloquea el envío (el backend también
   lo rechaza): «sin una URL de acceso no se puede crear el usuario».

   El valor lo registra `useController` (control + name); conserva visible un
   vínculo previo aunque su URL se haya desactivado (caso edición sin cambiar
   entidad/rol).
   ═══════════════════════════════════════════════════════════════════════ */

export function AccessUrlField({
  control,
  name,
  entityId,
  role,
  accessUrls = [],
  label,
  error,
  required,
}) {
  const rt = useRoleT();
  const { field, fieldState } = useController({ control, name });
  const msg = error || fieldState?.error?.message;

  const available = useMemo(
    () => accessUrls.filter((u) => u.role === role && (u.entityId || null) === (entityId || null)),
    [accessUrls, entityId, role]
  );
  const active = available.filter((u) => u.isActive !== false);
  const selected = available.find((u) => u._id === field.value);
  const hasTarget = Boolean(entityId) && Boolean(role);
  const noActive = hasTarget && active.length === 0;

  const options = [...active];
  if (selected && !active.some((u) => u._id === selected._id)) options.push(selected);

  const disabled = !hasTarget || (required && noActive);
  const placeholder = !hasTarget
    ? "Elige la entidad y el rol"
    : noActive
      ? rt("noAccessUrl")
      : rt("selectAccessUrl");

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={name} label={label} required={required} />
      <AccessUrlSelect
        id={name}
        value={field.value || ""}
        onChange={field.onChange}
        onBlur={field.onBlur}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
        invalid={!!msg}
        ariaLabel={label}
      />
      {required && noActive && (
        <p className="adm-field-msg text-warning" role="status">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>{rt("noAccessUrl")} Créala en «URLs de acceso» y vuelve aquí.</span>
        </p>
      )}
      <FieldMessage
        id={`${name}-error`}
        error={msg}
        hint={!hasTarget ? "Elige primero la entidad y el rol" : undefined}
      />
    </div>
  );
}
