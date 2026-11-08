import {
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useController } from "react-hook-form";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Info } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { CardSurface } from "../ui/CardSurface.jsx";

/* ═══════════════════════════════════════════════════════════════════════
   Campos premium para formularios del panel (react-hook-form friendly).

   Solo funcionan en modo RHF: se les pasa `control` + `name` y usan
   `useController` de forma incondicional (regla de hooks). El mensaje de
   error se muestra automáticamente desde `fieldState.error`.

   Lenguaje visual común (`FieldShell`):
   · Etiqueta en mayúsculas con marca de obligatorio opcional.
   · Icono del campo en pastilla tintada a la izquierda.
   · Icono de estado a la derecha: check si es válido, alerta si no.
   · Mensaje con icono (error en rojo / pista en gris) bajo el campo.
   ═══════════════════════════════════════════════════════════════════════ */

/** Etiqueta única para todos los campos del panel, con marca de obligatorio. */
export function FieldLabel({ htmlFor, label, required }) {
  if (!label) return null;
  return (
    <label htmlFor={htmlFor} className="adm-label">
      {label}
      {required && (
        <span className="ml-0.5 text-brand-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

/** Pastilla del icono del campo: se tiñe y crece al enfocar el control. */
function FieldIcon({ icon: Icon, className }) {
  if (!Icon) return null;
  return (
    <span
      className={cn(
        "pointer-events-none absolute left-1.5 z-10 grid h-9 w-9 place-items-center rounded-xl border border-brand-500/15 bg-brand-500/10 text-brand-600 transition-all duration-200 group-focus-within:scale-105 group-focus-within:border-brand-500/30 group-focus-within:bg-brand-500/15 dark:text-brand-300",
        className
      )}
      aria-hidden="true"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
    </span>
  );
}

/** Icono de estado a la derecha: check (válido) o alerta (error). */
function FieldState({ invalid, valid, className }) {
  if (invalid) {
    return (
      <AlertCircle
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-danger animate-pop",
          className
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
    );
  }
  if (valid) {
    return (
      <CheckCircle2
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-success animate-pop",
          className
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
    );
  }
  return null;
}

/** Mensaje inferior del campo: error con alerta, o pista con icono neutro. */
export function FieldMessage({ id, error, hint }) {
  if (error) {
    return (
      <p id={id} className="adm-field-msg text-danger animate-fade-in" role="alert">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>{error}</span>
      </p>
    );
  }
  if (hint) {
    return (
      <p className="adm-field-msg text-muted">
        <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span>{hint}</span>
      </p>
    );
  }
  return null;
}

/** Input con icono en pastilla e icono de estado. */
export const AdminInput = forwardRef(function AdminInput(
  {
    label,
    error,
    hint,
    icon,
    id,
    className,
    control,
    name,
    defaultValue,
    required,
    trail,
    ...props
  },
  ref
) {
  const { field, fieldState } = useController({ control, name, defaultValue });
  const msg = error || fieldState?.error?.message;
  const inputId = id || name;
  const showValid =
    !msg &&
    fieldState?.isTouched &&
    !props.disabled &&
    String(field.value ?? "").length > 0;

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={inputId} label={label} required={required} />
      <div className="group relative">
        <FieldIcon icon={icon} className="top-1/2 -translate-y-1/2" />
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "adm-field-premium",
            icon && "adm-field-lead",
            // La acción de la derecha manda el hueco; si no la hay, el icono de
            // estado (`adm-field-trail`) reserva el suyo.
            trail ? "adm-field-action" : (msg || showValid) && "adm-field-trail",
            className
          )}
          aria-invalid={!!msg}
          aria-describedby={msg ? `${inputId}-err` : undefined}
          {...field}
          {...props}
        />
        {trail ? (
          <span className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center">
            {trail}
          </span>
        ) : (
          <FieldState invalid={!!msg} valid={showValid} />
        )}
      </div>
      <FieldMessage id={`${inputId}-err`} error={msg} hint={hint} />
    </div>
  );
});

/** Área de texto con la misma piel que `AdminInput`. */
export const AdminTextarea = forwardRef(function AdminTextarea(
  {
    label,
    error,
    hint,
    icon,
    id,
    className,
    control,
    name,
    defaultValue,
    required,
    rows = 4,
    ...props
  },
  ref
) {
  const { field, fieldState } = useController({ control, name, defaultValue });
  const msg = error || fieldState?.error?.message;
  const inputId = id || name;
  const showValid =
    !msg &&
    fieldState?.isTouched &&
    !props.disabled &&
    String(field.value ?? "").length > 0;

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={inputId} label={label} required={required} />
      <div className="group relative">
        <FieldIcon icon={icon} className="top-2.5" />
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            "adm-field-premium adm-field-area block",
            icon && "adm-field-lead",
            (msg || showValid) && "adm-field-trail",
            className
          )}
          aria-invalid={!!msg}
          aria-describedby={msg ? `${inputId}-err` : undefined}
          {...field}
          {...props}
        />
        <FieldState invalid={!!msg} valid={showValid} className="top-3 translate-y-0" />
      </div>
      <FieldMessage id={`${inputId}-err`} error={msg} hint={hint} />
    </div>
  );
});

/** Select custom con el mismo diseño que `SelectField` del panel:
   trigger de cristal (`adm-field-premium`), listbox `card-surface` con
   opciones estilo tarjeta, teclado completo (↑ ↓ Inicio Fin Esc Enter) y
   cierre por clic fuera. Compatible con react-hook-form (`control` +
   `name`). Replica el aspecto del filtro de categoría del catálogo. */
