import { useState } from "react";
import {
  User,
  Inbox,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  ChevronRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface ResponseRow {
  id: string;
  respondentName: string;
  respondentEmail?: string | null;
  submittedAt: string;
  status: "completed" | "partial" | "spam";
  answersCount: number;
  device?: string;
}

interface ResponsesTableProps {
  responses: ResponseRow[];
  onDeleteResponse: (id: string) => void;
  onExport: () => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<"completed" | "partial" | "spam", { label: string; color: string; bg: string; icon: React.ElementType }> = {
  completed: { label: "Completada", color: "text-emerald-600", bg: "bg-emerald-50/60", icon: CheckCircle },
  partial: { label: "Parcial", color: "text-amber-600", bg: "bg-amber-50/60", icon: Clock },
  spam: { label: "Spam", color: "text-rose-600", bg: "bg-rose-50/60", icon: AlertCircle },
};

export function ResponsesTable({ responses, onDeleteResponse, onExport, isLoading = false }: ResponsesTableProps) {
  const [toDelete, setToDelete] = useState<string | null>(null);

  const handleExport = () => {
    onExport();
    toast.success("Exportando a Excel...");
  };

  const handleDelete = (id: string) => {
    setToDelete(id);
  };

  const confirmDelete = (id: string) => {
    if (!window.confirm("¿Eliminar esta respuesta? Esta acción no se puede deshacer.")) return;
    setToDelete(null);
    onDeleteResponse(id);
    toast.success("Respuesta eliminada");
  };

  return (
    <div className="space-y-4">
      {/* Toolbar premium */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-brand-50/60 flex items-center justify-center text-brand-600 shadow-sm">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Respuestas recibidas</h3>
            <p className="text-xs text-gray-500">{responses.length} respuesta{responses.length !== 1 ? "s" : ""} esta sesión</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={isLoading || responses.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </button>
          <button
            onClick={() => setToDelete(null)}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-on-brand-600 text-sm font-medium shadow-md hover:bg-brand-700 hover:text-on-brand-700 transition-all duration-200 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)]"
          >
            <ChevronRight className="h-4 w-4" />
            Gestionar respuestas
          </button>
        </div>
      </div>

      {/* Empty state */}
      {responses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <Inbox className="h-8 w-8" />
          </div>
          <h4 className="font-semibold text-gray-800">Sin respuestas todavía</h4>
          <p className="text-sm text-gray-500 mt-1">Las respuestas de los encuestados aparecerán aquí en cuanto lleguen.</p>
        </div>
      )}

      {/* Table */}
      {responses.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Encuestado</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha y hora</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preguntas</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {responses.map((r) => {
                const cfg = STATUS_CONFIG[r.status];
                const Icon = cfg.icon;
                return (
                  <tr
                    key={r.id}
                    className="transition-all duration-200 hover:bg-gray-50/50 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-medium">
                          {r.respondentName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{r.respondentName}</p>
                          {r.respondentEmail && (
                            <p className="text-xs text-gray-500 truncate">{r.respondentEmail}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium">
                          {new Date(r.submittedAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-medium">{r.answersCount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toast.info("Viendo detalles de respuesta...")}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          aria-label="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors"
                          aria-label="Eliminar respuesta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete modal */}
      {toDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setToDelete(null)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white border border-gray-100 shadow-[0_20px_60px_rgb(0,0,0,0.12)] p-6 animate-in zoom-in duration-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-800">¿Eliminar esta respuesta?</h3>
                <p className="text-sm text-gray-600 mt-1">Esta acción no se puede deshacer. La respuesta se eliminará permanentemente.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDelete(toDelete!)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-sm hover:shadow-[0_8px_30px_rgb(225,29,72,0.15)]"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
