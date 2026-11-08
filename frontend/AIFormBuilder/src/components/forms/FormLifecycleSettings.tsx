import { useState } from "react";
import {
  Clock,
  Calendar,
  MessageCircle,
  Eye,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface LifecycleValues {
  responseLimit: number | null;
  expiresAt: string | null;
  confirmationMessage: string;
}

interface FormLifecycleSettingsProps {
  initialValues?: LifecycleValues;
  onSave: (values: LifecycleValues) => void;
}

export function FormLifecycleSettings({ initialValues, onSave }: FormLifecycleSettingsProps) {
  const [values, setValues] = useState<LifecycleValues>({
    responseLimit: initialValues?.responseLimit ?? null,
    expiresAt: initialValues?.expiresAt ?? "",
    confirmationMessage: initialValues?.confirmationMessage ?? "¡Gracias por completar el formulario!",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({
      responseLimit: values.responseLimit ?? null,
      expiresAt: values.expiresAt || null,
      confirmationMessage: values.confirmationMessage.trim() || "¡Gracias por completar el formulario!",
    });
    setTimeout(() => {
      setSaving(false);
      toast.success("Configuración guardada");
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Header de sección con botón Vista Previa */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 rounded-xl border border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-600" />
          <h3 className="font-semibold text-gray-800">Ajustes y Límites</h3>
        </div>
        <button
          onClick={() => toast.info("Vista previa abriéndose...")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 font-medium shadow-sm hover:bg-brand-100 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <Eye className="h-4 w-4" />
          Vista Previa
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Límite de respuestas */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Clock className="h-4 w-4 text-gray-500" />
            Límite de respuestas
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={values.responseLimit ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  responseLimit: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="Sin límite"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <span className="text-xs font-medium">#</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Cerrar automáticamente el formulario al alcanzar esta cantidad de respuestas. Déjalo vacío para sin límite.
          </p>
        </div>

        {/* Fecha de caducidad */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 text-gray-500" />
            Fecha de caducidad
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={values.expiresAt ?? ""}
              onChange={(e) => setValues({ ...values, expiresAt: e.target.value })}
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            El formulario dejará de aceptar respuestas en esta fecha y hora.
          </p>
        </div>

        {/* Mensaje de confirmación */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <MessageCircle className="h-4 w-4 text-gray-500" />
            Mensaje de confirmación
          </label>
          <textarea
            value={values.confirmationMessage}
            onChange={(e) => setValues({ ...values, confirmationMessage: e.target.value })}
            rows={4}
            placeholder="Escribe el mensaje que verá el usuario al terminar..."
            className="w-full pl-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          <p className="text-xs text-gray-500">
            Se muestra en la pantalla de agradecimiento después de enviar el formulario.
          </p>
        </div>

        {/* Acciones */}
        <div className="pt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onSave(values)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium shadow-sm hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            Descartar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brand-600 text-on-brand-600 font-medium shadow-md hover:bg-brand-700 hover:text-on-brand-700 hover:shadow-[0_8px_30px_rgb(99,102,241,0.18)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Save className="h-4 w-4 animate-spin" /> Guardando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Guardar cambios
              </>
            )}
          </button>
        </div>
      </form>

      {/* Nota informativa */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-100 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <div>
          <p className="text-sm text-amber-800 font-medium">Los cambios se aplican inmediatamente</p>
          <p className="text-xs text-amber-700/80 mt-0.5">
            El límite de respuestas y la fecha de caducidad se evalúan cada vez que alguien intenta acceder al formulario.
          </p>
        </div>
      </div>
    </div>
  );
}
