import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import './DateTimePicker.css';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

export const DateTimePicker = ({ value, onChange, label = "Seleccionar Fecha y Hora" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || new Date());
  const [viewDate, setViewDate] = useState(value || new Date());
  
  // Guardar hora y minuto en strings de 2 dígitos
  const [hour, setHour] = useState(
    value ? String(value.getHours()).padStart(2, '0') : '09'
  );
  const [minute, setMinute] = useState(
    value ? String(value.getMinutes()).padStart(2, '0') : '00'
  );

  const containerRef = useRef(null);

  // Cerrar al hacer click fuera del componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lógica del calendario
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const handleApply = (e) => {
    e.stopPropagation();
    const result = new Date(selectedDate);
    result.setHours(parseInt(hour, 10));
    result.setMinutes(parseInt(minute, 10));
    
    if (onChange) onChange(result);
    setIsOpen(false);
  };

  // Formateo visual impecable
  const formattedDisplay = selectedDate
    ? `${selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} • ${hour}:${minute}`
    : 'Elegir fecha y hora...';

  return (
    <div className="dtp-container" ref={containerRef}>
      {label && (
        <label className="dtp-label">
          <span className="dtp-pulse-dot"></span>
          {label}
        </label>
      )}

      {/* Botón Trigger Personalizado */}
      <button
        type="button"
        className={`dtp-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="dtp-trigger-left">
          <div className="dtp-icon-badge">
            <Calendar size={18} />
          </div>
          <span className="dtp-value-text">{formattedDisplay}</span>
        </div>
        <div className="dtp-trigger-right">
          <Clock size={16} className="dtp-clock-icon" />
        </div>
      </button>

      {/* Modal / Selector Flotante (Popover Custom) */}
      {isOpen && (
        <div className="dtp-popover">
          {/* Header del Calendario */}
          <div className="dtp-header">
            <div className="dtp-month-title">
              {MONTHS[viewDate.getMonth()]} <span>{viewDate.getFullYear()}</span>
            </div>
            <div className="dtp-nav-btns">
              <button type="button" onClick={handlePrevMonth} aria-label="Mes anterior">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={handleNextMonth} aria-label="Siguiente mes">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="dtp-weekdays">
            {DAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Grilla de Días */}
          <div className="dtp-days-grid">
            {Array.from({ length: startDay }).map((_, i) => (
              <span key={`empty-${i}`} className="dtp-day empty"></span>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === dayNum &&
                selectedDate.getMonth() === viewDate.getMonth() &&
                selectedDate.getFullYear() === viewDate.getFullYear();

              return (
                <button
                  key={dayNum}
                  type="button"
                  className={`dtp-day ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectDay(dayNum)}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Selector de Hora Estilizado */}
          <div className="dtp-time-section">
            <div className="dtp-time-label">
              <Clock size={15} />
              <span>Hora asignada</span>
            </div>
            <div className="dtp-time-inputs">
              <select value={hour} onChange={(e) => setHour(e.target.value)}>
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = String(i).padStart(2, '0');
                  return <option key={h} value={h}>{h} h</option>;
                })}
              </select>
              <span className="dtp-colon">:</span>
              <select value={minute} onChange={(e) => setMinute(e.target.value)}>
                {['00', '15', '30', '45'].map((m) => (
                  <option key={m} value={m}>{m} m</option>
                ))}
              </select>
            </div>
          </div>

          {/* Acciones del Modal */}
          <div className="dtp-footer">
            <button type="button" className="dtp-btn-cancel" onClick={() => setIsOpen(false)}>
              <X size={14} /> Cancelar
            </button>
            <button type="button" className="dtp-btn-apply" onClick={handleApply}>
              <Check size={14} /> Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;