import { useController } from "react-hook-form";
import { EntitySelect } from "./EntitySelect.jsx";
import { FieldLabel, FieldMessage } from "./FormFields.jsx";

/* ═══════════════════════════════════════════════════════════════════════
   Adaptador de `EntitySelect` a react-hook-form.

   `EntitySelect` es un componente controlado que recibe `value` (el _id)
   y `onChange` (recibe la entidad completa). RHF espera un campo con
   `{ value, onChange }` donde `value` es el _id y `onChange` recibe el _id.
   Este wrapper puentea ambas interfaces sin cambiar `EntitySelect`, y
   comparte etiqueta y mensaje con el resto de campos premium.
   ═══════════════════════════════════════════════════════════════════════ */

/** Consume `control` de RHF y pinta el EntitySelect. */
export function EntitySelectField({ control, name, entities, label, error, hint, required, ...rest }) {
  const {
    field: { value, onChange },
    fieldState: { error: fieldError },
  } = useController({ control, name });

  const msg = error || fieldError?.message;

  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} required={required} />
      <EntitySelect
        entities={entities}
        value={value || ""}
        onChange={(entity) => onChange(entity?._id || "")}
        ariaLabel={label}
        {...rest}
      />
      <FieldMessage id={`${name}-err`} error={msg} hint={hint} />
    </div>
  );
}
