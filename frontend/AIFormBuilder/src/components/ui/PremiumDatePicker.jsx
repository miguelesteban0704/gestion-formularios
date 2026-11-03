import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

/**
 * PremiumDatePicker — Selector de fecha 100% nuevo, concepto "Chrono Glass".
 *
 * Reemplaza la tabla de calendario rígida por una arquitectura de días como
 * círculos espaciosos con navegación de mes/año mediante transiciones dinámicas.
 * Resaltado de alto contraste para hoy (anillo de marca), seleccionado (fondo
 * de marca completo) y rangos (conexión visual suave).
 *
 * Contrato de datos (mantenido para FieldRenderer):
 *   - value: string "YYYY-MM-DD"
 *   - onChange(value: string)
 *   - language: "es" | "en"
 */

const LABELS = {
  es: {
    title: "Seleccionar fecha",
    today: "Hoy",
    monthYear: "Mes / Año",
    prevMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    prevYear: "Año anterior",
    nextYear: "Año siguiente",
    apply: "Confirmar",
    cancel: "Cancelar",
    reset: "Restablecer",
    dayAria: "{d} de {month} de {year}",
    todayAria: "Hoy, {d} de {month} de {year}",
    selectedAria: "Fecha seleccionada, {d} de {month} de {year}",
  },
  en: {
    title: "Select date",
    today: "Today",
    monthYear: "Month / Year",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    prevYear: "Previous year",
    nextYear: "Next year",
    apply: "Confirm",
    cancel: "Cancel",
    reset: "Reset",
    dayAria: "{month} {d}, {year}",
    todayAria: "Today, {month} {d}, {year}",
    selectedAria: "Selected date, {month} {d}, {year}",
  },
};

