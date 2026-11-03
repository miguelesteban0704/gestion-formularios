import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { PasswordToggle } from "./PasswordToggle.jsx";

export function InputText({ label, icon: Icon, type = "text", placeholder, value, onChange, disabled, error }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          type={isPassword && visible ? "text" : type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-background py-2.5 text-sm transition-all duration-200 ${
            Icon ? "pl-10" : "px-3.5"
          } ${isPassword ? "pr-12" : "pr-3.5"} ${
            disabled
              ? "cursor-not-allowed bg-slate-100/50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 opacity-60"
              : "hover:border-current/40 focus:outline-none focus:ring-2 focus:ring-slate-400"
          } ${error ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
        />
        {isPassword && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <PasswordToggle visible={visible} onToggle={() => setVisible((v) => !v)} disabled={disabled} />
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function InputTextArea({ label, placeholder, value, onChange, disabled, error }) {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}
      <textarea
        rows={4}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm transition-all duration-200 ${
          disabled
            ? "cursor-not-allowed bg-slate-100/50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 opacity-60"
            : "hover:border-current/40 focus:outline-none focus:ring-2 focus:ring-slate-400"
        } ${error ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function CustomSelect({ 
  label, 
  icon: Icon, 
  options = [], 
  value, 
  onChange, 
  disabled = false, 
  placeholder = "Seleccionar...", 
  error 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Cierra el desplegable al hacer clic en cualquier parte fuera del componente
  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full" ref={selectRef}>
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}
      <div className={`relative ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-200 bg-background ${
            disabled 
              ? "cursor-not-allowed bg-slate-100/50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700" 
              : "cursor-pointer hover:border-current/40"
          } ${error ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {Icon && <Icon className="h-4 w-4 shrink-0 opacity-60" />}
            <span className={`truncate ${!value ? "opacity-50" : ""}`}>
              {value || placeholder}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 opacity-60 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && !disabled && (
          <div className="absolute left-0 top-[calc(100%+6px)] z-[var(--z-dropdown)] max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900">
            {options.length > 0 ? (
              options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors text-left ${
                    value === opt 
                      ? "bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {opt}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs opacity-50 text-center">Sin opciones</div>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function MultipleChoice({ label, options = [], value, onChange, disabled, error, accent }) {
  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium">{label}</label>}
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-sm transition-all ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              } ${
                isSelected ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800" : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  isSelected ? "border-transparent" : "border-slate-400"
                }`}
                style={{ backgroundColor: isSelected ? accent : "transparent" }}
              >
                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function CheckboxGroup({ label, options = [], value = [], onChange, disabled, error, accent }) {
  const handleToggle = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter((item) => item !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium">{label}</label>}
      <div className="space-y-2">
        {options.map((opt) => {
          const isChecked = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => handleToggle(opt)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-sm transition-all ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              } ${
                isChecked ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800" : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  isChecked ? "border-transparent" : "border-slate-400"
                }`}
                style={{ backgroundColor: isChecked ? accent : "transparent" }}
              >
                {isChecked && <Check className="h-3 w-3 text-white" />}
              </div>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function ToggleYesNo({ label, value, onChange, disabled, error, accent }) {
  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium">{label}</label>}
      <div className="flex gap-3">
        {["Sí", "No"].map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${
                isSelected
                  ? "text-white border-transparent"
                  : "border-slate-300 dark:border-slate-700 bg-background hover:border-current/40"
              }`}
              style={{ backgroundColor: isSelected ? accent : undefined }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export { FileUploadField } from "./FileUploadField.jsx";