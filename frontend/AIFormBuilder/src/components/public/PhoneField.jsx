import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, Phone } from "lucide-react";
import { PHONE_COUNTRIES, countryFor, countryFromPattern, detectCountry, digitsFor, digitsLabel, validatePhone } from "../../lib/phoneRules.js";
import { PhoneFlag } from "../ui/PhoneFlag.jsx";
import "./phone-field.css";

/*
 * Campo de teléfono del formulario público.
 *
 * Es un control compuesto: a la izquierda un disparador con la BANDERA y el
 * `+código` del país; a la derecha un `<input type="tel">` a todo lo demás. El
 * país puede cambiarse a mano (desplegable con buscador, teclado completo) o
 * deducirse solo cuando el respondiente teclea un `+código` de otro país: en ese
 * caso el disparador salta a ese país. Las longitudes salen de la MISMA tabla
 * que usa el backend (`utils/phoneRules.js` espejo), así que la validación del
 * cliente y del servidor coinciden.
 *
 * `phone = field.validation.phone` decide el modo: `{ mode: "fixed", country }`
 * bloquea el país del autor; `{ mode: "any" }` (o ausencia) deja elegir.
 *
 * El valor que se PROPAGA incluye el `+código` del país efectivo (p. ej.
 * `+1 5551234567`). Así la respuesta lleva el país consigo y su validación —la
 * de `validate.js` en el envío y la del backend, que deducen el país del
 * `+código`— coincide con la que el respondiente ve en vivo al escribir.
 *
 * `pattern`: para formularios guardados antes de la clave `validation.phone`
 * (solo tienen el regex del país fijo). Si no hay `phone` explícito se deduce el
 * país del patrón y se bloquea a él, para no aflojar un formulario de país fijo.
 *
 * El desplegable se monta en un PORTAL (`document.body`) en `position: fixed`:
 * dentro del formulario público hay contenedores con `overflow-hidden`
 * (`PublicForm`) y `overflow-y-auto` (`FormView`), que recortarían una lista
 * posicionada en el flujo. Se mide contra el disparador, voltea hacia arriba si
 * no hay sitio y se recalcula en scroll/resize.
 */

