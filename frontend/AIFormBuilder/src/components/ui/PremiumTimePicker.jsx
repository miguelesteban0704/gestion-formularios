import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  RotateCcw,
} from "lucide-react";

/**
 * PremiumTimePicker — Selector de hora "Chrono Glass" simplificado y premium.
 *
 * Diseño limpio: dial radial de horas centrado (1-12), bloques rápidos de
 * minutos (00/15/30/45), ajuste fino ±1 min y toggle AM/PM táctil. Todo con
 * glassmorphism, dark/light nativo, teclado completo y ARIA.
 *
 * Contrato de datos (mantenido para FieldRenderer):
 *   - value: string ISO o "HH:mm" (se devuelve ISO al aplicar).
 *   - onChange(value: string)
 *   - language: "es" | "en"
 */

const MINUTES_QUICK = [0, 15, 30, 45];

const LABELS = {
  es: {
    title: "Seleccionar hora",
    hour: "Hora",
    minute: "Minuto",
    am: "AM",
    pm: "PM",
    now: "Ahora",
    apply: "Confirmar",
    cancel: "Cancelar",
    pickHour: "Seleccionar hora {h}",
    pickMinute: "Seleccionar minuto {m}",
    togglePeriod: "Cambiar a {period}",
  },
  en: {
    title: "Select time",
    hour: "Hour",
    minute: "Minute",
    am: "AM",
    pm: "PM",
    now: "Now",
    apply: "Confirm",
    cancel: "Cancel",
    pickHour: "Select hour {h}",
    pickMinute: "Select minute {m}",
    togglePeriod: "Switch to {period}",
  },
};

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Posición de una hora en el dial radial, centrada en el contenedor.
 * 12 arriba, 3 derecha, 6 abajo, 9 izquierda (sentido horario).
 */
function hourPosition(hour12, radius, center) {
  const deg = ((hour12 % 12) * 30 - 90) * (Math.PI / 180);
  const x = center + radius * Math.cos(deg);
  const y = center + radius * Math.sin(deg);
  return { x: Math.round(x), y: Math.round(y) };
}

