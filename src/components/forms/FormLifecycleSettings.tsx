import { useState } from "react";
import { Clock, Calendar, MessageCircle, AlertCircle } from "lucide-react";

interface LifecycleSettingsProps {
  initialValues?: {
    responseLimit?: number | null;
    expiresAt?: string | null;
    confirmationMessage?: string;
  };
  onSave: (values: {
    responseLimit: number | null;
    expiresAt: string | null;
    confirmationMessage: string;
  }) => void;
}

export function FormLifecycleSettings({ initialValues, onSave }: LifecycleSettingsProps) {
  const [values, setValues] = useState({
    responseLimit: initialValues?.responseLimit ?? null,
    expiresAt: initialValues?.expiresAt ?? "",
    confirmationMessage: initialValues?.confirmationMessage ?? "Gracias por completar el formulario.",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({
      responseLimit: values.responseLimit ?? null,
      expiresAt: values.expiresAt || null,
      confirmationMessage: values.confirmationMessage,
    });
    setTimeout(() => setSaving(false), 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50">
        <Clock className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-800">Ajustes y Límites</h3>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-3">
          {/* Límite de respuestas */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="h-4 w-4" />
              Límite de respuestas
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={values.responseLimit ?? ""}
                onChange={(e) =>
                  setValues({ ...values, responseLimit: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="Sin límite"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <span className="text-xs">#</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">Cerrar automáticamente al llegar a X respuestas</p>
          </div>

          {/* Fecha de caducidad */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4" />
              Fecha de caducidad
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={values.expiresAt}
                onChange={(e) => setValues({ ...values, expiresAt: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Calendar className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Dejar de aceptar respuestas en esta fecha</p>
          </div>

          {/* Mensaje de confirmación */}
          <div className="space-y-2 md:col-span-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MessageCircle className="h-4 w-4" />
              Mensaje de confirmación
            </label>
            <textarea
              value={values.confirmationMessage}
              onChange={(e) => setValues({ ...values, confirmationMessage: e.target.value })}
              rows={3}
              placeholder="Escribe el mensaje que verá el usuario al terminar..."
              className="w-full pl-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <p className="text-xs text-gray-500">Mensaje mostrado en la pantalla de agradecimiento</p>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onSave(values)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium shadow-md hover:bg-indigo-700 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