export function PhoneField({
  label,
  value = "",
  onChange,
  disabled = false,
  error,
  phone = {},
  pattern = null,
  language = "es",
}) {
  const es = language === "es";
  /* País fijo: el que declara `phone`; si no, el deducido del `pattern` de un
     formulario viejo. El resto de los casos (modo «any») lo elige el respondiente. */
  const implied = phone?.mode ? null : countryFromPattern(pattern);
  const isFixed = (phone?.mode === "fixed" && !!phone?.country) || !!implied;
  const fixedCountry = phone?.mode === "fixed" && phone?.country
    ? countryFor(phone.country)
    : implied;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listId = useId();

  /* País efectivo: si el autor lo fijó, ese; si no, el detectado en el texto o Cuba. */
  const detected = useMemo(() => detectCountry(value), [value]);
  const [manual, setManual] = useState(fixedCountry?.code || "CU");
  const selected = fixedCountry || detected || countryFor(manual) || PHONE_COUNTRIES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const digits = digitsFor(selected.code);
  const digitsText = `${digitsLabel(digits)} ${es ? "dígitos" : "digits"}`;
  const placeholder = `+${selected.dial} ${"5".repeat(Math.max(1, Math.min(Array.isArray(digits) ? digits[0] : digits, 12)))}`;

  /* País con el que se valida y se guarda el número. Cuando el autor lo fijó es
     el suyo; cuando es «Cualquier país», es el que el respondiente eligió (o el
     detectado por el `+código`). Así EE. UU. exige 10 dígitos aunque el autor
     dejara el campo abierto, en vez del laxo 6-15 de «any». */
  const effectiveDial = selected.dial;
  const effectiveCountry = selected.code;

  /* Normaliza lo que teclea el respondiente a `+<dial> <dígitos>`: quita
     cualquier `+código` viejo (antes del filtro), luego filtra dígitos.
     El `+` va fuera del patón `bare`, así nunca se filtra. */
  const normalize = (input) => {
    const stripped = String(input ?? "").replace(/^\s*\+\d{1,4}[\s.-]?/, "");
    const bare = stripped.replace(/\D/g, "");
    return bare ? `+${effectiveDial} ${bare}` : "";
  };

  /* Parte «visible» para el input: sin el `+código` (lo pinta el disparador). */
  const inputText = useMemo(
    () => String(value ?? "").replace(/^\s*\+\d{1,4}[\s.-]?/, ""),
    [value],
  );

  /* Cerrar al clic fuera o con Escape. El menú vive en un portal (fuera del
     `rootRef`), así que el clic dentro de él también cuenta como dentro. */
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Coloca el menú (portal, `position: fixed`) contra el disparador: bajo él,
     volteando hacia arriba si no hay sitio, y dentro del viewport. Se escribe
     directo en el nodo para no disparar un render extra. */
  const position = useMemo(
    () => () => {
      const triggerEl = triggerRef.current;
      const menuEl = menuRef.current;
      if (!triggerEl || !menuEl) return;
      const t = triggerEl.getBoundingClientRect();
      const m = menuEl.getBoundingClientRect();
      const gap = 6;
      const margin = 8;
      const spaceBelow = window.innerHeight - t.bottom;
      const spaceAbove = t.top;
      const flipUp = spaceBelow < m.height + gap && spaceAbove > spaceBelow;
      let top = flipUp ? t.top - gap - m.height : t.bottom + gap;
      let left = t.left;
      top = Math.max(margin, Math.min(top, window.innerHeight - m.height - margin));
      left = Math.max(margin, Math.min(left, window.innerWidth - m.width - margin));
      menuEl.style.top = `${top}px`;
      menuEl.style.left = `${left}px`;
      menuEl.style.setProperty("--ui-phone-shift", flipUp ? "-4px" : "4px");
      menuEl.style.visibility = "visible";
    },
    [],
  );

  useLayoutEffect(() => {
    if (!open) return;
    position();
    const onScrollOrResize = () => position();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, position, filtered]);

  /* Al teclear un `+código`, `selected` ya prioriza el país detectado sobre el
     elegido a mano, así que no hace falta sincronizar estado en un efecto. */

  const pick = (c) => {
    setManual(c.code);
    setOpen(false);
    setQuery("");
    setActive(0);
    /* El texto traía el `+código` del país anterior; se reemplaza por el del
       país elegido conservando los dígitos. */
    const bare = String(value ?? "").replace(/^\s*\+\d{1,4}[\s.-]?/, "").trimStart();
    onChange?.(bare ? `+${c.dial} ${bare}` : "");
  };

  const onListKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      /* El menú vive en un portal (`document.body`). Sin cortar la
         propagación, el Escape seguiría hasta el `document`, donde el
         `useEscapeKey` global del modal lo cerraría también: en la vista
         previa eso se veía como "el desplegable me cierra el modal". */
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[active];
      if (c) pick(c);
    }
  };

  const live = String(value ?? "").trim()
    ? validatePhone(value, { mode: "fixed", fixedCountry: effectiveCountry })
    : null;
  const showCount = live && !error;

  return (
    <div className="ui-phone w-full" ref={rootRef}>
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}

      <div className={`ui-phone__shell${error ? " is-error" : ""}${disabled ? " is-disabled" : ""}`}>
        {/* Disparador del país: bandera + código. Bloqueado si el autor lo fijó. */}
        <button
          ref={triggerRef}
          type="button"
          className="ui-phone__trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled || isFixed}
          onClick={() => !isFixed && setOpen((o) => !o)}
          title={isFixed ? `${selected.label} (+${selected.dial})` : undefined}
        >
          <PhoneFlag code={selected.code} className="ui-phone__flag" />
          <span className="ui-phone__dial">+{selected.dial}</span>
          {!isFixed && <ChevronDown className={`ui-phone__caret${open ? " is-open" : ""}`} aria-hidden="true" />}
        </button>

        <span className="ui-phone__divider" aria-hidden="true" />

        <span className="ui-phone__lead" aria-hidden="true">
          <Phone className="h-4 w-4" />
        </span>

        <input
          type="tel"
          inputMode="tel"
          className="ui-phone__input"
          value={inputText}
          onChange={(e) => onChange?.(normalize(e.target.value))}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="tel"
          aria-invalid={!!error}
        />
      </div>

      {/* Desplegable de países: portal a `document.body` (fixed) para que ningún
          contenedor con `overflow` del formulario lo recorte. */}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="ui-phone__menu"
            role="listbox"
            id={listId}
            aria-label={es ? "País" : "Country"}
            style={{ top: 0, left: 0, visibility: "hidden" }}
          >
            <div className="ui-phone__search">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onListKeyDown}
                placeholder={es ? "Buscar país…" : "Search country…"}
                aria-label={es ? "Buscar país" : "Search country"}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={filtered[active] ? `${listId}-opt-${filtered[active].code}` : undefined}
              />
            </div>
            <ul className="ui-phone__list">
              {filtered.map((c, i) => (
                <li
                  key={c.code}
                  id={`${listId}-opt-${c.code}`}
                  role="option"
                  aria-selected={c.code === selected.code}
                  className={`ui-phone__option${i === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c);
                  }}
                >
                  <PhoneFlag code={c.code} className="ui-phone__flag" />
                  <span className="ui-phone__name">{c.label}</span>
                  <span className="ui-phone__code">+{c.dial}</span>
                  {c.code === selected.code && <Check className="h-4 w-4 text-brand-500" aria-hidden="true" />}
                </li>
              ))}
              {filtered.length === 0 && <li className="ui-phone__empty">{es ? "Sin resultados" : "No results"}</li>}
            </ul>
          </div>,
          document.body,
        )}

      {/* Ayuda / error: la ayuda muestra los dígitos que exige el país actual. */}
      {error ? (
        <p className="mt-1 text-xs text-red-500" role="alert">{error}</p>
      ) : showCount && live.country ? (
        <p className="ui-phone__hint">
          <PhoneFlag code={selected.code} className="ui-phone__flag-inline" />
          {digitsText}{live.ok ? "" : ` · ${es ? "revisa el número" : "check the number"}`}
        </p>
      ) : null}
    </div>
  );
}