export function PremiumTimePicker({
  value,
  onChange,
  disabled = false,
  language = "es",
  required = false,
  error = false,
  placeholder = language === "es" ? "Seleccionar hora" : "Select time",
}) {
  const L = LABELS[language] || LABELS.es;

  // ---------- Estado ----------
  const [open, setOpen] = useState(false);
  const [hour12, setHour12] = useState(12); // 1..12
  const [minute, setMinute] = useState(0); // 0..59
  const [period, setPeriod] = useState("AM"); // "AM" | "PM"
  const [mounted, setMounted] = useState(false);

  const dialRef = useRef(null);

  // ---------- Inicialización desde el valor entrante ----------
  useEffect(() => {
    if (!value) {
      const now = new Date();
      setHour12(((now.getHours() % 12) || 12));
      setMinute(now.getMinutes());
      setPeriod(now.getHours() >= 12 ? "PM" : "AM");
      return;
    }
    // Soporta ISO completo (respeta hora local, como PremiumDatePicker) o "HH:mm" puro.
    // new Date("YYYY-MM-DDTHH:mm:ssZ") se interpreta como UTC; getHours()/getMinutes()
    // devuelven la hora local del instante, evitando el desajuste en zonas detrás de UTC.
    const iso = new Date(value);
    if (!isNaN(iso.getTime())) {
      const h = iso.getHours();
      const m = iso.getMinutes();
      setHour12((h % 12) || 12);
      setMinute(m);
      setPeriod(h >= 12 ? "PM" : "AM");
      return;
    }
    // Fallback: "HH:mm" sin zona horaria
    const match = String(value).match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h24 = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      setHour12((h24 % 12) || 12);
      setMinute(m);
      setPeriod(h24 >= 12 ? "PM" : "AM");
    }
  }, [value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------- Salida hacia el padre ----------
  const apply = useCallback(() => {
    const h24 =
      period === "PM" && hour12 !== 12
        ? hour12 + 12
        : period === "AM" && hour12 === 12
          ? 0
          : hour12;
    const m = Math.max(0, Math.min(59, minute));
    const d = new Date();
    d.setHours(h24, m, 0, 0);
    onChange?.(d.toISOString());
    setOpen(false);
  }, [hour12, minute, period, onChange]);

  const display = useMemo(() => {
    return `${pad(hour12)}:${pad(minute)} ${period}`;
  }, [hour12, minute, period]);

  // ---------- Teclado del dial ----------
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      if (e.key === "Escape") {
        setOpen(false);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        apply();
        return;
      }
      // Flechas para mover la hora seleccionada en el dial
      if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        const step = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : -1;
        setHour12((h) => {
          let n = h + step;
          if (n < 1) n = 12;
          if (n > 12) n = 1;
          return n;
        });
      }
    },
    [disabled, apply]
  );

  // ---------- Dial radial ----------
  const dialSize = 260;
  const hourRadius = 100;
  const center = dialSize / 2; // 130

  const hourButtons = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
      const pos = hourPosition(h, hourRadius, center);
      const isSelected = h === hour12;
      return (
        <button
          key={h}
          type="button"
          role="radio"
          aria-checked={isSelected}
          aria-label={L.pickHour.replace("{h}", pad(h))}
          onClick={() => setHour12(h)}
          disabled={disabled}
          className={`absolute flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 ease-ui active:scale-90
          ${isSelected
            ? "bg-brand-600 text-on-brand-600 shadow-[0_0_24px_color-mix(in_srgb,var(--color-brand-600)_55%,transparent)] ring-2 ring-brand-500/40 scale-110"
            : "text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 border border-white/30 dark:border-slate-700/40 hover:bg-brand-50/60 dark:hover:bg-brand-950/20 hover:text-brand-600 dark:hover:text-brand-400"}`}
          style={{ left: pos.x - 20, top: pos.y - 20 }}
        >
          {pad(h)}
        </button>
      );
    });
  }, [hour12, disabled, L]);

  // ---------- Render ----------
  const triggerClass = `
    w-full rounded-[1.2rem] border bg-white/60 dark:bg-slate-900/60 pl-10 pr-10 py-3.5 text-sm font-medium tracking-tight
    backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-200 ease-ui
    cursor-pointer hover:border-brand-500/50 focus:outline-none focus:border-brand-500 focus:ring-0
    shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-brand-500)_25%,transparent)]
    ${disabled
      ? "cursor-not-allowed bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-800/30 opacity-60"
      : ""}
    ${error ? "border-red-500/60" : "border-slate-300 dark:border-slate-700/50"}
  `;

  return (
    <>
      {/* Trigger / campo de visualización */}
      <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-80">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-900/40 backdrop-blur-md shadow-[0_0_16px_color-mix(in_srgb,var(--color-brand-500)_35%,transparent)]">
            <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
        </div>

        <input
          readOnly
          disabled={disabled}
          placeholder={placeholder || (language === "es" ? "Seleccionar hora" : "Select time")}
          value={display || "--:-- --"}
          onFocus={() => setOpen(true)}
          className={triggerClass}
          id="time-picker-trigger"
          aria-label={L.title}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="premium-time-picker-dialog"
          autoComplete="off"
        />

        {/* Botón de apertura */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-label={open ? "Cerrar selector de hora" : "Abrir selector de hora"}
          className={`absolute right-3 top-1/2 -translate-y-1/2
            rounded-full p-1.5 transition-[transform,opacity,background-color,box-shadow] duration-200 ease-ui opacity-90 active:scale-95
            ${disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:bg-brand-50/80 dark:hover:bg-brand-950/30 hover:shadow-[0_0_24px_color-mix(in_srgb,var(--color-brand-500)_40%,transparent)]"}`}
        >
          <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        </button>

        {/* Popover / Dial */}
        {open && !disabled && mounted && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-md transition-opacity duration-200 ease-ui"
            onClick={() => setOpen(false)}
          >
            <div
              ref={dialRef}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-full max-w-[460px] mx-4 sm:mx-8
                bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border border-white/70 dark:border-slate-800/50
                rounded-[2.5rem] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] dark:shadow-black/70
                transform transition-[transform,opacity] duration-300 ease-ui
                scale-100 opacity-100 overflow-hidden flex flex-col"
                style={{ transformOrigin: "50% 50%" }}
                role="dialog"
                aria-modal="true"
                aria-label={L.title}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
              {/* Luz decorativa de marca */}
              <div className="absolute top-[-8%] left-[-8%] w-[300px] h-[300px] rounded-full bg-brand-500/14 blur-[100px] pointer-events-none"></div>
              <div className="absolute top-[-6%] right-[-6%] w-[240px] h-[240px] rounded-full bg-brand-400/10 blur-[80px] pointer-events-none"></div>

              <div className="relative z-10 p-10 pt-8 flex flex-col items-center gap-8">
                <div className="w-full flex items-center justify-between px-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {L.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setHour12((now.getHours() % 12) || 12);
                      setMinute(now.getMinutes());
                      setPeriod(now.getHours() >= 12 ? "PM" : "AM");
                      setFineMinute(0);
                    }}
                    className="rounded-full p-2 transition-[background-color,transform] duration-200 ease-ui active:scale-90 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    aria-label={L.now}
                  >
                    <RotateCcw className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>

                {/* Dial radial de horas */}
                <div
                  className={`relative w-[${dialSize}px] h-[${dialSize}px] mx-auto`}
                  style={{ width: dialSize, height: dialSize }}
                  aria-label={L.hour}
                >
                  {hourButtons}
                  {/* Centro del reloj */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                    flex flex-col items-center justify-center
                    rounded-full p-2.5
                    bg-white/90 dark:bg-slate-800/90 border border-white/40 dark:border-slate-700/50
                    shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)]
                    transition-all duration-300 ease-ui"
                  >
                    <span className="text-[24px] font-bold text-ink dark:text-slate-100 leading-none">
                      {pad(hour12)}
                    </span>
                    <span className="text-[10px] font-medium text-ink-muted dark:text-slate-400 uppercase tracking-wider">
                      {period}
                    </span>
                  </div>
                </div>

                {/* Separador : animado */}
                <div className="text-[22px] font-bold text-brand-500 dark:text-brand-400 transition-colors duration-200">
                  :
                </div>

                {/* Bloques rápidos de minutos (tamaño ampliado) */}
                <div className="flex gap-2.5 px-4">
                  {MINUTES_QUICK.map((m) => {
                    const isSelected = minute === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={L.pickMinute.replace("{m}", pad(m))}
                        onClick={() => setMinute(m)}
                        disabled={disabled}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-200 ease-ui active:scale-95
                        ${isSelected
                          ? "bg-brand-600 text-on-brand-600 shadow-[0_0_24px_color-mix(in_srgb,var(--color-brand-600)_50%,transparent)] scale-105"
                          : "text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700/30 hover:bg-brand-50/60 dark:hover:bg-brand-950/20 hover:text-brand-600 dark:hover:text-brand-400"}`}
                      >
                        {pad(m)}
                      </button>
                    );
                  })}
                </div>

                {/* Toggle AM/PM */}
                <div className="flex gap-2">
                  {["AM", "PM"].map((p) => {
                    const isSelected = period === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        role="switch"
                        aria-checked={isSelected}
                        aria-label={L.togglePeriod.replace("{period}", p)}
                        onClick={() => setPeriod(p)}
                        disabled={disabled}
                        className={`px-5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 ease-ui active:scale-95
                        ${isSelected
                          ? p === "AM"
                            ? "bg-brand-600 text-on-brand-600 shadow-[0_0_24px_color-mix(in_srgb,var(--color-brand-600)_50%,transparent)]"
                            : "bg-brand-500 text-on-brand-500 shadow-[0_0_24px_color-mix(in_srgb,var(--color-brand-500)_50%,transparent)]"
                          : "text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/20"}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Acciones */}
                <div className="w-full flex justify-end gap-3 pt-6 border-t border-white/50 dark:border-slate-800/30">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300
                      transition-[background-color,transform] duration-200 ease-ui active:scale-95
                      bg-white/60 dark:bg-slate-800/60 border border-white/30 dark:border-slate-700/40
                      hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer"
                  >
                    {L.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={apply}
                    disabled={disabled}
                    className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white
                      bg-gradient-to-r from-brand-500 to-brand-600
                      transition-[background-color,transform,box-shadow] duration-200 ease-ui active:scale-95
                      hover:from-brand-400 hover:to-brand-700
                      shadow-[0_0_25px_color-mix(in_srgb,var(--color-brand-500)_45%,transparent)]
                      hover:shadow-[0_0_35px_color-mix(in_srgb,var(--color-brand-500)_55%,transparent)]
                      ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {L.apply}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
