import { PremiumDatePicker } from "./PremiumDatePicker.jsx";
import { PremiumTimePicker } from "./PremiumTimePicker.jsx";

/**
 * PremiumDateTime — Contenedor premium de Selector de Fecha y Selector de Hora.
 *
 * Rediseño total desde cero: se descarta por completo la implementación previa
 * (tabla rígida + <input nativo>) y se delega en dos componentes nuevos:
 *   - PremiumDatePicker: días como círculos espaciosos, navegación de mes/año
 *     con transición dinámica, resaltado de hoy / seleccionado / rango.
 *   - PremiumTimePicker: dial radial de horas (reloj táctil), bloques rápidos
 *     de minutos, ajuste fino ±1 min y toggle AM/PM táctil.
 *
 * Cada componente gestiona su propio popover/estado interno, así que este
 * contenedor es un delegador puro: renderiza el picker según `type` y reenvía
 * las props sin añadir estado propio.
 *
 * Glassmorphism sutil, bordes rounded-2xl, sombras flotantes, micro-interacciones,
 * dark/light nativo, teclado completo (flechas, Tab, Escape, Enter) y ARIA completo.
 *
 * Contrato de datos intacto: misma firma de props que el componente anterior,
 * así que FieldRenderer.jsx (casos "date" y "time") no necesita cambios.
 */

export function PremiumDateField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
  error = false,
  required = false,
  icon: Icon = null,
  type = "date",
  language = "es",
}) {
  // `label`, `placeholder`, `required` e `icon` forman parte del contrato público
  // (FieldRenderer los pasa) aunque el render del label/icono lo haga el entorno
  // o el propio picker; se conservan para preservar la firma de props.
  const isTime = type === "time";

  return (
    <>
      {isTime ? (
        <PremiumTimePicker
          value={value}
          onChange={onChange}
          disabled={disabled}
          language={language}
          required={required}
          error={error}
        />
      ) : (
        <PremiumDatePicker
          value={value}
          onChange={onChange}
          disabled={disabled}
          language={language}
          required={required}
          error={error}
          placeholder={placeholder}
        />
      )}
    </>
  );
}