export const AdminSelect = forwardRef(function AdminSelect(
  {
    label,
    error,
    hint,
    id: idProp,
    className,
    control,
    name,
    defaultValue,
    options,
    required,
    disabled,
    placeholder,
  },
  ref
) {
  const { field, fieldState } = useController({ control, name, defaultValue });
  const msg = error || fieldState?.error?.message;
  const selectId = idProp || name;
  const rtId = useId();
  const id = idProp || rtId;
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  useImperativeHandle(ref, () => triggerRef.current);

  const rawOptions = options || [];
  const optionList = useMemo(() => {
    return rawOptions.map((opt) => {
      if (isValidElement(opt) && opt.type === "option") {
        return { value: opt.props.value, label: opt.props.children };
      }
      return { value: opt.value, label: opt.label, icon: opt.icon };
    });
  }, [rawOptions]);

  const selected =
    optionList.find((o) => String(o.value) === String(field.value)) || null;

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const i = optionList.findIndex((o) => String(o.value) === String(field.value));
    setActive(i >= 0 ? i : 0);
  }, [open, optionList, field.value]);

  const choose = (opt) => {
    field.onChange(opt.value);
    field.onBlur();
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && ["ArrowDown", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      field.onBlur();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, optionList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(optionList.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (optionList[active]) choose(optionList[active]);
    }
  };

  useEffect(() => {
    if (open && optionList[active]) {
      document.getElementById(`${listboxId}-${active}`)?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [open, active, listboxId, optionList]);

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={selectId} label={label} required={required} />
      <div ref={wrapRef} className={cn("relative", className)}>
        <button
          ref={triggerRef}
          type="button"
          id={selectId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={label ? `${selectId}-label` : undefined}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          className="adm-field-premium flex items-center gap-2 text-left"
        >
          <span
            className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}
          >
            {selected?.label ?? placeholder ?? "—"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
              open && "rotate-180"
            )}
            strokeWidth={1.7}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="card-surface absolute z-40 mt-2 max-h-72 w-full overflow-hidden p-1.5 animate-scale-in"
          >
            <CardSurface />
            <div className="relative z-10 max-h-72 overflow-y-auto scrollbar-thin">
              {optionList.length === 0 && (
                <p className="px-3 py-5 text-center text-sm text-muted">
                  Sin opciones
                </p>
              )}
              {optionList.map((opt, i) => {
                const isSel = String(opt.value) === String(field.value);
                return (
                  <button
                    key={String(opt.value)}
                    id={`${listboxId}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    tabIndex={-1}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(opt)}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm transition-colors duration-150",
                      i === active && "bg-brand-500/10",
                      isSel && "font-semibold text-fg"
                    )}
                  >
                    {opt.icon && (
                      <opt.icon
                        className="h-4 w-4 shrink-0 text-muted"
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {isSel && (
                      <Check
                        className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <FieldMessage
        id={`${selectId}-err`}
        error={msg}
        hint={hint}
      />
    </div>
  );
});

/**
 * Grupo de opciones en tarjetas radio: para elecciones cortas donde un
 * `<select>` escondería las alternativas. Cada tarjeta muestra su icono y
 * el check de la opción elegida.
 */
export function AdminOptionGroup({
  label,
  error,
  hint,
  name,
  control,
  defaultValue,
  options = [],
  columns = 2,
  required,
  className,
}) {
  const { field, fieldState } = useController({ control, name, defaultValue });
  const msg = error || fieldState?.error?.message;

  // Navegación con flechas (patrón radiogroup): mover selección y foco.
  const move = (delta) => {
    const index = options.findIndex((o) => o.value === field.value);
    const next = options[(index + delta + options.length) % options.length];
    if (!next) return;
    field.onChange(next.value);
    document.getElementById(`${name}-opt-${next.value}`)?.focus();
  };
  const onKeyDown = (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)} role="radiogroup" aria-label={label}>
      <FieldLabel label={label} required={required} />
      <div className={cn("grid gap-2.5", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {options.map((opt) => {
          const selected = field.value === opt.value;
          const OptIcon = opt.icon;
          return (
            <button
              key={opt.value}
              id={`${name}-opt-${opt.value}`}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => field.onChange(opt.value)}
              onBlur={field.onBlur}
              onKeyDown={onKeyDown}
              className={cn(
                "adm-option adm-option-hover",
                selected && "adm-option-on",
                msg && !selected && "adm-option-bad"
              )}
            >
              {OptIcon && (
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors duration-200",
                    selected
                      ? "border-brand-500/25 bg-brand-500/15 text-brand-600 dark:text-brand-300"
                      : "border-line bg-surface-2 text-muted"
                  )}
                  aria-hidden="true"
                >
                  <OptIcon className="h-4 w-4" strokeWidth={1.7} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{opt.label}</span>
                {opt.description && (
                  <span className="mt-0.5 block truncate text-xs text-muted">{opt.description}</span>
                )}
              </span>
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-200",
                  selected
                    ? "border-brand-500 bg-brand-500 text-on-brand-500"
                    : "border-line bg-transparent text-transparent"
                )}
                aria-hidden="true"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
      <FieldMessage id={`${name}-err`} error={msg} hint={hint} />
    </div>
  );
}

/** Grupo de campos alineados (útil para grids de 2 columnas). */
export function AdminFieldGroup({ children, className }) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}