const FULL_WEEKDAYS = {
  es: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

const MONTHS = {
  es: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

function isSameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateISO(d) {
  if (!d || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parsea una fecha "YYYY-MM-DD" en hora local.
 * new Date("YYYY-MM-DD") se interpreta como UTC y, en zonas horarias
 * detrás de UTC (p. ej. Cuba UTC-5), retrocede un día al leer getDate().
 */
function parseISODate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function PremiumDatePicker({
  value,
  onChange,
  disabled = false,
  language = "es",
  required = false,
  error = false,
  placeholder,
}) {
  const L = LABELS[language] || LABELS.es;
  const weekdays = FULL_WEEKDAYS[language] || FULL_WEEKDAYS.es;

  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? parseISODate(value) : null;
    return d || new Date();
  });
  const [selected, setSelected] = useState(() => {
    const d = value ? parseISODate(value) : null;
    return d || null;
  });
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef(null);

  // Sincronizar vista y selección con el valor entrante
  useEffect(() => {
    if (value) {
      const d = parseISODate(value);
      if (d) {
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
        setSelected(d);
      }
    } else {
      setSelected(null);
    }
  }, [value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // lunes = 0
  const totalDays = lastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInView = useMemo(() => {
    const days = [];
    // Días del mes anterior para completar la primera semana
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), currentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, month, d), currentMonth: true });
    }
    // Días del mes siguiente para completar la última semana
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: new Date(year, month + 1, d), currentMonth: false });
    }
    return days;
  }, [year, month, startOffset, totalDays]);

  const monthName = MONTHS[language]?.[month] || MONTHS.es[month];
  const monthLabel = `${monthName} ${year}`;

  // ---------- Navegación ----------
  const prevMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);
  const nextMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);
  const prevYear = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear() - 1, d.getMonth(), 1));
  }, []);
  const nextYear = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear() + 1, d.getMonth(), 1));
  }, []);

  const selectDay = useCallback(
    (d) => {
      if (disabled || !d.currentMonth) return;
      setSelected(d.date);
      onChange?.(formatDateISO(d.date));
      setOpen(false);
    },
    [disabled, onChange]
  );

  const goToday = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(now);
    onChange?.(formatDateISO(now));
    setOpen(false);
  }, [onChange]);

  // ---------- Teclado ----------
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
        if (selected) {
          onChange?.(formatDateISO(selected));
          setOpen(false);
        }
        return;
      }
      // Navegación de mes con PageUp / PageDown
      if (e.key === "PageUp") {
        e.preventDefault();
        prevMonth();
        return;
      }
      if (e.key === "PageDown") {
        e.preventDefault();
        nextMonth();
        return;
      }
      // Flechas: izquierda/derecha mueve un día, arriba/abajo una semana
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const base = selected || (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })();
        let next = new Date(base.getTime());
        if (e.key === "ArrowLeft") next.setDate(base.getDate() - 1);
        else if (e.key === "ArrowRight") next.setDate(base.getDate() + 1);
        else if (e.key === "ArrowUp") next.setDate(base.getDate() - 7);
        else next.setDate(base.getDate() + 7);
        setSelected(next);
        // Recenterar vista si el día sale del mes visible
        if (next.getMonth() !== month || next.getFullYear() !== year) {
          setViewDate(new Date(next.getFullYear(), next.getMonth(), 1));
        }
      }
    },
    [disabled, selected, month, year, onChange, prevMonth, nextMonth]
  );

  // ---------- Cierre al clic fuera ----------
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const isSelected = (d) => selected && isSameDay(d, selected);
  const isToday = (d) => isSameDay(d, today);

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

  const displayed = useMemo(() => {
    if (!value) return placeholder || (language === "es" ? "Seleccionar fecha" : "Select date");
    const d = parseISODate(value);
    if (!d) return placeholder || "";
    return new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: "numeric" }).format(d);
  }, [value, placeholder, language]);

  return (
    <>
      <div ref={containerRef} className="relative w-full" onClick={(e) => e.stopPropagation()}>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200/40 dark:border-brand-950/30 backdrop-blur-sm">
            <Calendar className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
        </div>

        <input
          readOnly
          disabled={disabled}
          placeholder={placeholder || (language === "es" ? "Seleccionar fecha" : "Select date")}
          value={displayed}
          onFocus={() => setOpen(true)}
          className={triggerClass}
          id="date-picker-trigger"
          aria-label={LABELS[language]?.title || LABELS.es.title}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="premium-date-picker-dialog"
          autoComplete="off"
        />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-label={open ? "Cerrar selector de fecha" : "Abrir selector de fecha"}
          className={`absolute right-3 top-1/2 -translate-y-1/2
            rounded-[0.9rem] p-1.5 transition-[transform,opacity,background-color,box-shadow] duration-200 ease-ui opacity-80 active:scale-95
            ${disabled
              ? "opacity-40 cursor-not-allowed"
              : "cursor-pointer hover:bg-brand-50/60 dark:hover:bg-brand-950/20 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--color-brand-500)_35%,transparent)]"}`}
        >
          <Calendar className="h-4 w-4" />
        </button>

        {/* Popover calendario */}
        {open && !disabled && mounted && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-ui"
            onClick={() => setOpen(false)}
          >
            <div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-full max-w-[460px] mx-4 sm:mx-8
                bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-white/60 dark:border-slate-800/40
                rounded-[2rem] shadow-[0_24px_60px_-16px_rgba(0,0,0,0.35)] dark:shadow-black/60
                transform transition-[transform,opacity] duration-250 ease-ui scale-100 opacity-100 overflow-hidden flex flex-col"
              style={{ transformOrigin: "50% 50%" }}
              role="dialog"
              aria-modal="true"
              aria-label={L.title}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleKeyDown}
            >
              {/* Luz decorativa de marca */}
              <div className="absolute top-[-8%] left-[-6%] w-[240px] h-[240px] rounded-full bg-brand-500/12 blur-[80px] pointer-events-none"></div>

              <div className="relative z-10 p-6 flex flex-col items-center gap-4">
                {/* Header: mes/año + navegación */}
                <div className="w-full flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevYear}
                      disabled={disabled}
                      className="rounded-lg p-1.5 transition-[background-color,transform] duration-200 ease-ui active:scale-90 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                      aria-label={L.prevYear}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={prevMonth}
                      disabled={disabled}
                      className="rounded-lg p-1.5 transition-[background-color,transform] duration-200 ease-ui active:scale-90 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                      aria-label={L.prevMonth}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-sm font-semibold text-ink dark:text-slate-100 tracking-tight">
                      {monthLabel}
                    </span>
                    <span className="text-[10px] font-medium text-ink-muted dark:text-slate-500 uppercase tracking-wider">
                      {L.monthYear}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={nextMonth}
                      disabled={disabled}
                      className="rounded-lg p-1.5 transition-[background-color,transform] duration-200 ease-ui active:scale-90 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                      aria-label={L.nextMonth}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextYear}
                      disabled={disabled}
                      className="rounded-lg p-1.5 transition-[background-color,transform] duration-200 ease-ui active:scale-90 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                      aria-label={L.nextYear}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Día de la semana */}
                <div className="grid grid-cols-7 gap-1 w-full px-4 mb-2">
                  {weekdays.map((w, i) => (
                    <div
                      key={`weekday-${i}`}
                      className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center leading-none"
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* Días del mes */}
                <div className="grid grid-cols-7 gap-2 w-full px-4 pb-6">
                  {daysInView.map(({ date, currentMonth }) => {
                    const sel = isSelected(date);
                    const tdy = isToday(date);
                    const dayNum = date.getDate();
                    const isDisabledDay = disabled || !currentMonth;

                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        role="gridcell"
                        aria-selected={sel}
                        aria-current={tdy ? "date" : undefined}
                        aria-disabled={isDisabledDay || undefined}
                        aria-label={isSameDay(date, today)
                          ? L.todayAria.replace("{d}", dayNum).replace("{month}", monthLabel.split(" ")[0]).replace("{year}", year.toString())
                          : L.dayAria.replace("{d}", dayNum).replace("{month}", monthLabel.split(" ")[0]).replace("{year}", year.toString())}
                        onClick={() => selectDay({ date, currentMonth })}
                        disabled={isDisabledDay}
                        className={`flex items-center justify-center w-11 h-11 rounded-2xl text-sm font-medium transition-all duration-150 ease-ui active:scale-90
                        ${sel
                          ? "bg-brand-600 text-white shadow-[0_0_24px_color-mix(in_srgb,var(--color-brand-600)_50%,transparent)] ring-2 ring-brand-500/30"
                          : tdy
                          ? "bg-brand-50/70 dark:bg-brand-950/15 text-brand-600 dark:text-brand-400 ring-1 ring-brand-500/50"
                          : !currentMonth
                          ? "text-slate-400 dark:text-slate-600/60"
                          : "text-ink dark:text-slate-200 bg-white/40 dark:bg-slate-900/20 border border-transparent hover:bg-slate-100/60 dark:hover:bg-slate-800/30"}`}
                      >
                        <span className="block">{dayNum}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Acciones inferiores */}
                <div className="w-full flex items-center justify-between px-8 pt-5 pb-2 border-t border-white/40 dark:border-slate-800/20">
                  <button
                    type="button"
                    onClick={goToday}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-950/15 border border-brand-100/40 dark:border-brand-950/20 transition-[background-color,border-color,transform,box-shadow] duration-200 ease-ui active:scale-95 hover:bg-brand-100/70 dark:hover:bg-brand-950/25 hover:shadow-[0_0_16px_color-mix(in_srgb,var(--color-brand-500)_25%,transparent)]"
                  >
                    <Clock className="h-3.5 w-3.5" /> {L.today}
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      disabled={disabled}
                      className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 transition-[background-color,border-color,transform,box-shadow] duration-200 ease-ui active:scale-95 hover:bg-slate-100 dark:hover:bg-slate-800/20 hover:shadow-[0_0_16px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_0_16px_rgba(255,255,255,0.04)]"
                    >
                      {L.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selected) {
                          onChange?.(formatDateISO(selected));
                          setOpen(false);
                        }
                      }}
                      disabled={!selected || disabled}
                      className={`inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-600 shadow-[0_0_20px_color-mix(in_srgb,var(--color-brand-500)_40%,transparent)] transition-[background-color,transform,box-shadow] duration-200 ease-ui active:scale-95 hover:from-brand-400 hover:to-brand-700 hover:shadow-[0_0_30px_color-mix(in_srgb,var(--color-brand-500)_55%,transparent)] ${!selected || disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      {L.apply}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
