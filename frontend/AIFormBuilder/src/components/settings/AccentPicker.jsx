import { useEffect, useState } from "react";
import { Check, Pipette } from "lucide-react";
import {
  ACCENTS,
  DEFAULT_ACCENT,
  checkOnAccent,
  normalizeAccentHex,
} from "../../lib/accent.js";
import { cn } from "../../lib/utils.js";
import "../ui/crystal.css";

/**
 * Selector de color de acento — presets + color libre.
 *
 * El color es UNA sola variable del sitio (`--color-brand-*`, que `lib/accent.js`
 * reescribe en vivo), así que esto no configura "el acento de los botones": lo
 * elige para toda la interfaz, tooltips y crystals incluidos. Por eso el bloque
 * de vista previa al pie enseña piezas reales del sistema con el color ya
 * puesto — un botón, un chip y un tooltip — en vez de un cuadrado suelto: así se
 * ve qué pasa con el acento elegido sin tener que salir de la pestaña.
 *
 * `onChange(hex)` siempre recibe `#rrggbb`, que es el único formato que acepta
 * el backend. El campo de texto es la vía para escribir el hex exacto (el
 * `<input type="color">` solo da el que ofrece el sistema operativo) y descarta
 * lo que no sea un color en vez de propagarlo: si no, el guardado fallaría con
 * un 400 del servidor.
 */
export function AccentPicker({
  value,
  onChange,
  resetLabel,
  customLabel,
  customDesc,
  invalidHex,
  previewLabel,
  previewButton,
  previewChip,
  previewTooltip,
}) {
  const current = normalizeAccentHex(value) || DEFAULT_ACCENT;
  const isPreset = ACCENTS.some((a) => a.value.toLowerCase() === current.toLowerCase());

  // Borrador del campo de texto. Va separado de `value` a propósito: el usuario
  // escribe "#00d2f" a medio camino y eso todavía no es un color, así que el
  // campo tiene que poder mostrar un estado intermedio que la app no.
  const [draft, setDraft] = useState(current);
  const [touched, setTouched] = useState(false);

  // Refleja en el campo los cambios que vengan de fuera (un preset, el picker
  // nativo, el botón de restablecer) sin pisar lo que se está escribiendo:
  // el efecto solo corre cuando el valor YA válido cambia, y escribir en el
  // campo no cambia `current` hasta que el hex es completo.
  useEffect(() => {
    setDraft(current);
    setTouched(false);
  }, [current]);

  const commit = (raw) => {
    const hex = normalizeAccentHex(raw);
    if (!hex) {
      setTouched(true);
      return;
    }
    onChange(hex);
  };

  const draftInvalid = touched && !normalizeAccentHex(draft);

  return (
    <div className="space-y-4">
      {/* ── Presets ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        {ACCENTS.map((a) => (
          <button
            key={a.value}
            type="button"
            title={a.name}
            aria-label={a.name}
            aria-pressed={current === a.value.toLowerCase()}
            onClick={() => onChange(a.value.toLowerCase())}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full transition-all duration-150",
              "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              current === a.value.toLowerCase() && "scale-110 ring-2 ring-offset-2 ring-offset-surface",
            )}
            style={{ background: a.value, "--tw-ring-color": a.value }}
          >
            {current === a.value.toLowerCase() && (
              <Check className="h-4 w-4 drop-shadow" strokeWidth={3} style={{ color: checkOnAccent(a.value) }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Color libre ── */}
      <div className="rounded-2xl border border-default bg-surface-2/50 p-3.5">
        <div className="flex flex-wrap items-start gap-3">
          {/* El picker nativo, como botón. El input va encima con opacidad 0:
              es el único que abre el diálogo del sistema, así que tiene que
              recibir el clic, y el `<label>` es lo que le pone el aspecto. */}
          <label
            title={customLabel}
            className={cn(
              "relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl",
              "border border-black/10 shadow-[0_1px_2px_rgba(15,23,42,0.10)] transition-transform duration-150 dark:border-white/15",
              "hover:scale-105 focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 focus-within:ring-offset-surface",
              // El aro marca que AHORA MISMO manda un color libre y no uno de los
              // presets de arriba. Sin él, elegir un hex a mano no dejaba rastro
              // en la fila de presets y no había forma de ver que estaba aplicado.
              !isPreset && "ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-2",
            )}
            style={{ background: current }}
          >
            <Pipette className="h-4 w-4 drop-shadow" style={{ color: checkOnAccent(current) }} />
            <input
              type="color"
              value={current}
              onChange={(e) => {
                const hex = normalizeAccentHex(e.target.value);
                if (hex) onChange(hex);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label={customLabel}
            />
          </label>

          <div className="min-w-0 flex-1">
            <label
              htmlFor="accent-custom-hex"
              className="block text-xs font-semibold text-fg"
            >
              {customLabel}
            </label>
            <p className="mt-0.5 text-xs text-muted">{customDesc}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="pointer-events-none select-none font-mono text-sm text-muted">#</span>
              <input
                id="accent-custom-hex"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={7}
                value={draft.replace(/^#/, "")}
                placeholder="00D2FF"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9A-Fa-f]/gi, "").slice(0, 6);
                  setDraft(`#${raw}`);
                  setTouched(true);
                  // A los 6 dígitos ya es un color: se aplica sin esperar al blur,
                  // que es donde se nota menos el cambio en la página entera.
                  if (raw.length === 6) commit(`#${raw}`);
                }}
                onBlur={() => commit(draft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit(draft);
                  }
                }}
                aria-invalid={draftInvalid || undefined}
                className={cn(
                  "w-full max-w-[9rem] rounded-xl border bg-surface px-3 py-1.5 font-mono text-sm uppercase text-fg transition-all duration-200",
                  "hover:border-brand-200 focus:outline-none focus:bg-surface focus:ring-4",
                  draftInvalid
                    ? "border-red-400 focus:border-red-400 focus:ring-red-500/12"
                    : "border-default focus:border-brand-400 focus:ring-brand-500/12",
                )}
              />
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/15"
                style={{ background: normalizeAccentHex(draft) || current }}
              />
            </div>
            {draftInvalid && (
              <p className="mt-1.5 text-xs font-medium text-red-500">{invalidHex}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Vista previa con piezas reales del sistema ──
          Ninguna de las tres escribe su color aquí dentro: lo toman del acento
          vivo. `bg-brand-gradient` lee `--color-brand-*`; `.cr-chip` y
          `.cr-tooltip` leen el `--chip-tint` / `--tooltip-tint` que se les
          inyecta. Si algún día deja de seguir al acento, el acento ha vuelto a
          ser decorativo y esta vista previa es lo que lo delata. */}
      <div className="rounded-2xl border border-default bg-surface p-3.5">
        <p className="mb-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          {previewLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex h-9 items-center rounded-[20px] bg-brand-gradient px-4 text-xs font-bold text-on-brand-gradient shadow-[0_6px_16px_-6px_var(--color-brand-600)]">
            {previewButton}
          </span>

          <span className="cr-chip" style={{ "--chip-tint": current }}>
            <span className="cr-chip-ico h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {previewChip}
          </span>

          <span
            className="cr-tooltip relative px-2.5 py-1.5 text-xs font-medium"
            style={{ "--tooltip-tint": current }}
          >
            <span className="cr-hairline" aria-hidden="true" />
            {previewTooltip}
          </span>
        </div>
      </div>

      {resetLabel && current !== DEFAULT_ACCENT && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_ACCENT)}
          className="text-xs font-medium text-muted transition hover:text-fg"
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
}