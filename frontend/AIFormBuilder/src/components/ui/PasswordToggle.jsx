import { cn } from "../../lib/utils.js";
import "./password-toggle.css";

/**
 * PasswordToggle — botón premium para mostrar/ocultar una contraseña.
 *
 * Es SOLO el botón (icono + acción): no envuelve el input ni gestiona estado.
 * El campo anfitrión conserva su `type`, `value`, `onChange`, `ref` y su estado
 * de visibilidad; aquí únicamente se monta el disparador. Así sirve igual para
 * inputs controlados propios o para react-hook-form/Formik.
 *
 * Props:
 * - `visible`   (bool)  estado actual (true = contraseña a la vista).
 * - `onToggle`  (fn)    alterna la visibilidad.
 * - `disabled`  (bool)  deshabilita el botón (p. ej. campo bloqueado).
 * - `showLabel`/`hideLabel` (string) textos accesibles (`aria-label`).
 * - `className` se fusiona para posicionarlo desde el contenedor del campo.
 *
 * Accesibilidad: `type="button"` (nunca envía el formulario), `aria-pressed`
 * refleja el estado y `aria-label` lo describe. `onMouseDown.preventDefault()`
 * evita que el clic robe el foco al input, de modo que el cursor y la selección
 * se conservan al alternar. El dibujo del ojo y su tachado son SVG inline.
 */
export function PasswordToggle({
  visible,
  onToggle,
  disabled,
  className,
  showLabel = "Mostrar contraseña",
  hideLabel = "Ocultar contraseña",
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={visible ? "true" : "false"}
      aria-label={visible ? hideLabel : showLabel}
      onClick={onToggle}
      onMouseDown={(event) => event.preventDefault()}
      className={cn("ui-pwd", className)}
    >
      <svg
        className="ui-pwd__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <g className="ui-pwd__eye">
          <path d="M2.6 12C4.2 8.3 7.7 5.7 12 5.7c4.3 0 7.8 2.6 9.4 6.3-1.6 3.7-5.1 6.3-9.4 6.3-4.3 0-7.8-2.6-9.4-6.3Z" />
          <circle cx="12" cy="12" r="2.9" />
        </g>
        <path className="ui-pwd__slash" d="M4 4.5 20 19.5" />
      </svg>
    </button>
  );
}
